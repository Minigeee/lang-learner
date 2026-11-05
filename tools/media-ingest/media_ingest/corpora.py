"""AISHELL corpora: transcripts and individual utterances, streamed from the OpenSLR archives.

The archives are 15 to 19 GB and nothing else offers single files, so `fetch_corpus` reads an archive
once, in order, and stops as soon as everything wanted is cached. An archive is never written to
disk, and member paths are never trusted: files land under names this module builds.
"""

import csv
import http.client
import tarfile
import time
import urllib.request
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

from .clip_requests import CorpusLine
from .workspace import Workspace, write_atomic

USER_AGENT = "lang-learner-media-ingest/1.0"
ELDA, OPENSLR = "https://openslr.elda.org/resources", "https://www.openslr.org/resources"


@dataclass(frozen=True)
class Corpus:
    name: str
    urls: tuple[str, ...]              # same bytes at each, fastest first
    transcript_members: tuple[str, ...]
    parse_transcript: Callable[[str], Iterable[tuple[str, str, str]]]  # text -> (utt, speaker, sentence)
    speaker_of: Callable[[str], str]
    extra_members: dict[str, str]      # member path -> file name in the transcripts folder


def _parse_aishell1(text: str) -> Iterable[tuple[str, str, str]]:
    # "BAC009S0002W0122 而 对 楼市 ..."
    for line in text.splitlines():
        utt, _, sentence = line.partition(" ")
        if sentence:
            yield utt, utt[6:11], sentence.replace(" ", "")


def _parse_aishell3(text: str) -> Iterable[tuple[str, str, str]]:
    # "SSB00050001.wav\t广 guang3 州 zhou1 ..."
    for line in text.splitlines():
        wav, _, rest = line.partition("\t")
        tokens = rest.split()
        if tokens:
            yield wav.removesuffix(".wav"), wav[:7], "".join(tokens[0::2])


CORPORA = {
    "aishell1": Corpus(
        "aishell1", (f"{ELDA}/33/data_aishell.tgz", f"{OPENSLR}/33/data_aishell.tgz"),
        ("data_aishell/transcript/aishell_transcript_v0.8.txt",), _parse_aishell1,
        lambda utt: utt[6:11], {}),
    "aishell3": Corpus(
        "aishell3", (f"{ELDA}/93/data_aishell3.tgz", f"{OPENSLR}/93/data_aishell3.tgz"),
        ("test/content.txt", "train/content.txt"), _parse_aishell3,
        lambda utt: utt[:7], {"spk-info.txt": "aishell3-spk-info.txt"}),
}


class ResumableStream:
    """A forward-only byte stream that outlives dropped connections.

    On any network error it reopens at the current offset, moving to the next URL, so gzip above it
    never sees the break. `read` raises only after `attempts` consecutive failures.
    """

    def __init__(self, urls: tuple[str, ...], attempts: int = 8, backoff_sec: float = 2.0,
                 opener: Callable = urllib.request.urlopen):
        self._urls, self._attempts, self._backoff, self._opener = urls, attempts, backoff_sec, opener
        self._response = None
        self._offset = 0
        self._length: int | None = None
        self._turn = 0

    def _open(self) -> None:
        url = self._urls[self._turn % len(self._urls)]
        headers = {"User-Agent": USER_AGENT}
        if self._offset:
            headers["Range"] = f"bytes={self._offset}-"
        response = self._opener(urllib.request.Request(url, headers=headers), timeout=120)
        if self._length is None:
            self._length = int(response.headers.get("Content-Length") or 0) or None
        if self._offset and response.status != 206:  # server ignored Range: skip what was read
            remaining = self._offset
            while remaining:
                chunk = response.read(min(remaining, 1 << 20))
                if not chunk:
                    raise ConnectionError("connection closed while skipping to the offset")
                remaining -= len(chunk)
        self._response = response

    def _drop(self) -> None:
        if self._response is not None:
            self._response.close()
        self._response = None
        self._turn += 1

    def read(self, size: int = -1) -> bytes:
        for attempt in range(self._attempts):
            try:
                if self._response is None:
                    self._open()
                chunk = self._response.read(size)
                if not chunk and self._length is not None and self._offset < self._length:
                    raise ConnectionError("connection closed early")
                self._offset += len(chunk)
                return chunk
            except (OSError, http.client.HTTPException) as e:
                if attempt == self._attempts - 1:
                    raise
                print(f"  stream retry at {self._offset / 1e9:.2f} GB: {e}", flush=True)
                self._drop()
                time.sleep(self._backoff * (attempt + 1))
        raise AssertionError("unreachable")

    def close(self) -> None:
        if self._response is not None:
            self._response.close()
            self._response = None


