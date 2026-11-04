# Review load (spike)

This spike estimates daily SRS review minutes across S0–S2 and a post-S2 stretch. It's a Monte Carlo run with FSRS-4.5's default parameters; `sim.py`'s docstring lists the model, assumptions and arguments.

Card counts are as of 2026-11-03:
- **Word cards:** vocab-S1 449 (vocab-S1.tsv plus vocab-extra's S1 rows), vocab-S2 952 (vocab-S2.tsv plus vocab-extra's S2 rows), and post-S2 208.
- **Skill cards:** one per lesson, excluding checkpoints and 0.13a.

Stage lengths come from doc 03: S0 is 14 days, S1 56 and S2 91.

| Retention | Sec/review (word, skill) | S1 min/day | S2 min/day (peak) | Post-S2 min/day |
|---|---|---|---|---|
| 0.90 | 10, 15 | 3.8 | 7.9 (9.4) | 6.7 |
| 0.90 | 15, 20 | 5.5 | 11.6 (13.9) | 9.9 |
| 0.95 | 10, 15 | 6.2 | 12.0 (14.9) | 10.8 |
| 0.95 | 15, 20 | 9.1 | 17.8 (22.0) | 15.9 |

The simulated learner forgets exactly as the default model predicts. Real beginners usually lapse more on new words, so plan with the upper rows.

## Paced by lesson time (`--pace=30`)

Here each stage lasts as long as its lessons take at 30 lesson-minutes a day, which is 25% of the user's ~2 h day: S0 9 days, S1 14 and S2 31. The post-S2 stretch is 60 days. Queue words have no lesson, so their first study happens in the SRS; that adds about 20 s per word, which `sim.py` doesn't count:

| Stage | New cards/day | Reviews h (10/15 s → 15/20 s) | Queue first-study h | SRS min/day |
|---|---|---|---|---|
| S0 | 3 | 0.1 | 0 | ~1 |
| S1 | 36 | 1.5 → 2.3 | 1.1 (196 words) | 11 → 15 |
| S2 | 34 | 7.9 → 11.6 | 2.2 (398 words) | 20 → 27 (peak 22 → 30) |
| post-S2 (60 days) | 7 | 10.7 → 15.8 | 1.2 (208 words) | 12 → 17 |
