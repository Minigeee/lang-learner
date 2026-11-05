"""Audio decoding, signal measurement and rendering to the shipped format.

Loudness is always measured at `SR_OUT`, the rate listeners get, so what is recorded matches the
file. `render_opus` guarantees a peak at or under `PEAK_CEIL_DB` and aims for `TARGET_LUFS`; a
peak-limited clip lands under the target.
"""

import io
import itertools
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

import av
import numpy as np
import pyloudnorm

SR_ASR, SR_OUT = 16000, 48000
TARGET_LUFS, PEAK_CEIL_DB = -20.0, -1.0
OPUS_BPS = 32000
FADE_SEC = 0.005
TRIM_PAD_SEC = 0.10
LUFS_TOLERANCE = 0.1
RENDER_PASSES = 4
FRAME_HOP_SEC = 0.01


def decode(source: Path | BinaryIO, sr: int) -> np.ndarray:
    """Mono float32 samples at `sr`, from any format PyAV reads."""
    chunks = []
    with av.open(str(source) if isinstance(source, Path) else source) as container:
        resampler = av.AudioResampler(format="flt", layout="mono", rate=sr)
        for frame in container.decode(audio=0):
            chunks += [f.to_ndarray().reshape(-1) for f in resampler.resample(frame)]
        chunks += [f.to_ndarray().reshape(-1) for f in resampler.resample(None)]
    return np.concatenate(chunks).astype(np.float32) if chunks else np.zeros(0, np.float32)


def encode_opus(x48: np.ndarray) -> bytes:
    """Ogg Opus at `OPUS_BPS`, mono. Same samples in, same bytes out, so hashes are stable keys."""
    buffer = io.BytesIO()
    with av.open(buffer, "w", format="ogg") as container:
        container.flags |= av.container.Flags.bitexact.value  # otherwise the Ogg serial number is random
        stream = container.add_stream("libopus", rate=SR_OUT, layout="mono")
        stream.bit_rate = OPUS_BPS
        stream.codec_context.flags |= av.codec.context.Flags.bitexact
        frame = av.AudioFrame.from_ndarray(x48.reshape(1, -1).astype(np.float32), format="flt", layout="mono")
        frame.sample_rate = SR_OUT
        frame.pts = 0
        for packet in stream.encode(frame):
            container.mux(packet)
        for packet in stream.encode(None):
            container.mux(packet)
    return buffer.getvalue()


def _frame_db(x: np.ndarray, sr: int, win: float = 0.02) -> np.ndarray:
    size, hop = int(sr * win), int(sr * FRAME_HOP_SEC)
    if len(x) < size:
        x = np.pad(x, (0, size - len(x)))
    count = 1 + (len(x) - size) // hop
    index = np.arange(size)[None, :] + hop * np.arange(count)[:, None]
    return 20 * np.log10(np.sqrt(np.mean(x[index] ** 2, axis=1) + 1e-12))


def _speech_mask(db: np.ndarray, rel: float = 30.0) -> np.ndarray:
    return db > max(-50.0, np.percentile(db, 95) - rel)


def speech_regions(x: np.ndarray, sr: int, min_gap: float = 0.15, min_len: float = 0.05) -> list[list[float]]:
    """[start, end] seconds of each stretch of speech, merging gaps shorter than `min_gap`."""
    mask = _speech_mask(_frame_db(x, sr))
    regions, start = [], None
    for i, active in enumerate(mask):
        t = i * FRAME_HOP_SEC
        if active and start is None:
            start = t
        if not active and start is not None:
            regions.append([start, t + 0.02])
            start = None
    if start is not None:
        regions.append([start, len(mask) * FRAME_HOP_SEC + 0.02])
    merged: list[list[float]] = []
    for region in regions:
        if merged and region[0] - merged[-1][1] < min_gap:
            merged[-1][1] = region[1]
        else:
            merged.append(region)
    return [r for r in merged if r[1] - r[0] >= min_len]


