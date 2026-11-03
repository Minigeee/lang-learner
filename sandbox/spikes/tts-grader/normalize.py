"""Loudness-normalize every clip in jobs.json and write jobs-norm.json pointing at the copies.

Target: -20 LUFS integrated (ITU-R BS.1770 via pyloudnorm), peak capped at -1 dBFS, as in the
media-ingest spike. Copies go to clips-norm/ as WAV, so no second lossy encode; they keep their
original sample rate.
"""

import json
from pathlib import Path

import librosa
import numpy as np
import pyloudnorm
import soundfile as sf

HERE = Path(__file__).resolve().parent
TARGET_LUFS = -20.0
PEAK_DBFS = -1.0


def main():
    jobs = json.loads((HERE / "jobs.json").read_text(encoding="utf-8"))
    out_dir = HERE / "clips-norm"
    out_dir.mkdir(exist_ok=True)
    norm_jobs = []
    for job in jobs:
        src = HERE / job["path"]
        audio, sr = librosa.load(str(src), sr=None, mono=True)
        meter = pyloudnorm.Meter(sr)
        before = meter.integrated_loudness(audio)
        gain_db = TARGET_LUFS - before
        peak_db = 20 * np.log10(np.max(np.abs(audio)) + 1e-12)
        gain_db = min(gain_db, PEAK_DBFS - peak_db)  # never push the peak past -1 dBFS
        out = audio * 10 ** (gain_db / 20)
        dst = out_dir / f"{job['group']}-{Path(job['path']).stem}.wav"
        sf.write(dst, out, sr, subtype="PCM_16")
        after = meter.integrated_loudness(out)
        print(f"{job['group']:<10} {job['source']:<34} {before:6.1f} LUFS -> {after:6.1f} LUFS (gain {gain_db:+.1f} dB)")
        norm_jobs.append({**job, "path": f"clips-norm/{dst.name}"})
    (HERE / "jobs-norm.json").write_text(json.dumps(norm_jobs, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
