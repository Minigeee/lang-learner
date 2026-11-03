"""Build jobs-yoyo.json: native single-syllable baseline from the user's local Yoyo pinyin-chart cache.

The recordings are for personal study only (see that project's README); they are read in place and
never copied into this repo. Picks the 8 test syllables plus a seeded random sample of 25 syllables x 4 tones.
"""

import json
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
YOYO = Path("C:/Users/tritn/Documents/projects/anki/pinyin_chart/.cache/media/audio")
SAMPLE = 25

files = sorted(YOYO.glob("pinyin_*_[1-4].mp3"))
syllables = sorted({f.stem.split("_")[1] for f in files})
jobs = [{"group": "syllables", "source": "yoyo native", "path": str(YOYO / f"pinyin_{s}_{t}.mp3"), "text": f"{s}{t}"}
        for s in ("ma", "tang") for t in (1, 2, 3, 4)]
random.seed(7)
for s in random.sample([s for s in syllables if s not in ("ma", "tang")], SAMPLE):
    for t in (1, 2, 3, 4):
        jobs.append({"group": "yoyo-sample", "source": "yoyo native", "path": str(YOYO / f"pinyin_{s}_{t}.mp3"), "text": f"{s}{t}"})
(HERE / "jobs-yoyo.json").write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(syllables), "syllables available;", len(jobs), "jobs")
