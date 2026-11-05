"""Judges measured audio and writes the outputs: Opus files, media.yaml, quarantine.json.

`rejection_reasons` is pure, so thresholds can be retuned against cached metrics. Only passing clips
are rendered. Outputs carry nothing that changes between identical runs.

Validation by kind:
    syllable  signal checks and one speech region; the label is trusted (`signal-only`)
    word      signal checks, and a toneless pinyin match or a forced score over the threshold
    sentence  signal checks and an ASR round trip; corpus lines must also match their transcript
"""

import hashlib
import json
from pathlib import Path

import yaml

from . import audio, corpora, sources
from .analyze import load_metrics
from .asr import MODEL_NAME
from .clip_requests import ClipRequest, CorpusLine, Syllable, SynthLine, Word, spoken_word
from .text import cer, matches_transcript, per, spoken_form
from .workspace import Workspace, write_atomic

TOOL = "media-ingest 0.1"

# Justified in sandbox/spikes/media-ingest/FINDINGS.md.
GATES = {
    "sentence_cer_max": 0.20,      # a sentence fails only when both error rates are over
    "sentence_per_max": 0.10,
    "sentence_dur": (0.6, 60.0),
    "sec_per_char": (0.10, 1.00),
    "word_forced_min": -2.5,       # accepted no random impostor words in the spike
    "word_dur": (0.2, 3.5),
    "syllable_dur": (0.15, 2.0),
    "speech_ratio_min": 0.30,
    "max_internal_gap": 2.0,
    "clip_frac_max": 0.001,
    "lufs": (-45.0, -6.0),         # source loudness; outside this a clip is broken, not just quiet
}
# First and last 20 ms against the p95 frame. Only a warning: this tool cuts nothing mid-speech, and
# AISHELL-1's tight segmentation and noise floor put over half its clean lines past the spike's -25.
EDGE_WARN_DB = -15.0
TONE_NATIVE_FLOOR = 0.5  # lowest accuracy native sentences scored in the tts-grader spike
TONE_TRUSTED_P = 0.7

_CHANGES = (f"trimmed silence, normalized to {audio.TARGET_LUFS:g} LUFS, "
            f"re-encoded to Ogg Opus {audio.OPUS_BPS // 1000} kbps mono")
_YOYO_CHART = "https://yoyochinese.com/chinese-learning-tools/Mandarin-Chinese-pronunciation-lesson/pinyin-chart-table"


def _signal_reasons(signal: dict, duration_gate: str) -> list[str]:
    reasons = []
    low, high = GATES[duration_gate]
    if not low <= signal["dur"] <= high:
        reasons.append(f"duration {signal['dur']}s outside [{low}, {high}]")
    if signal["speech_ratio"] < GATES["speech_ratio_min"]:
        reasons.append(f"mostly silence (speech ratio {signal['speech_ratio']})")
    if signal["max_gap"] > GATES["max_internal_gap"]:
        reasons.append(f"internal silence {signal['max_gap']}s")
    if signal["clip_frac"] > GATES["clip_frac_max"]:
        reasons.append(f"clipping ({signal['clip_frac']:.4f} of samples)")
    low, high = GATES["lufs"]
    if not low <= signal["lufs"] <= high:
        reasons.append(f"loudness {signal['lufs']} LUFS outside [{low}, {high}]")
    return reasons


def _sentence_reasons(text: str, metrics: dict) -> list[str]:
    signal, heard = metrics["signal"], metrics["heard"]
    reasons = _signal_reasons(signal, "sentence_dur")
    sec_per_char = signal["dur"] / max(1, len(spoken_form(text)))
    low, high = GATES["sec_per_char"]
    if not low <= sec_per_char <= high:
        reasons.append(f"implausible speech rate {sec_per_char:.2f} s/char")
    errors = cer(text, heard), per(text, heard)
    if errors[0] > GATES["sentence_cer_max"] and errors[1] > GATES["sentence_per_max"]:
        reasons.append(f"round-trip mismatch (cer {errors[0]:.3f}, per {errors[1]:.3f}, heard {heard!r})")
    return reasons


