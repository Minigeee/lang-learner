"""Per-source facts: where a request's source audio lives, who speaks it, and how to obtain it.

`raw_path` is the one place that knows a request's cache location. `fetch_all` fills those locations
for everything but ElevenLabs, whose audio costs money and has its own stage in `synth`.
"""

import csv
import functools
import hashlib
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
from importlib import resources
from pathlib import Path

from . import corpora, synth
from .clip_requests import ClipRequest, CorpusLine, Syllable, SynthLine, Word
from .workspace import Workspace, write_atomic

AUDIO_CMN_RAW = "https://raw.githubusercontent.com/hugolpz/audio-cmn/master/"
YOYO_SETTING = "YOYO_CACHE_DIR"


@functools.lru_cache(maxsize=1)
def _audio_cmn_index() -> dict[str, str]:
    """Repo path to git blob SHA-1, for the 64k syllables and words at the indexed commit."""
    text = resources.files("media_ingest").joinpath("data/audio_cmn_index.tsv").read_text(encoding="utf-8")
    return dict(row for row in csv.reader(text.splitlines(), delimiter="\t"))


def audio_cmn_path(request: Syllable | Word) -> str | None:
    """The request's repo path in audio-cmn, or None when audio-cmn doesn't have it."""
    index = _audio_cmn_index()
    if isinstance(request, Word):
        candidates = [f"64k/hsk/cmn-{request.word}.mp3"]
    else:
        # A leading underscore marks syllables that have no common character.
        candidates = [f"64k/syllabs/cmn-{request.syllable}.mp3", f"64k/syllabs/cmn-_{request.syllable}.mp3"]
    return next((path for path in candidates if path in index), None)


def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def _yoyo_file_name(syllable: str) -> str:
    return f"pinyin_{syllable[:-1]}_{syllable[-1]}.mp3"


def raw_path(request: ClipRequest, ws: Workspace) -> Path | None:
    """Where the request's source audio belongs in the cache; None if the source can't have it."""
    if isinstance(request, CorpusLine):
        return corpora.utterance_path(request, ws)
    if isinstance(request, SynthLine):
        return synth.audio_path(request, ws)
    if request.source == "yoyo":
        return ws.raw_dir("yoyo") / _yoyo_file_name(request.syllable)
    path = audio_cmn_path(request)
    return ws.raw_dir("audio-cmn") / f"{_audio_cmn_index()[path]}.mp3" if path else None


def speaker_id(request: ClipRequest) -> str:
    """Speaker id, lowercase because `spk:` keys are slugs."""
    if isinstance(request, CorpusLine):
        speaker = corpora.CORPORA[request.source].speaker_of(request.utt)
        return f"spk:{request.source}-{speaker.lower()}"
    if isinstance(request, SynthLine):
        return f"spk:elevenlabs-{request.voice[:6].lower()}"
    return f"spk:{request.source}"


def _download(url: str, attempts: int = 3) -> bytes:
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": corpora.USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as response:
                return response.read()
        except urllib.error.HTTPError as e:
            if e.code == 404 or attempt == attempts - 1:
                raise
        except OSError:
            if attempt == attempts - 1:
                raise
        time.sleep(1 + attempt)
    raise AssertionError("unreachable")


def _fetch_audio_cmn(request: Syllable | Word, ws: Workspace) -> str | None:
    path = audio_cmn_path(request)
    if path is None:
        return f"{request.id}: not in audio-cmn"
    dest = raw_path(request, ws)
    if dest.exists():
        return None
    try:
        data = _download(AUDIO_CMN_RAW + urllib.parse.quote(path))
    except OSError as e:
        return f"{request.id}: audio-cmn download failed: {e}"
    if git_blob_sha1(data) != _audio_cmn_index()[path]:
        return f"{request.id}: audio-cmn file doesn't match its indexed blob SHA-1"
    write_atomic(dest, data)
    return None


def _fetch_yoyo(request: Syllable, ws: Workspace) -> str | None:
    dest = raw_path(request, ws)
    if dest.exists():
        return None
    folder = ws.setting(YOYO_SETTING)
    if folder is None:
        return f"{request.id}: {YOYO_SETTING} isn't set"
    names = (_yoyo_file_name(request.syllable), f"{request.syllable}.mp3")
    found = next((Path(folder) / n for n in names if (Path(folder) / n).exists()), None)
    if found is None:
        return f"{request.id}: {request.syllable} isn't in {YOYO_SETTING}"
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(found, dest)
    return None


def fetch_all(requests: list[ClipRequest], ws: Workspace) -> list[str]:
    """Fills the raw cache for every non-synth request. Returns a failure line per miss."""
    failures: list[str] = []
    for request in requests:
        failure = None
        if request.source == "audio-cmn":
            failure = _fetch_audio_cmn(request, ws)
        elif request.source == "yoyo":
            failure = _fetch_yoyo(request, ws)
        if failure:
            failures.append(failure)
    for corpus in corpora.CORPORA.values():
        lines = [r for r in requests if r.source == corpus.name]
        if lines:
            failures += corpora.fetch_corpus(corpus, lines, ws)
    return failures
