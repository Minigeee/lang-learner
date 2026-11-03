"""Mechanical dependency report: Chinese words each lesson plan mentions vs where those words are placed.

A word counts as available to lesson L (unit U) if it is placed at a lesson of a unit in U's transitive prereq
closure, at an earlier-or-same lesson of U, in the unit tier of U or a prereq unit, or in a prep feed whose
place unit is in that set. Queue words are never guaranteed before a given lesson. Also checks that table
order respects unit prereqs, and lists skill ids. Output is a candidate list for reviewers, not a verdict:
plans mention words in contrasts, notes and "go deeper" asides.
"""
import collections
import csv
import json
import re
from pathlib import Path

R = Path(__file__).resolve().parents[3]
LP = R / "docs/design/lesson-plans"
OUT = Path(__file__).resolve().parent / "deps-report"
OUT.mkdir(exist_ok=True)

# Units and prereqs from doc 03 tables.
units, order = {}, []
for line in (R / "docs/research/03-mandarin-curriculum-and-materials.md").read_text(encoding="utf-8").splitlines():
    m = re.match(r"^\| ([012]\.\d+) [^|]*\|[^|]*\| ([^|]*) \|", line)
    if m:
        u = m.group(1)
        cell = m.group(2)
        pre = set()
        for st, lo, st2, hi in re.findall(r"\b([012])\.(\d+)\s*[–-]\s*([012])\.(\d+)\b", cell):
            pre |= {f"{st}.{k}" for k in range(int(lo), int(hi) + 1)}  # ranges like 1.1–1.17 (same stage)
        pre |= set(re.findall(r"\b[012]\.\d+\b", cell))
        if re.search(r"all units above|all S\d units", cell):  # checkpoints: every earlier unit of the stage
            pre |= {v for v in order if v.split(".")[0] == u.split(".")[0] and v != u}
        units[u] = pre
        order.append(u)
for u in order:  # doc 03: every S2 unit also assumes all of S1
    if u.startswith("2."):
        units[u] |= {v for v in order if v.startswith("1.")}


def closure(u, seen=None):
    seen = set() if seen is None else seen
    for p in units.get(u, ()):
        if p not in seen:
            seen.add(p)
            closure(p, seen)
    return seen


# Lessons.
lessons = []
for fn in ("S0.md", "S1.md", "S2a.md", "S2b.md"):
    text = (LP / fn).read_text(encoding="utf-8")
    parts = re.split(r"(?m)^#### ", text)[1:]
    for p in parts:
        head = p.splitlines()[0]
        m = re.match(r"([012]\.\d+)([a-z])\s*·\s*(.*?)\s+\(les:([^)]+)\)", head)
        if not m:
            continue
        body = re.split(r"(?m)^#{2,3} ", p)[0]
        sk = re.search(r"Skill: (.*?)(?: · ~|$)", body, re.M)
        lessons.append({"file": fn, "unit": m.group(1), "id": m.group(1) + m.group(2), "title": m.group(3),
                        "slug": m.group(4), "skill": sk.group(1).strip() if sk else "?", "body": body})
pos = {l["id"]: i for i, l in enumerate(lessons)}

# Vocabulary placements.
place = {}  # word -> (tier, place)
for fn in ("vocab-S1.tsv", "vocab-S2.tsv", "vocab-extra.tsv", "vocab-post-S2.tsv"):
    with open(LP / fn, encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            place.setdefault(r["word"], (r["tier"], r["place"]))
maxlen = max(map(len, place))


def segment(s):
    i, out = 0, []
    while i < len(s):
        for n in range(min(maxlen, len(s) - i), 0, -1):
            w = s[i:i + n]
            if w in place or n == 1:
                out.append(w)
                i += n
                break
    return out


def available(word, les):
    tier, pl = place[word]
    u = les["unit"]
    ok_units = closure(u) | {u}
    if tier == "lesson":
        pu = re.match(r"[012]\.\d+", pl).group(0)
        if pu in closure(u):
            return True, pl
        return (pu == u and pos.get(pl, 1e9) <= pos[les["id"]]), pl
    if tier == "unit":
        return pl in ok_units, pl
    if tier == "prep":
        return pl.split(":")[1] in ok_units, pl
    return False, pl  # queue


HAN = re.compile(r"[一-鿿]+")
issues = []
for les in lessons:
    seen = set()
    for run in HAN.findall(les["body"]):
        for w in segment(run):
            if w in seen:
                continue
            seen.add(w)
            if w not in place:
                issues.append((les["id"], w, "off-list", ""))
                continue
            ok, pl = available(w, les)
            if not ok:
                kind = "queue" if place[w][0] == "queue" else "later-or-off-path"
                issues.append((les["id"], w, kind, f"{place[w][0]} {pl}"))

with open(OUT / "word-deps.tsv", "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t")
    w.writerow(["lesson", "word", "kind", "placed_at"])
    w.writerows(issues)

# Unit order vs prereqs; skills.
unit_pos = {u: i for i, u in enumerate(order)}
bad_order = [(u, p) for u in order for p in units[u] if unit_pos.get(p, -1) > unit_pos[u]]
missing_units = sorted({p for u in order for p in units[u] if p not in units})
skills = collections.Counter(re.search(r"\((zh:[^)]+)\)", l["skill"]).group(1) if "(zh:" in l["skill"] else l["skill"]
                             for l in lessons)
with open(OUT / "lessons.tsv", "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter="\t")
    w.writerow(["path", "lesson", "slug", "unit_prereqs", "skill", "title"])
    for i, l in enumerate(lessons, 1):
        w.writerow([i, l["id"], l["slug"], " ".join(sorted(units.get(l["unit"], ()))), l["skill"], l["title"]])
summary = {
    "lessons": len(lessons), "units": len(order),
    "units_without_lessons": [u for u in order if not any(l["unit"] == u for l in lessons)],
    "prereq_after_dependent": bad_order, "prereqs_naming_unknown_units": missing_units,
    "duplicate_skill_ids": {k: v for k, v in skills.items() if v > 1 and k != "none"},
    "word_issue_counts": dict(collections.Counter(k for _, _, k, _ in issues)),
}
(OUT / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=1))
