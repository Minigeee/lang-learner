# Dependency check (spike)

This is the mechanical pre-pass behind the [2026-11-03 dependency review](../../../docs/design/lesson-plans/review-2026-11-03/README.md).

- `deps.py` writes `deps-report/`, which is gitignored:
  - `word-deps.tsv`: every Chinese word in a lesson plan's text that isn't available on that lesson's unit-prereq path, sits only in a frequency queue, or is in no vocab file;
  - `lessons.tsv`;
  - `summary.json`.

- `check_vocab.py`: placement checks on the vocab TSVs (listed in its docstring).
- `renumber.py`: the one-off that renumbered units into table order after inserting Counting 0–10 and Colors (2026-11-03).

Run the checks from this folder: `python -I -X utf8 deps.py`, then `python -I -X utf8 check_vocab.py`.

`word-deps.tsv` is a candidate list, not a verdict: plans mention words in asides, contrasts and previews, and greedy segmentation splits some phrases. The reviewers found roughly a third of the rows real. Once lessons are authored as real items, the same check runs on item text and becomes precise. That version belongs in the compile checks ("lesson order respects item prerequisites", architecture).

