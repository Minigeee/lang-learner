# Dependency, ordering and skill review (2026-11-03)

This review checks the 189 lesson plans and the vocab placement for four things:
- lessons that rely on something no lesson on their prereq path teaches;
- missing unit prereq edges;
- skills that aren't real, testable skills;
- scheduling problems.

It was prompted by the counting gap: no lesson teaches 0–10, but 1.4a says "The learner already knows 1–10". **Status: approved 2026-11-03 and applied the same day** (see Decisions). Unit and lesson ids on this page and in the findings files are the ones from before the units were renumbered: in S1, units from 1.4 on are now one higher (1.4 → 1.5), and so are S2 units from 2.4 on (2.4 → 2.5). The new units are 1.4 Counting 0–10 and 2.4 Colors.

## Method

1. **Mechanical pre-pass** ([`sandbox/spikes/dependency-check`](../../../../sandbox/spikes/dependency-check/README.md)). Every Chinese word in each plan is compared with where the vocab files place it, using the unit-prereq graph in doc 03 §1.8. The pre-pass is noisy, so reviewers triaged its rows.
2. **One reviewer per stage.** Each one read its plan file in full and checked it against doc 03, the upstream stages and the vocab files. Every finding cites the plan text or a TSV row, and is marked verified or inferred. The per-stage files own the detail; this page only points to them:
   - [S0-findings.md](S0-findings.md)
   - [S1-findings.md](S1-findings.md)
   - [S2a-findings.md](S2a-findings.md)
   - [S2b-findings.md](S2b-findings.md)
3. **Cross-stage pass.** I resolved conflicts between reviewers and spot-checked key claims against doc 03 and the TSVs; all of those checks held. I also ran every proposed edge together through `edges_check.py`. The graph stays acyclic, and every new prereq comes earlier in table order, so the default path is unchanged.

Ground rules (from the user): the skill graph's nodes are units, and fixes are additive. A missing skill becomes a new unit with prereq edges. Existing units aren't reshuffled unless content has to move out of one.

| Stage | Blocker | Major | Minor |
|---|---|---|---|
| S0 | 0 | 9 | 9 |
| S1 | 1 | 9 | 16 |
| S2a | 0 | 9 | 17 |
| S2b | 0 | 11 | 14 |
| **Total** | **1** | **38** | **56** |

## Why gaps like 0–10 got through

1. **Doc 03 lists ideas per unit, not the words they need.** The digits are vocabulary, so no row listed them.
2. **Drafters covered gaps with unverified assumptions:** "already knows 1–10", digit glosses in 0.10b, tone marks never taught, 吗 in 0.12b.
3. **Every earlier review checked each plan on its own terms:** fidelity to the curriculum, Mandarin facts, consistency. None checked that what a lesson relies on is taught on its prereq path.
4. **Vocab placement hid what didn't fit instead of reporting it.** Prep carried a unit's own content, and lesson targets were left in queues.

## Patterns across stages

1. **Asides and interleaves cross units without an edge.** This is the most common cause of missing edges: a lesson's Variety line or Go deeper names a confusable from a unit that isn't on its path, as in 2.8a's 让, 2.17b's 一边…一边 and 2.28c's 有点儿.
2. **Some practices test word identity or decoding, not the skill.** In these lessons C2 or C6 can be passed just by recognizing which word was said, so the skill card reviews what the word cards already review:
   - S2a 2.6b, 2.8b, 2.9b, 2.11d, 2.13c;
   - S2b 2.20c, 2.31c;
   - S1 1.12b, 1.13a.
3. **Vocab tiers drifted from the plans:**
   - lesson targets wait in queues: 一下, 请, 时候, 再, 看起来, 慢慢, 偷;
   - lesson tiers hold words the lesson doesn't use (2.5b, 2.11b), while S1 places 百 and 一点儿 in lessons that never use them;
   - prep words are fed during a checkpoint (prep:2.15, prep:2.32);
   - sense rows are missing (快 "fast", 又 "again", 对 "toward", 还没, 就要);
   - off-list words: 红, 杯, 北京, 左右, 就是.
