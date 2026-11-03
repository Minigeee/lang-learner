"""Coverage for every combination of sentence+audio sources, against the same target as coverage.py.

Run from this folder:  .venv/Scripts/python -I -X utf8 combos.py
An idea is covered when the chosen sources give it >= TARGET_SENTENCES learner-fit sentences that
match its pattern, from >= TARGET_VOICES distinct speakers. Writes out/combos.csv.
"""

import csv
import itertools
import re
import sys
from collections import defaultdict
from statistics import median

import yaml
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # -I drops the script's folder from sys.path
import coverage as cov  # noqa: E402

SOURCES = ["tatoeba_lic", "gs", "cv", "aishell1", "aishell3", "thchs30"]


def main():
    spec = yaml.safe_load((cov.HERE / "patterns.yaml").read_text(encoding="utf-8"))
    fits = cov.make_fit(spec["settings"], cov.load_hsk())
    tb_sents, tb_audio = cov.load_tatoeba()
    cv_clips = cov.load_cv_clips() or {}
    openslr = cov.load_openslr()
    gs = cov.load_gs()

    # Every source as {text: set(voice ids)}; voice ids are prefixed so they never collide across sources.
    voices = {s: defaultdict(set) for s in SOURCES}
    for sid, text in tb_sents.items():
        for user, lic in tb_audio.get(sid, []):
            if lic:
                voices["tatoeba_lic"][text].add(f"tb:{user}")
    for _, _, text in gs:
        voices["gs"][text].add("gs:narrator")  # every zh Global Storybooks story has one narrator
    for text, v in cv_clips.items():
        if v["validated"]:
            voices["cv"][text] |= {f"cv:{c}" for c in v["validated"]}
    for corpus, texts in openslr.items():
        for text, spk in texts.items():
            voices[corpus][text] |= {f"{corpus}:{s}" for s in spk}

    fit_texts = {st: {s: [t for t in voices[s] if fits[st](t)] for s in SOURCES} for st in ("S1", "S2")}
    lessons = [(u, l) for u in spec["units"] for l in u["lessons"]]
    by_id = {l["id"]: l for _, l in lessons}
    cache = {}

    def match(lesson, stage):
        if lesson["id"] in cache:
            return cache[lesson["id"]]
        res = {s: set() for s in SOURCES}
        if lesson.get("union"):
            for ref in lesson["union"]:
                for s, texts in match(by_id[ref], stage).items():
                    res[s] |= texts
        elif lesson.get("re"):
            rx = re.compile(lesson["re"])
            for s in SOURCES:
                res[s] = {t for t in fit_texts[stage][s] if rx.search(t)}
        cache[lesson["id"]] = res
        return res

    ideas = []
    for unit, lesson in lessons:
        stage = "S1" if unit["unit"].startswith("1") else "S2"
        ideas.append((stage, lesson, match(lesson, stage)))

    rows = []
    for r in range(1, len(SOURCES) + 1):
        for combo in itertools.combinations(SOURCES, r):
            green = {"S1": 0, "S2": 0}
            sent_counts = []
            for stage, lesson, m in ideas:
                texts = set().union(*(m[s] for s in combo))
                ids = set().union(*(voices[s][t] for s in combo for t in m[s]))
                sent_counts.append(len(texts))
                if not lesson.get("no_text") and len(texts) >= cov.TARGET_SENTENCES and len(ids) >= cov.TARGET_VOICES:
                    green[stage] += 1
            rows.append({"sources": "+".join(combo), "n_sources": len(combo), "green": green["S1"] + green["S2"],
                         "S1": green["S1"], "S2": green["S2"], "median_sentences": median(sent_counts)})
    rows.sort(key=lambda r: (-r["green"], r["n_sources"]))
    with open(cov.OUT / "combos.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    n1 = sum(1 for s, _, _ in ideas if s == "S1")
    print(f"ideas: {len(ideas)} (S1 {n1}, S2 {len(ideas) - n1})")
    best_per_size = {}
    for r in rows:
        best_per_size.setdefault(r["n_sources"], r)
    print("best combination per number of sources:")
    for n, r in sorted(best_per_size.items()):
        print(f"  {n}: {r['sources']:<45} green {r['green']:>3}  (S1 {r['S1']}, S2 {r['S2']}), median {r['median_sentences']} sentences/idea")
    print("single sources:")
    for r in rows:
        if r["n_sources"] == 1:
            print(f"  {r['sources']:<12} green {r['green']:>3}  (S1 {r['S1']}, S2 {r['S2']})")
    print("pairs and triples with CV / AISHELL:")
    for r in rows:
        if r["sources"] in ("cv+aishell3", "cv+aishell1", "aishell1+aishell3", "cv+aishell1+aishell3"):
            print(f"  {r['sources']:<24} green {r['green']:>3}  (S1 {r['S1']}, S2 {r['S2']}), median {r['median_sentences']}")


if __name__ == "__main__":
    sys.exit(main())
