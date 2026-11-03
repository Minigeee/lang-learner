"""Renumber unit display ids into table order after inserting units 1.N (before 1.4) and 2.C (after 2.3).

1.N -> 1.4 and 1.4..1.18 -> 1.5..1.19; 2.C -> 2.4 and 2.4..2.32 -> 2.5..2.33. Lesson ids follow their
unit (1.13a -> 1.14a). Slugs (les:...) never change. Section references (§1.8), decimals with units
(1.5 h, 2.5x), dotted versions (0.2.1) and section-numbered headings are left alone.

Usage: python -I -X utf8 renumber.py          (dry run: prints every change with context)
       python -I -X utf8 renumber.py --write
"""
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
FILES = [
    "docs/research/03-mandarin-curriculum-and-materials.md",
    "docs/research/README.md",
    "docs/design/activity-brainstorm.md",
    "docs/design/lesson-plans/README.md",
    "docs/design/lesson-plans/S0.md",
    "docs/design/lesson-plans/S1.md",
    "docs/design/lesson-plans/S2a.md",
    "docs/design/lesson-plans/S2b.md",
    "docs/design/lesson-plans/vocab-S1.tsv",
    "docs/design/lesson-plans/vocab-S2.tsv",
    "docs/design/lesson-plans/vocab-extra.tsv",
    "docs/design/lesson-plans/vocab-post-S2.tsv",
]
# In these files a heading's leading number is the doc's own section number, not a unit id.
SECTION_NUMBERED = {"docs/research/03-mandarin-curriculum-and-materials.md", "docs/design/activity-brainstorm.md"}
TOKEN = re.compile(r"(?<![\w.§])([12])\.(N|C|\d+)([a-e])?(?![\w.]*\d)(?!\s?(?:h\b|x\b|×|%|min\b|hours?\b|lessons\b))")


def new_id(stage, unit):
    if stage == "1":
        if unit == "N":
            return "4"
        if unit.isdigit() and 4 <= int(unit) <= 18:
            return str(int(unit) + 1)
    if stage == "2":
        if unit == "C":
            return "4"
        if unit.isdigit() and 4 <= int(unit) <= 32:
            return str(int(unit) + 1)
    return unit


def main(write):
    total = 0
    for rel in FILES:
        p = REPO / rel
        text = p.read_text(encoding="utf-8")
        changes = []

        def repl(m):
            stage, unit, letter = m.group(1), m.group(2), m.group(3) or ""
            if unit not in ("N", "C") and not unit.isdigit():
                return m.group(0)
            line_start = text.rfind("\n", 0, m.start()) + 1
            if rel in SECTION_NUMBERED and re.fullmatch(r"#+ ", text[line_start:m.start()]):
                return m.group(0)
            out = f"{stage}.{new_id(stage, unit)}{letter}"
            if out != m.group(0):
                a, b = max(0, m.start() - 25), min(len(text), m.end() + 15)
                changes.append(f"  {m.group(0)} -> {out}   …{text[a:b]!r}…")
            return out

        new = TOKEN.sub(repl, text)
        leftover = re.findall(r"\b[12]\.[NC][a-e]?\b", new)
        print(f"{rel}: {len(changes)} changes" + (f"; LEFTOVER placeholders {leftover}" if leftover else ""))
        if "--verbose" in sys.argv:
            print("\n".join(changes))
        total += len(changes)
        if write:
            p.write_text(new, encoding="utf-8", newline="")
    print("total", total, "(written)" if write else "(dry run)")


if __name__ == "__main__":
    main("--write" in sys.argv)
