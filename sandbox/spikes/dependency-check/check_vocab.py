"""Placement checks for the lesson-plan vocab TSVs.

- every HSK 2025 L1-3 source row is placed exactly once across vocab-S1/S2 (plus optional `sense:` rows);
- no word appears in both the HSK files and vocab-extra or vocab-post-S2;
- lessons hold at most 5 words, except the 0-10 counting lessons (closed set);
- nothing is placed in, or prep-fed during, a checkpoint unit;
- a prep word's fed-during unit is in the prereq closure of every unit in its needed_by.
"""
import collections
import csv
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
R = HERE.parents[2]
LP = R / "docs/design/lesson-plans"
CHECKPOINTS = {"0.14", "1.19", "2.16", "2.33"}
CAP_EXEMPT = {"1.4a", "1.4b"}  # Counting 0-10 keeps its closed set whole


def load(name):
    with open(LP / name, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f, delimiter="\t"))


ns = {"__file__": str(HERE / "deps.py")}
exec((HERE / "deps.py").read_text(encoding="utf-8").split("# Lessons.")[0], ns)
closure = ns["closure"]

s1, s2, ex, post = (load(n) for n in ("vocab-S1.tsv", "vocab-S2.tsv", "vocab-extra.tsv", "vocab-post-S2.tsv"))
problems = []
key = lambda r: (r["word"], str(r["level"]))
with open(R / "sandbox/data/hsk2025/words-l1-3.tsv", encoding="utf-8", newline="") as f:
    src = collections.Counter(key(r) for r in csv.DictReader(f, delimiter="\t"))
placed = collections.Counter(key(r) for r in s1 + s2)
sense_rows = collections.Counter(key(r) for r in s1 + s2 if "sense:" in r["note"])
for k in src:  # an entry may gain extra sense rows (one card per sense); it may never lose its own
    if not src[k] <= placed[k] <= src[k] + sense_rows[k]:
        problems.append(f"HSK entry {k}: {src[k]} source rows, {placed[k]} placed")
hsk_words = {r["word"] for r in s1 + s2}
for r in ex + post:
    if r["word"] in hsk_words and "sense" not in r["note"]:
        problems.append(f"{r['word']} is in an HSK file and in vocab-extra/post-S2")
rows = s1 + s2 + ex
per = collections.Counter(r["place"] for r in rows if r["tier"] == "lesson")
problems += [f"lesson {k} has {v} words" for k, v in per.items() if v > 5 and k not in CAP_EXEMPT]
for r in rows:
    unit = re.match(r"(?:prep:)?([012]\.\d+)", r["place"])
    if unit and unit.group(1) in CHECKPOINTS:
        problems.append(f"{r['word']} placed at checkpoint {r['place']}")
    if r["tier"] == "prep":
        fed = r["place"].split(":")[1]
        for need in r["needed_by"].split():
            m = re.match(r"[012]\.\d+", need)
            nu = m and m.group(0)
            if nu and nu not in CHECKPOINTS and nu != fed and fed not in closure(nu):
                problems.append(f"{r['word']} prep-fed during {fed}, not on the path of {nu}")
print("\n".join(problems) or "all placement checks pass")
print("tiers:", dict(collections.Counter(r["tier"] for r in rows)))
