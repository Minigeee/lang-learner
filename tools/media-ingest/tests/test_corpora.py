"""Archive streaming against small in-memory archives in each corpus layout."""

import io
import tarfile

import pytest

from media_ingest import corpora
from media_ingest.clip_requests import CorpusLine
from media_ingest.corpora import CORPORA, ResumableStream, scan_archive
from media_ingest.workspace import Workspace

AI1, AI3 = CORPORA["aishell1"], CORPORA["aishell3"]


def tar_bytes(files: list[tuple[str, bytes]]) -> bytes:
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz") as tar:
        for name, data in files:
            info = tarfile.TarInfo(name)
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


class CountingReader(io.BytesIO):
    """Tracks how far a scan read, so tests can prove it stopped early."""

    def __init__(self, data: bytes):
        super().__init__(data)
        self.total = 0

    def read(self, size=-1):
        chunk = super().read(size)
        self.total += len(chunk)
        return chunk


def scan(data: bytes, corpus, wanted: set[str], members: set[str] = frozenset()):
    utterances, saved_members = {}, {}
    wanted, members = set(wanted), set(members)
    scan_archive(io.BytesIO(data), corpus, wanted, members, utterances.__setitem__, saved_members.__setitem__)
    return utterances, saved_members, wanted, members


def test_aishell3_layout_saves_wanted_wavs_and_members():
    archive = tar_bytes([("spk-info.txt", b"info"), ("test/content.txt", b"text"),
                         ("test/wav/SSB0005/SSB00050353.wav", b"a"), ("test/wav/SSB0005/SSB00050001.wav", b"b")])
    utterances, members, left, left_members = scan(archive, AI3, {"SSB00050001"}, {"spk-info.txt"})
    assert utterances == {"SSB00050001": b"b"}
    assert members == {"spk-info.txt": b"info"}
    assert not left and not left_members


def test_aishell1_opens_inner_tars_of_wanted_speakers_only():
    wanted_speaker = tar_bytes([("S0724/train/BAC009S0724W0121.wav", b"wav")])
    other = b"not a tar: opening it would fail the test"
    archive = tar_bytes([("data_aishell/wav/S0723.tar.gz", other), ("data_aishell/wav/S0724.tar.gz", wanted_speaker)])
    utterances, _, left, _ = scan(archive, AI1, {"BAC009S0724W0121"})
    assert utterances == {"BAC009S0724W0121": b"wav"}
    assert not left


def test_scan_stops_when_nothing_is_left_to_find():
    noise = bytes(range(256)) * 40000
    archive = tar_bytes([("test/wav/SSB0005/SSB00050001.wav", b"a"), ("train/wav/SSB0006/SSB00060001.wav", noise)])
    reader = CountingReader(archive)
    scan_archive(reader, AI3, {"SSB00050001"}, set(), lambda *_: None, lambda *_: None)
    assert reader.total < len(archive) / 2


def test_utterance_absent_from_the_archive_stays_wanted():
    archive = tar_bytes([("test/wav/SSB0005/SSB00050001.wav", b"a")])
    _, _, left, _ = scan(archive, AI3, {"SSB00059999"})
    assert left == {"SSB00059999"}


def test_nothing_wanted_reads_nothing():
    reader = CountingReader(b"not even an archive")
    scan_archive(reader, AI3, set(), set(), lambda *_: None, lambda *_: None)
    assert reader.total == 0


class FakeResponse:
    def __init__(self, data: bytes, status: int, fail_after: int | None = None):
        self.body = io.BytesIO(data)
        self.status = status
        self.headers = {"Content-Length": str(len(data))}
        self.fail_after = fail_after

    def read(self, size=-1):
        if self.fail_after is not None and self.body.tell() >= self.fail_after:
            raise ConnectionResetError("dropped")
        return self.body.read(size)

    def close(self):
        pass


def test_stream_resumes_from_the_offset_on_the_next_url():
    payload = b"0123456789" * 100
    calls = []

    def opener(request, timeout):
        calls.append((request.full_url, request.get_header("Range")))
        if len(calls) == 1:
            return FakeResponse(payload, 200, fail_after=100)
        return FakeResponse(payload[100:], 206)

    stream = ResumableStream(("http://a/x", "http://b/x"), backoff_sec=0, opener=opener)
    read = b"".join(iter(lambda: stream.read(50), b""))
    assert read == payload
    assert calls == [("http://a/x", None), ("http://b/x", "bytes=100-")]


def test_stream_skips_ahead_when_a_server_ignores_range():
    payload = b"abcdefghij" * 10
    responses = iter([FakeResponse(payload, 200, fail_after=30), FakeResponse(payload, 200)])
    stream = ResumableStream(("http://a/x",), backoff_sec=0, opener=lambda *_a, **_k: next(responses))
    assert b"".join(iter(lambda: stream.read(10), b"")) == payload


def test_stream_gives_up_after_its_attempts():
    def opener(*_a, **_k):
        raise ConnectionRefusedError("down")

    stream = ResumableStream(("http://a/x",), attempts=2, backoff_sec=0, opener=opener)
    with pytest.raises(OSError):
        stream.read(10)


def test_transcript_round_trips_through_tsv(tmp_path):
    ws = Workspace(tool_root=tmp_path)
    parts = {"test/content.txt": "SSB00050001.wav\t广 guang3 州 zhou1\n".encode(),
             "train/content.txt": "SSB00060001.wav\t女 nv3 子 zi5\n".encode()}
    corpora._write_transcript(AI3, parts, ws)
    assert corpora.load_transcript("aishell3", ws) == {"SSB00050001": "广州", "SSB00060001": "女子"}


def test_requests_missing_from_the_transcript_fail_without_streaming(tmp_path, monkeypatch):
    ws = Workspace(tool_root=tmp_path)
    corpora._write_transcript(AI1, {AI1.transcript_members[0]: "BAC009S0002W0122 而 对\n".encode()}, ws)

    def no_stream(*_):
        raise AssertionError("an unknown utterance must not start a stream")

    monkeypatch.setattr(corpora, "_stream", no_stream)
    request = CorpusLine("clip:a", "aishell1", ("zh:les:x",), "BAC009S0002W9999", "而对")
    failures = corpora.fetch_corpus(AI1, [request], ws)
    assert len(failures) == 1 and "not in the aishell1 transcript" in failures[0]