def scan_archive(stream: BinaryIO, corpus: Corpus, wanted: set[str], members: set[str],
                 save_utterance: Callable[[str, bytes], None],
                 save_member: Callable[[str, bytes], None]) -> None:
    """One pass over `stream`, a .tgz in corpus layout, stopping once nothing is left to find.

    Removes each utterance id from `wanted` and each member path from `members` as it hands the
    bytes to its callback. Whatever remains afterward isn't in the archive. Wavs can sit in the
    archive directly or inside per-speaker `<speaker>.tar.gz` members, which are only opened for
    speakers still wanted.
    """
    def scan(tar: tarfile.TarFile, nested: bool) -> None:
        for member in tar:
            if not member.isfile():
                continue
            name = member.name.rsplit("/", 1)[-1]
            if not nested and member.name in members:
                save_member(member.name, tar.extractfile(member).read())
                members.discard(member.name)
            elif name.endswith(".wav") and name.removesuffix(".wav") in wanted:
                utt = name.removesuffix(".wav")
                save_utterance(utt, tar.extractfile(member).read())
                wanted.discard(utt)
            elif not nested and name.endswith(".tar.gz"):
                speaker = name.removesuffix(".tar.gz")
                if any(corpus.speaker_of(utt) == speaker for utt in wanted):
                    with tarfile.open(fileobj=tar.extractfile(member), mode="r|gz") as inner:
                        scan(inner, True)
            if not wanted and not (members and not nested):
                return

    if not wanted and not members:
        return
    with tarfile.open(fileobj=stream, mode="r|gz") as outer:
        scan(outer, False)


def _transcript_file(corpus_name: str, ws: Workspace) -> Path:
    return ws.transcripts_dir / f"{corpus_name}.tsv"


def load_transcript(corpus_name: str, ws: Workspace) -> dict[str, str]:
    """Utterance id to sentence. Empty when the transcript hasn't been fetched."""
    path = _transcript_file(corpus_name, ws)
    if not path.exists():
        return {}
    with path.open(encoding="utf-8", newline="") as f:
        rows = csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE, escapechar="\\")
        return {row["utt"]: row["sentence"] for row in rows}


def _write_transcript(corpus: Corpus, parts: dict[str, bytes], ws: Workspace) -> None:
    path = _transcript_file(corpus.name, ws)
    tmp = path.with_suffix(".part")
    path.parent.mkdir(parents=True, exist_ok=True)
    with tmp.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_NONE, escapechar="\\")
        writer.writerow(["utt", "speaker", "sentence"])
        for member in corpus.transcript_members:
            writer.writerows(corpus.parse_transcript(parts[member].decode("utf-8")))
    tmp.replace(path)


def utterance_path(request: CorpusLine, ws: Workspace) -> Path:
    return ws.raw_dir(request.source) / f"{request.utt}.wav"


def fetch_corpus(corpus: Corpus, requests: list[CorpusLine], ws: Workspace) -> list[str]:
    """Caches the corpus transcript and every requested wav. Returns a failure line for each miss."""
    extras = {member: ws.transcripts_dir / name for member, name in corpus.extra_members.items()
              if not (ws.transcripts_dir / name).exists()}

    def save_extra(member: str, data: bytes) -> None:
        write_atomic(extras[member], data)

    if not _transcript_file(corpus.name, ws).exists():
        print(f"{corpus.name}: streaming transcripts", flush=True)
        parts: dict[str, bytes] = {}

        def save_part(member: str, data: bytes) -> None:
            if member in extras:
                save_extra(member, data)
            else:
                parts[member] = data

        pending = set(corpus.transcript_members) | set(extras)
        _stream(corpus, set(), pending, lambda *_: None, save_part)
        if set(corpus.transcript_members) - set(parts):
            return [f"{corpus.name}: transcripts not found in the archive"]
        _write_transcript(corpus, parts, ws)
        extras = {m: p for m, p in extras.items() if not p.exists()}

    transcript = load_transcript(corpus.name, ws)
    failures = [f"{r.id}: {r.utt} is not in the {corpus.name} transcript"
                for r in requests if r.utt not in transcript]
    wanted = {r.utt for r in requests if r.utt in transcript and not utterance_path(r, ws).exists()}
    if not wanted and not extras:
        return failures
    print(f"{corpus.name}: streaming for {len(wanted)} utterances", flush=True)

    def save_utterance(utt: str, data: bytes) -> None:
        write_atomic(ws.raw_dir(corpus.name) / f"{utt}.wav", data)
        print(f"  {utt} ({len(wanted) - 1} left)", flush=True)

    _stream(corpus, wanted, set(extras), save_utterance, save_extra)
    return failures + [f"{corpus.name}: {utt} not found in the archive" for utt in sorted(wanted)]


def _stream(corpus: Corpus, wanted: set[str], members: set[str],
            save_utterance: Callable[[str, bytes], None], save_member: Callable[[str, bytes], None]) -> None:
    stream = ResumableStream(corpus.urls)
    try:
        scan_archive(stream, corpus, wanted, members, save_utterance, save_member)
    finally:
        stream.close()