def trim_span(x: np.ndarray, sr: int) -> tuple[float, float]:
    """Seconds to keep: first to last speech, padded. The whole clip when no speech is found."""
    regions = speech_regions(x, sr)
    if not regions:
        return 0.0, len(x) / sr
    return max(0.0, regions[0][0] - TRIM_PAD_SEC), min(len(x) / sr, regions[-1][1] + TRIM_PAD_SEC)


def integrated_loudness(x: np.ndarray, sr: int) -> float:
    """BS.1770 LUFS, or -inf when unmeasurable. The block shrinks to fit clips under 0.44 s."""
    block = min(0.4, max(0.1, len(x) / sr * 0.9))
    try:
        return float(pyloudnorm.Meter(sr, block_size=block).integrated_loudness(x.astype(np.float64)))
    except ValueError:
        return float("-inf")


def peak_db(x: np.ndarray) -> float:
    return float(20 * np.log10(np.max(np.abs(x)) + 1e-12))


def signal_stats(x: np.ndarray, sr: int) -> dict:
    """The signal facts the gate judges, for an already trimmed clip."""
    db = _frame_db(x, sr)
    mask = _speech_mask(db)
    p95 = float(np.percentile(db, 95))
    active = np.flatnonzero(mask)
    longest_gap, run = 0.0, 0
    if len(active):
        for is_speech in mask[active[0]:active[-1] + 1]:
            run = 0 if is_speech else run + 1
            longest_gap = max(longest_gap, run * FRAME_HOP_SEC)
    edge = max(1, int(0.02 * sr))

    def rms_db(segment: np.ndarray) -> float:
        return float(20 * np.log10(np.sqrt(np.mean(segment ** 2) + 1e-12)))

    return {
        "dur": round(len(x) / sr, 3),
        "speech_ratio": round(float(mask.mean()), 3),
        "speech_regions": len(speech_regions(x, sr)),
        "max_gap": round(longest_gap, 3),
        "clip_frac": float(np.mean(np.abs(x) >= 0.99)),
        "peak_db": round(peak_db(x), 2),
        "lufs": round(integrated_loudness(x, sr), 2),
        "edge_start_db": round(rms_db(x[:edge]) - p95, 2),
        "edge_end_db": round(rms_db(x[-edge:]) - p95, 2),
    }


@dataclass(frozen=True)
class Rendered:
    data: bytes
    gain_db: float
    lufs: float
    peak_db: float
    duration_sec: float


def _apply_gain(x48: np.ndarray, gain_db: float) -> np.ndarray:
    y = x48 * np.float32(10 ** (gain_db / 20))
    fade = min(len(y) // 2, int(FADE_SEC * SR_OUT))
    if fade:
        ramp = np.linspace(0, 1, fade, dtype=np.float32)
        y[:fade] *= ramp
        y[-fade:] *= ramp[::-1]
    return y


def render_opus(x48: np.ndarray) -> Rendered:
    """Normalizes a trimmed clip and encodes it. Reported numbers are measured on the encoded file.

    The encoder shifts both loudness and peak, by over 1 dB on short clips, so the gain is corrected
    against the decoded file until it lands within `LUFS_TOLERANCE`, or the passes run out.
    """
    gain = min(TARGET_LUFS - integrated_loudness(x48, SR_OUT), PEAK_CEIL_DB - peak_db(x48))
    for attempt in itertools.count(1):
        data = encode_opus(_apply_gain(x48, gain))
        decoded = decode(io.BytesIO(data), SR_OUT)
        lufs, peak = integrated_loudness(decoded, SR_OUT), peak_db(decoded)
        step = min(TARGET_LUFS - lufs, PEAK_CEIL_DB - peak - 0.01)
        if peak <= PEAK_CEIL_DB and (abs(step) <= LUFS_TOLERANCE or attempt >= RENDER_PASSES):
            return Rendered(data, round(gain, 2), round(lufs, 2), round(peak, 2), round(len(decoded) / SR_OUT, 3))
        gain += step
    raise AssertionError("unreachable")
