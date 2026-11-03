"""Build jobs.json: three native Common Voice speakers per sentence (the baseline) plus the TTS clips.

Native picks are deterministic: each speaker's best-voted clip, ranked by net votes, preferring a gender mix.
"""

import csv
import json
import shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
CV = HERE.parents[1] / "data" / "common-voice-zh-CN" / "cv-corpus-27.0-2026-09-11" / "zh-CN"
SENTENCES = {"s1": "它们可以是独居或成对生活。", "s2": "这里的天气真好"}
TTS_VOICES = ["ByhETIclHirOlWnWKhHc", "DowyQ68vDpgFYdWVGjc3"]
NATIVE_PER_SENTENCE = 3


def pick(rows):
    best = {}
    for r in sorted(rows, key=lambda r: (-(int(r["up_votes"]) - int(r["down_votes"])), r["path"])):
        best.setdefault(r["client_id"], r)
    ranked, picked, genders = list(best.values()), [], set()
    for r in ranked:  # first pass: one per gender label
        g = r.get("gender") or ""
        if len(picked) < NATIVE_PER_SENTENCE and g not in genders:
            picked.append(r)
            genders.add(g)
    for r in ranked:  # fill up by votes
        if len(picked) < NATIVE_PER_SENTENCE and r not in picked:
            picked.append(r)
    return picked


def main():
    rows = {k: [] for k in SENTENCES}
    with open(CV / "validated.tsv", encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE):
            for k, s in SENTENCES.items():
                if r["sentence"] == s:
                    rows[k].append(r)
    (HERE / "clips").mkdir(exist_ok=True)
    jobs = []
    for k, s in SENTENCES.items():
        for i, r in enumerate(pick(rows[k]), 1):
            dst = f"clips/{k}-native{i}.mp3"
            shutil.copyfile(CV / "clips" / r["path"], HERE / dst)
            label = f"native{i} ({r.get('gender') or 'gender ?'}, +{r['up_votes']}/-{r['down_votes']})"
            jobs.append({"group": k, "source": label, "path": dst, "text": s})
        print(k, s, f"{len(rows[k])} validated clips")
        for v in TTS_VOICES:
            jobs.append({"group": k, "source": f"11labs v4 {v[:6]}", "path": f"clips/{k}-v4-{v[:6]}.mp3", "text": s})
    for v in TTS_VOICES:
        jobs.append({"group": "syllables", "source": f"11labs v4 {v[:6]}", "path": f"../elevenlabs-check/audio/b-eleven_v4-{v}.mp3", "text": "妈麻马骂汤糖躺烫"})
    (HERE / "jobs.json").write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
    for j in jobs:
        print(" ", j["group"], j["source"], j["path"])


if __name__ == "__main__":
    main()