def rejection_reasons(request: ClipRequest, metrics: dict, transcript: str | None = None) -> list[str]:
    """Why a clip can't ship; empty means it passes. `transcript` applies to corpus lines only."""
    if isinstance(request, Syllable):
        reasons = _signal_reasons(metrics["signal"], "syllable_dur")
        if metrics["signal"]["speech_regions"] != 1:
            reasons.append(f"expected one speech region, found {metrics['signal']['speech_regions']}")
        return reasons
    word = spoken_word(request)
    if word is not None:
        reasons = _signal_reasons(metrics["signal"], "word_dur")
        forced = metrics.get("forced", {}).get(word)
        matched = per(word, metrics["heard"]) == 0
        if not matched and (forced is None or forced < GATES["word_forced_min"]):
            reasons.append(f"word mismatch (heard {metrics['heard']!r}, forced {forced})")
        return reasons
    reasons = _sentence_reasons(request.speech, metrics)
    if isinstance(request, CorpusLine):
        if transcript is None:
            reasons.append(f"{request.utt} has no transcript")
        elif not matches_transcript(request.zh, transcript):
            reasons.append(f"zh differs from the transcript {transcript!r}")
    return reasons


def _validation(request: ClipRequest, metrics: dict) -> dict:
    if isinstance(request, Syllable):
        return {"method": "signal-only", "speechRegions": metrics["signal"]["speech_regions"]}
    heard = metrics["heard"]
    word = spoken_word(request)
    if word is not None:
        if per(word, heard) == 0:
            return {"method": "asr-toneless", "model": MODEL_NAME, "heard": heard}
        return {"method": "forced-score", "model": MODEL_NAME, "heard": heard,
                "forcedLogp": metrics["forced"][word]}
    result = {"method": "asr-roundtrip", "model": MODEL_NAME, "heard": heard,
              "cer": round(cer(request.speech, heard), 3), "per": round(per(request.speech, heard), 3)}
    if isinstance(request, CorpusLine):
        result["transcriptMatch"] = True
    return result


def tone_warnings(grade: dict) -> list[str]:
    """Triage flags from a `ToneGrader.grade` result, limited to what the grader is credible on.

    The classifier gets native third tones right about 30% of the time and often calls a native
    second tone a first, so those calls alone aren't flagged.
    """
    if "error" in grade:
        return [f"tone: not graded ({grade['error']})"]
    warnings = []
    if grade["accuracy"] is not None and grade["accuracy"] < TONE_NATIVE_FLOOR:
        warnings.append(f"tone: accuracy {grade['accuracy']:.0%} of {grade['scored']} syllables, under the native floor")
    for s in grade["syllables"]:
        if s["tone"] == 5 or s["heard"] in s["accept"] or s["p"] < TONE_TRUSTED_P:
            continue
        if s["heard"] == 3 or 3 in s["accept"] or (s["tone"] == 2 and s["heard"] == 1):
            continue
        warnings.append(f"tone: {s['char']} expected {s['tone']}, heard {s['heard']} (p {s['p']:.2f})")
    return warnings


def _edge_warnings(signal: dict) -> list[str]:
    if max(signal["edge_start_db"], signal["edge_end_db"]) > EDGE_WARN_DB:
        return [f"edge: speech may be cut off ({signal['edge_start_db']}/{signal['edge_end_db']} dB)"]
    return []


def _rights(request: ClipRequest) -> dict:
    """License ids are `lic:` records in content/shared/licenses.yaml, which owns names and authors."""
    if isinstance(request, CorpusLine):
        number = {"aishell1": 33, "aishell3": 93}[request.source]
        return {"license": "lic:apache-2-0", "source": f"https://www.openslr.org/{number}/", "changes": _CHANGES}
    if isinstance(request, SynthLine):
        return {"license": "lic:elevenlabs-tts", "source": "https://elevenlabs.io/", "changes": _CHANGES}
    if request.source == "yoyo":
        return {"license": "lic:personal-use", "restriction": "personal-use-private-bucket",
                "source": _YOYO_CHART, "changes": _CHANGES}
    return {"license": "lic:cc-by-sa", "changes": _CHANGES,
            "source": f"https://github.com/hugolpz/audio-cmn/blob/master/{sources.audio_cmn_path(request)}"}