4. **The format introduction schedules assume table order.** On other valid paths a format appears before its scheduled introduction (S0, S1, S2a). Brainstorm §4.1 already shows the intro "the first time a format appears on the path". The plans' wording just needs to match.
5. **Lesson minutes leave out `main` videos,** against the README Video row. S2b 2.28d is listed at ~6 min but plays 24 min of mains. Unspanned mains add roughly 3–4 h to S2b, in a stage doc 03 already budgets with no slack.

## Proposed additions

### New units (2)

| Unit (working id) | Placed in table order | Prereqs | Lessons and words | Listed as a prereq by |
|---|---|---|---|---|
| **Counting 0–10** (`N`) | before 1.4 | 0.6, 0.13 (0.13 brings in 0.10) | a `les:digits-one-to-five`: 一 二 三 四 五. b `les:digits-six-to-ten-zero`: 六 七 八 九 十 零 (6 words: the closed set stays whole), in digit strings (phone and room numbers); *yāo* as a Go deeper with unscored examples | 1.4, 1.18; S2 gets it through "every S2 unit assumes S1" |
| **Colors** (`C`) | after 2.3 | 1.3 (plus all of S1) | a `les:colors-basic`: 红色 白色 黑色 颜色. b `les:colors-more`: 绿色 蓝 黄色 红 (红 is new to vocab-extra; it isn't an HSK L1–3 entry) | 2.4, 2.10 |

Each unit's full spec (shape, opener, practice, notes) is in S1 Proposed new unit and S2a Proposed prereq edges. No S0 or S2b gap needs a unit.

### New lesson (1)

**0.2d · *er* is one r-colored vowel** (`les:er-final`). Nothing teaches the bare *er* final, yet 1.4c (二 vs 两) and 1.9b (二/日/四) rely on it. Spec: S0 finding 12.

### Unit prereq edges

| Unit | Prereqs now | Proposed | Source |
|---|---|---|---|
| 0.10 | 0.8 | 0.8, 0.9 | S0 #9 |
| 0.11 | 0.5, 0.8 | 0.5, 0.8, 0.10 | S0 #10 |
| 0.14 | 0.1–0.13 (range) | the explicit list 0.1 … 0.13 | S0 #15 |
| 1.1 | 0.9, 0.13 | 0.6, 0.9, 0.13 | S0 #1, S1 #11 |
| 1.3 | 1.1, 0.10 | 1.2, 0.10 | S1 #8 |
| 1.4 | 1.2, 0.10, 0.13 | 1.2, N, 0.10, 0.13 | S1 #1 |
| 1.7 | 1.2, 1.3 | 1.3, 1.5 | S1 #5 |
| 1.10 | 1.8, 1.9 | 1.7, 1.8, 1.9 | S1 #3 |
| 1.14 | 1.10 | 1.10, 1.12 | S1 #6 |
| 1.17 | 1.10, 1.15 | 1.10, 1.13, 1.15 | S1 #7 |
| 1.18 | 1.1–1.17 | all S1 units, including N | S1 #1 |
| 2.4 | 1.17 | 1.17, C | S2a #1 |
| 2.6 | 1.12 | 1.12, 2.2 | S2a #22 (inferred) |
| 2.10 | 1.6 | 1.6, C | S2a #1 |
| 2.16 | 1.3, 1.6 | 1.3, 1.6, 2.8 | S2b #9 |
| 2.17 | 2.16, 2.2 | 2.16, 2.2, 2.4 | S2b #10 |
| 2.20 | 2.3, 2.2 | 2.3, 2.2, 2.11 | S2b #5 |
| 2.21 | 2.3, 2.2 | 2.3, 2.2, 2.20, 2.17 | S2b #1, #2 |
| 2.23 | 2.16 | 2.16, 2.6 | S2b #7 |
| 2.24 | 2.10, 2.23 | 2.10, 2.23, 2.17 | S2b #4 |
| 2.28 | 1.2, 1.5, 1.14 | 1.2, 1.5, 1.14, 2.17 | S2b #8 |
| 2.31 | 1.2, 1.15 | 1.2, 1.15, 2.27 | S2b #3 |

Wherever an edge would have made a cycle, the reviewers chose a vocab or wording fix instead (S1 #4, #9, #10; S0 #8). Where a wording fix was enough, they preferred it to an edge (S2a #9–#12).

## Where reviewers disagreed, or my brief was wrong

- **Counting 0–10 prereqs.** S1 proposed 0.6, 0.10, 0.13, and S0 proposed 0.6, 0.13. They're equivalent, because 0.13's closure includes 0.10, so the table uses the shorter list.
- ***yāo*.** S0 wanted items in lesson b, and S1 wanted a Go deeper only. Resolved as a Go deeper with unscored phone-number examples, since *yāo* has no vocab row to card.
- **Frequency queues.** My brief told the reviewers a queue word is never guaranteed before a lesson. The README actually says a queue finishes by the end of its stage. So the S2 findings about S1-queue words (S2a #3 and #5; S2b #16 and its 15 conditional rows) depend on decision 2 below. Lesson *targets* sitting in a queue are tier misuse either way, and still move.
- **零, 百, 一点儿.** S2b found that the S1 lessons these words are placed in never use them. 零 joins the new counting unit, 百 moves to 2.18a, and 一点儿 moves to 2.16c (S2b #11, #14).

## Decisions (made 2026-11-03)

1. **Display ids for the two new units.** Doc 03 numbers units in table order, so inserting them shifts the display labels: 1.4–1.18 become 1.5–1.19, and 2.4–2.32 become 2.5–2.33. The `les:` slugs don't change, but every `place` value in the vocab TSVs and every cross-reference in the plans uses display ids. Options:
   - renumber with a script that rewrites the TSVs and plan references together;
   - use interim ids (`1.3x`, `2.3x`) until authoring.

   **Decided:** renumber with a script.
2. **Is the S1 queue part of "every S2 unit assumes S1"?** If yes, the README says so, the S2 scheduler waits for the S1 queue (or for known words that cover it), and no S1-queue words move. If no, 到 找 听 穿 开 住 再 睡 见 唱 become prep or lesson rows ahead of their S2 uses. A learner who tests out of S1 at 1.18 is the case to decide for. **Decided:** yes. S2a #3 and #5 and S2b #16 aren't applied.
3. **How lesson minutes count `main` videos:** the span the lesson plays, or the full length. Each unspanned main needs a span or its full length counted, and S2's budget needs to absorb the result. **Decided:** main videos play in full, and Min counts the whole video.
4. **0.2d.** Add the lesson, or reword S0's outcome to "S0's contrasts" and leave *er* to 1.9b. **Decided:** add 0.2d.

## Applying it

Once the decisions are made, apply in this order. Each step is checkable on its own.

1. **Doc 03:** add the new unit rows, make the prereq edits above, and update the stage lesson counts.
2. **Plans:**
   - add the new units' sections and 0.2d;
   - apply the wording and skill-sanity fixes in each findings file, as written there: S0 #2–8 and #11–18; S1 #1, #9 and #12–25; S2a #6–14 and #16–23; S2b #6 and #17–25;
   - update the format-schedule lines and the minutes.
3. **Vocab TSVs:** apply the vocab moves in each findings file, including S1 #2, #4, #9, #10 and #13–15, S2a #1, #2, #4 and #10–25, and S2b #2, #6 and #11–15. Use the S2a #3 and S2b #16 moves only if decision 2 is "no". Then rerun the placement checks:
   - each word is placed once;
   - lessons stay within 5 words, except the 0–10 set;
   - no prep is fed during a checkpoint;
   - prep is fed on the path, before `needed_by`.
4. **Recheck:** rerun `deps.py` and `edges_check.py`. Expect only noise rows to remain.
5. **Standing check:** add "every lesson's targets are in its own tier, and everything its items rely on is available on its prereq path" to the brainstorm §4.5 unit checks. This makes the review's core rule a check every future plan edit has to pass.
