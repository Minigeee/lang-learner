"""Measures source audio. All model work lives in this stage, so `gate` can be retuned without it.

Results are cached per audio file in `metrics/<sha16>.json`, keyed by content, and each file gains
only the measurements its requests need:

    span, signal   always: the trimmed span in seconds, and `audio.signal_stats` over it
    heard          sentences and words: Whisper's transcription of the span
    forced         words Whisper didn't match: {word: score}
    tone           ElevenLabs lines: {text: `ToneGrader.grade` result, or {error} if it couldn't run}

Syllables never reach Whisper, and only ElevenLabs lines reach the tone grader.
"""

import hashlib
import json
from collections.abc import Callable
from pathlib import Path

import av

from . import audio, models
from .clip_requests import ClipRequest, Syllable, SynthLine, Word, spoken_word
from .sources import raw_path
from .text import per
from .workspace import Workspace, write_atomic

METRICS_VERSION = 1  # bump when a measurement changes meaning, to invalidate the cache


def metrics_path(raw: Path, ws: Workspace) -> Path:
    digest = hashlib.sha256(raw.read_bytes()).hexdigest()[:16]
    return ws.metrics_dir / f"{digest}.json"


def load_metrics(raw: Path, ws: Workspace) -> dict:
    """The cached measurements of `raw`, or an empty dict when there are none."""
    path = metrics_path(raw, ws)
    if path.exists():
        cached = json.loads(path.read_text(encoding="utf-8"))
        if cached.get("version") == METRICS_VERSION:
            return cached
    return {}


def _save_metrics(raw: Path, metrics: dict, ws: Workspace) -> None:
    payload = json.dumps({**metrics, "version": METRICS_VERSION}, ensure_ascii=False, indent=1, sort_keys=True)
    write_atomic(metrics_path(raw, ws), payload.encode("utf-8"))


def measure_signal(raw: Path) -> dict:
    x48 = audio.decode(raw, audio.SR_OUT)
    start, end = audio.trim_span(x48, audio.SR_OUT)
    segment = x48[int(start * audio.SR_OUT):int(end * audio.SR_OUT)]
    return {"span": [round(start, 3), round(end, 3)], "signal": audio.signal_stats(segment, audio.SR_OUT)}


def _speech_16k(raw: Path, metrics: dict):
    start, end = metrics["span"]
    x16 = audio.decode(raw, audio.SR_ASR)
    return x16[int(start * audio.SR_ASR):int(end * audio.SR_ASR)]


class _Lazy:
    """Loads a model on first use, so a fully cached run never touches the GPU or torch."""

    def __init__(self, load: Callable):
        self._load, self._value = load, None

    def get(self):
        if self._value is None:
            self._value = self._load()
        return self._value


def analyze_all(requests: list[ClipRequest], ws: Workspace) -> list[str]:
    """Fills the metrics cache and returns a failure line per undecodable file.

    Requests with no source audio are skipped, since `gate` reports those.
    """
    available = [(r, raw_path(r, ws)) for r in requests]
    available = [(r, raw) for r, raw in available if raw is not None and raw.exists()]

    failures: list[str] = []
    decodable = []
    for request, raw in available:
        metrics = load_metrics(raw, ws)
        if "signal" not in metrics:
            try:
                _save_metrics(raw, {**metrics, **measure_signal(raw)}, ws)
            except av.FFmpegError as e:
                failures.append(f"{request.id}: can't decode {raw.name}: {e}")
                continue
        decodable.append((request, raw))

    whisper = _Lazy(lambda: models.load_whisper(ws))
    for request, raw in decodable:
        if isinstance(request, Syllable):
            continue
        metrics = load_metrics(raw, ws)
        if "heard" not in metrics:
            metrics["heard"] = whisper.get().transcribe(_speech_16k(raw, metrics))
        word = spoken_word(request)
        if word is not None and per(word, metrics["heard"]) > 0:
            forced = metrics.setdefault("forced", {})
            if word not in forced:
                forced[word] = round(whisper.get().score(_speech_16k(raw, metrics), word), 3)
        _save_metrics(raw, metrics, ws)

    grader = _Lazy(lambda: models.load_tone_grader(ws))
    for request, raw in decodable:
        if not isinstance(request, SynthLine):
            continue
        metrics = load_metrics(raw, ws)
        tone = metrics.setdefault("tone", {})
        if request.text not in tone:
            try:
                tone[request.text] = grader.get().grade(_speech_16k(raw, metrics), request.text)
            except RuntimeError as e:  # the aligner can't fit a line into very short audio
                tone[request.text] = {"error": str(e)}
            _save_metrics(raw, metrics, ws)
    return failures