def clip_record(request: ClipRequest, metrics: dict, rendered: audio.Rendered) -> dict:
    """The media.yaml record for a clip that passed."""
    digest = hashlib.sha256(rendered.data).hexdigest()
    short = digest[:16]
    record: dict = {"id": request.id, "source": request.source}
    if request.zh is not None:
        record["zh"] = request.zh
    if isinstance(request, Syllable):
        record["syllable"] = request.syllable
    warnings = _edge_warnings(metrics["signal"]) if request.kind == "sentence" else []
    if isinstance(request, SynthLine):
        warnings += tone_warnings(metrics["tone"][request.text])
    record |= {
        "speaker": sources.speaker_id(request),
        "media": f"media:{short}",
        "file": {"key": f"media/{short}.opus", "sha256": digest, "bytes": len(rendered.data),
                 "durationSec": rendered.duration_sec},
        "lufs": rendered.lufs,
        "gainDb": rendered.gain_db,
        "validation": _validation(request, metrics),
        "warnings": warnings,
        "rights": _rights(request),
        "ingest": {"tool": TOOL},
    }
    return record


def write_media(records: list[dict], path: Path) -> None:
    """Writes records sorted by id, in code-point order."""
    ordered = sorted(records, key=lambda r: r["id"])
    text = yaml.safe_dump(ordered, allow_unicode=True, sort_keys=False, width=1000)
    write_atomic(path, text.encode("utf-8"))


def _quarantine_entry(request: ClipRequest, reasons: list[str], metrics: dict) -> dict:
    entry = {"id": request.id, "source": request.source, "reasons": reasons}
    if request.zh is not None:
        entry["zh"] = request.zh
    if "heard" in metrics:
        entry["heard"] = metrics["heard"]
    return entry


def _is_analyzed(request: ClipRequest, metrics: dict) -> bool:
    if isinstance(request, Syllable):
        return "signal" in metrics
    if isinstance(request, SynthLine):
        return "signal" in metrics and "heard" in metrics and request.text in metrics.get("tone", {})
    return "signal" in metrics and "heard" in metrics


def _render(raw: Path, metrics: dict) -> audio.Rendered:
    start, end = metrics["span"]
    x48 = audio.decode(raw, audio.SR_OUT)
    return audio.render_opus(x48[int(start * audio.SR_OUT):int(end * audio.SR_OUT)].copy())


def gate_all(requests: list[ClipRequest], ws: Workspace, media_path: Path) -> list[str]:
    """Rewrites media.yaml and quarantine.json from the current requests.

    Every request ends up in exactly one of the two. A rejected clip is a normal outcome, not a
    failure of this stage.
    """
    transcripts = {name: corpora.load_transcript(name, ws) for name in corpora.CORPORA
                   if any(r.source == name for r in requests)}
    records, quarantine = [], []
    for request in requests:
        raw = sources.raw_path(request, ws)
        if raw is None or not raw.exists():
            quarantine.append(_quarantine_entry(request, ["no source audio"], {}))
            continue
        metrics = load_metrics(raw, ws)
        if not _is_analyzed(request, metrics):
            quarantine.append(_quarantine_entry(request, ["not analyzed"], metrics))
            continue
        transcript = transcripts[request.source].get(request.utt) if isinstance(request, CorpusLine) else None
        reasons = rejection_reasons(request, metrics, transcript)
        if reasons:
            quarantine.append(_quarantine_entry(request, reasons, metrics))
            continue
        rendered = _render(raw, metrics)
        record = clip_record(request, metrics, rendered)
        write_atomic(ws.out_dir / f"{record['file']['sha256'][:16]}.opus", rendered.data)
        records.append(record)
    write_media(records, media_path)
    quarantine.sort(key=lambda entry: entry["id"])
    report = json.dumps(quarantine, ensure_ascii=False, indent=1)
    write_atomic(ws.quarantine_file, report.encode("utf-8"))
    print(f"gate: {len(records)} passed, {len(quarantine)} quarantined -> {media_path}", flush=True)
    return []
