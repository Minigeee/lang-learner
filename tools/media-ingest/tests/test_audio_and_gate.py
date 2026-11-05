"""Signal checks and rendering, driven by synthetic audio."""

import io

import numpy as np
import pytest

from media_ingest import analyze, audio, gate
from media_ingest.clip_requests import CorpusLine, Syllable, Word

SR = audio.SR_OUT
SYLLABLE = Syllable("clip:a", "audio-cmn", ("zh:les:x",), "ma1")
WORD = Word("clip:b", "audio-cmn", ("zh:les:x",), "老师")
LINE = CorpusLine("clip:c", "aishell3", ("zh:les:x",), "SSB00050001", "你好，世界。")


def burst(seconds: float, amplitude: float = 0.1) -> np.ndarray:
    """Speech-like signal: a tone with a slow amplitude wobble."""
    t = np.arange(int(seconds * SR), dtype=np.float32) / SR
    return (amplitude * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * t)) * np.sin(2 * np.pi * 220 * t)).astype(np.float32)


def silence(seconds: float) -> np.ndarray:
    return np.zeros(int(seconds * SR), np.float32)


def stats(x: np.ndarray) -> dict:
    start, end = audio.trim_span(x, SR)
    return audio.signal_stats(x[int(start * SR):int(end * SR)], SR)


def metrics(x: np.ndarray, **extra) -> dict:
    return {"signal": stats(x), **extra}


def test_trim_keeps_speech_with_padding():
    x = np.concatenate([silence(1.0), burst(0.5), silence(1.0)])
    start, end = audio.trim_span(x, SR)
    assert start == pytest.approx(0.9, abs=0.03)
    assert end == pytest.approx(1.6, abs=0.04)


def test_clean_syllable_passes():
    assert gate.rejection_reasons(SYLLABLE, metrics(np.concatenate([silence(0.3), burst(0.5), silence(0.3)]))) == []


def test_syllable_needs_no_asr():
    assert "heard" not in metrics(burst(0.5))
    assert gate.rejection_reasons(SYLLABLE, metrics(burst(0.5))) == []


def test_two_speech_regions_reject_a_syllable():
    x = np.concatenate([burst(0.3), silence(0.5), burst(0.3)])
    assert any("one speech region" in r for r in gate.rejection_reasons(SYLLABLE, metrics(x)))


def test_too_long_is_rejected():
    assert any("duration" in r for r in gate.rejection_reasons(SYLLABLE, metrics(burst(2.5))))


def test_clipping_is_rejected():
    x = np.clip(burst(0.5, amplitude=3.0), -1, 1)
    assert any("clipping" in r for r in gate.rejection_reasons(SYLLABLE, metrics(x)))


def test_out_of_range_loudness_is_rejected():
    assert any("loudness" in r for r in gate.rejection_reasons(SYLLABLE, metrics(burst(0.5, amplitude=0.002))))


def test_long_internal_silence_is_rejected():
    x = np.concatenate([burst(1.0), silence(2.5), burst(1.0)])
    reasons = gate.rejection_reasons(LINE, metrics(x, heard="你好世界"), "你好世界")
    assert any("internal silence" in r for r in reasons)


def test_speech_at_the_edge_warns_but_never_rejects_a_sentence():
    m = metrics(burst(1.2), heard="你好世界")
    assert gate.rejection_reasons(LINE, m, "你好世界") == []
    assert any("edge" in w for w in gate.clip_record(LINE, m, audio.render_opus(burst(0.5)))["warnings"])


def faded_sentence() -> np.ndarray:
    x = burst(1.2)
    window = np.ones(len(x), np.float32)
    ramp = int(0.05 * SR)
    window[:ramp] = np.linspace(0, 1, ramp)
    window[-ramp:] = np.linspace(1, 0, ramp)
    return np.concatenate([silence(0.3), x * window, silence(0.3)])


def test_sentence_passes_with_matching_transcript_and_asr():
    assert gate.rejection_reasons(LINE, metrics(faded_sentence(), heard="你好世界"), "你好世界") == []


def test_homophone_asr_output_passes_a_sentence():
    assert gate.rejection_reasons(LINE, metrics(faded_sentence(), heard="你好是戒"), "你好世界") == []


def test_wrong_asr_fails_a_sentence():
    reasons = gate.rejection_reasons(LINE, metrics(faded_sentence(), heard="再见朋友"), "你好世界")
    assert any("round-trip" in r for r in reasons)


def test_display_text_must_match_the_transcript():
    reasons = gate.rejection_reasons(LINE, metrics(faded_sentence(), heard="你好世界"), "你好地球")
    assert any("transcript" in r for r in reasons)


def test_corpus_line_needs_a_transcript():
    assert any("no transcript" in r for r in gate.rejection_reasons(LINE, metrics(faded_sentence(), heard="你好世界")))


def test_word_passes_on_toneless_match_or_forced_score_only():
    m = metrics(burst(0.6))
    assert gate.rejection_reasons(WORD, {**m, "heard": "老师"}) == []
    assert gate.rejection_reasons(WORD, {**m, "heard": "coffee", "forced": {"老师": -1.0}}) == []
    assert any("word mismatch" in r for r in gate.rejection_reasons(WORD, {**m, "heard": "coffee", "forced": {"老师": -3.0}}))
    assert any("word mismatch" in r for r in gate.rejection_reasons(WORD, {**m, "heard": "coffee"}))


def test_render_hits_the_loudness_target_on_a_short_clip():
    rendered = audio.render_opus(burst(0.3))
    assert rendered.lufs == pytest.approx(audio.TARGET_LUFS, abs=audio.LUFS_TOLERANCE)
    assert rendered.peak_db <= audio.PEAK_CEIL_DB


def test_render_caps_peak_rather_than_exceeding_it():
    x = burst(1.0, amplitude=0.02)
    x[SR // 2] = 0.9  # a spike leaves no headroom for the loudness gain
    rendered = audio.render_opus(x)
    assert rendered.peak_db <= audio.PEAK_CEIL_DB
    assert rendered.lufs < audio.TARGET_LUFS - 1


def test_render_is_byte_stable():
    assert audio.render_opus(burst(0.5)).data == audio.render_opus(burst(0.5)).data


def test_rendered_file_decodes_to_the_reported_duration():
    rendered = audio.render_opus(burst(0.5))
    assert len(audio.decode(io.BytesIO(rendered.data), SR)) / SR == pytest.approx(rendered.duration_sec, abs=0.001)


def test_loudness_is_measured_for_very_short_clips():
    assert audio.integrated_loudness(burst(0.2), SR) > -60
    assert audio.integrated_loudness(burst(0.05), SR) == float("-inf")


def test_metrics_cache_is_keyed_by_content(tmp_path):
    from media_ingest.workspace import Workspace
    ws = Workspace(tool_root=tmp_path)
    first, same, other = tmp_path / "a.mp3", tmp_path / "b.mp3", tmp_path / "c.mp3"
    first.write_bytes(b"one")
    same.write_bytes(b"one")
    other.write_bytes(b"two")
    assert analyze.metrics_path(first, ws) == analyze.metrics_path(same, ws)
    assert analyze.metrics_path(first, ws) != analyze.metrics_path(other, ws)
