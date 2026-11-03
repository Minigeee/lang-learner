# 02 · SRS algorithms

Which scheduling algorithm should we use, and how do we avoid review pile-ups after missed days?

Researched 2026-11-02.

## TL;DR

- **Use FSRS through `ts-fsrs` (MIT).** FSRS is the most accurate open scheduler in the largest public benchmark: about 10k Anki users and ~727M reviews [1] (verified). Next best are HLR (Duolingo) and SM-17 (proprietary), and both are clearly worse [1][7] (verified).
- **FSRS-7 is brand new.** `ts-fsrs` v6.0.0 shipped on 2026-10-28 with FSRS-7 as the default. FSRS-6 is still selectable [3] (verified). Official Anki was still on FSRS-6 as of mid-2026 [20] (reported). We start with complete review history, so FSRS-7 is safe for us. Still, we should pin the version and keep the model choice in config.
- **Most of the backlog problem is a queue-policy problem, not an algorithm problem.** FSRS already handles late reviews correctly. It uses real elapsed time, and a recall at lower retrievability earns a *bigger* stability boost [6] (verified). So we never need to "repair" overdue cards. We only need to decide which ones to show today.
- **Cap the reviews, sort by retrievability descending, and carry over the rest silently.** Under a daily cap, "retrievability descending" keeps retention steady for the least study time, even if the backlog never fully clears [18][19] (reported: community simulations from the FSRS authors). Anki calls this the better choice when you have a backlog [14] (verified).
- **Gate new cards on the backlog.** If any due reviews are carried over, show zero new cards. Otherwise, new cards only use whatever room is left under the cap.
- **No "vacation mode" that freezes timers.** In WaniKani and Bunpro you have to turn it on beforehand, people forget, and it misleads the memory model [21][24][25] (reported). With FSRS, the absence is just elapsed time, and the capped queue takes care of the rest.
- **Load-balance new due dates.** That way, cards reviewed together during catch-up don't all come back on the same day. Copy Anki's approach: a weighted pick inside the fuzz window [15][16] (verified).
- **Default desired retention: 0.90.** Expose a range of 0.80–0.95. On FSRS's forgetting curve, 0.95 roughly halves intervals compared with 0.90 (own calculation from [6]).
- **Store every review log, fully and permanently.** That history lets us re-optimize parameters, switch FSRS-6 ↔ FSRS-7 by replaying it, and simulate policies.

## Findings

### 1. Algorithm survey

| Algorithm | Model | Inputs → outputs | Benchmark (log loss ↓ / RMSE(bins) ↓) | Complexity | License |
|---|---|---|---|---|---|
| **Leitner** (1972) | Boxes; a right answer moves the card up a box (interval roughly doubles), a wrong answer moves it down | right/wrong → box → fixed interval | Not in the current table. HLR beat it on MAE by ≥45% on Duolingo data [8] | Trivial | Public domain idea |
| **SM-2** (1987/1990) | One ease factor (EF ≥ 1.3) per card. I(1)=1, I(2)=6, I(n)=I(n−1)·EF [10] | grade 0–5 → EF, interval | Not in the current table | Trivial | Free to implement. Anki's code is AGPL [15] |
| **Anki SM-2** | SM-2 with 4 buttons, configurable learning steps, and an Easy bonus. Again −20% ease, Hard −15%, Easy +15% [12] | 4 grades → ease, interval | Not in the current table | Low | AGPL (Anki code) |
| **SM-17 / SM-18** (2015 / 2019) | Two-component (later DSR) memory model. Stability increase SInc[D,S,R] comes from a data matrix. SM-18 simplified the difficulty estimate [11] | Full history → S, R, D → interval | SM-17: 0.432 vs FSRS-6 0.367 on 19 SuperMemo users [7] | High | Proprietary (SuperMemo World) [11] |
| **HLR** (Duolingo, 2016) | p = 2^(−Δ/h), with h = 2^(θ·x) regressed on features such as right/wrong counts and lexeme tags [8] | Feature vector + lag → recall probability | 0.4694 / 0.1275 [1] | Low–medium. Needs population training | Paper. Reference code and data are MIT [9] |
| **Ebisu v2** | Bayesian Beta prior on recall | history → posterior recall | 0.4989 / 0.1627 [1] | Low | Open source (reported) |
| **FSRS-6** | DSR model with a power forgetting curve and a trainable decay. 21 parameters [6] | 4 grades + elapsed time → D, S → R(t) → interval for target retention | 0.3460 / 0.0653 [1] | Low to run. Optimizer exists | MIT (ts-fsrs), BSD-3 (fsrs-rs) [2][5] |
| **FSRS-7** | Two memory traces (`stability`, `stabilityFast`), fractional-day intervals, realistic same-day predictions. 34 parameters [1][3][29] | Same as FSRS-6, plus same-day reviews | 0.3401 / 0.0634 optimized. 0.3620 / 0.0910 with default parameters [1] | Low to run. Forgetting curve is more complex | MIT (ts-fsrs v6) [3] |
| **Neural (GRU, LSTM, RWKV)** | Sequence models over review history | history → p(recall) | RWKV-Instant 0.2773, GRU 0.3328 [1] | High. RWKV has ~2.7M parameters | Research only |

Notes:

- **SM-2's weakness is structural, not a tuning issue.** Interval growth depends only on the ease factor, and late reviews barely count. Anki's variant does factor lateness into the next interval [12] (verified). Nothing in SM-2 predicts recall probability, though, so it can't rank a backlog by how likely each card is to be forgotten.
- **SM-17/18 are the conceptual ancestors of FSRS.** The SInc[D,S,R] idea, where stability grows more when a review happens at lower R, comes from them [11] (verified). But they're closed. In the only head-to-head (19 users), FSRS-6 beat SM-17 on 83% of collections [7] (verified, small sample).
- **HLR was a big practical win for Duolingo.** It improved daily student engagement by 12% in production [8] (verified). It needs population-level training, and it's well behind FSRS on per-user prediction [1]. Duolingo's current production stack ("Birdbrain") is not publicly specified [30] (reported).
- **Two caveats on the leaderboard.** Neural models top it, but they're impractical for us. And the zero-parameter MOVING-AVG baseline (0.3369) out-scores FSRS-6 on log loss [1]. It models no time-dependent forgetting curve, so it can't schedule. Log loss alone doesn't make a scheduler.
- **For a new user, default-parameter accuracy matters most.** FSRS-7 with defaults (0.3620) is still far better than HLR or Ebisu [1] (verified). The benchmark doesn't publish a default-parameter row for FSRS-6.

### 2. The backlog problem

#### 2.1 Why SM-2 creates "ease hell" and pile-ups

- **Ease only goes down unless you press Easy.** Again costs 20 points of ease and Hard costs 15, while Good leaves ease unchanged [12] (verified). With a 130% floor [10], cards that were hard once stay on short intervals permanently. Users call this "ease hell." Anki's FAQ calls the failure mode "low interval hell" [12] (verified).
- **Cards fall due in calendar-driven clumps.** Missing a week dumps every card due that week into one undifferentiated pile. The default sort is "due date, then random" [13] (verified). That order puts the most overdue cards first, which are mostly the ones you've likely already forgotten.
- **Catching up re-clumps the schedule.** Reviewing 500 cards on one day schedules them on similar future days, so the pile comes back. Fuzz and load balancing exist to fix exactly this [14][16] (verified).

#### 2.2 How FSRS treats overdue cards

- **Retrievability is a continuous function of elapsed time.** In FSRS-6, R(t,S) = (1 + factor·t/S)^(−w20), with R(S,S) = 0.9 [6] (verified). An overdue card just has a lower R. Nothing special happens to it.
- **A late success is rewarded.** "The smaller the value of R, the larger the SInc value" [6] (verified). Remembering a card after a long gap grows stability more than an on-time review would.
- **A late failure is punished less.** Post-lapse stability includes an e^(w14·(1−R)) term [6] (verified). Forgetting something you hadn't seen in a long time counts against it less than forgetting it on time.
- **The damage from a week off is very uneven.** Here is an illustration using the FSRS-4.5/5 curve (decay 0.5) for a card that was due at R = 0.90 (own calculation from [6]):

  | Stability S | R after 7 extra days | R after 30 extra days |
  |---|---|---|
  | 1 day | 0.59 | 0.35 |
  | 3 days | 0.75 | 0.53 |
  | 10 days | 0.85 | 0.72 |
  | 30 days | 0.88 | 0.83 |
  | 100 days | 0.89 | 0.88 |

  Mature cards barely notice a week off. Young cards lose a lot. A queue sorted by due date can't tell the two apart, but one sorted by R can.

#### 2.3 Which overdue cards to show first

- **The orders Anki offers.** They include "due date, then random", "ascending intervals", and "relative overdueness". Relative overdueness shows the cards you're most likely to have forgotten first, and Anki recommends it for large backlogs [13]. With FSRS it becomes "ascending retrievability" [13] (verified).
- **Descending retrievability came later, and the release notes favor it.** Anki 24.11 added it, saying "Simulations have shown this is a better choice" with a backlog [14] (verified).
- **The evidence comes from FSRS's own simulations.** Expertium summarized Jarrett Ye's simulations (review-sort-order-comparison repo) in 2024 [18] (reported; the result tables are images we couldn't read):
  - "If the user can do literally any number of reviews per day, the order doesn't matter."
  - With a daily limit, R-descending is best for least study time, and it keeps retention constant *even if the user never clears the backlog*.
- **Why it works.** High-R cards are cheap to keep and still recoverable. Low-R cards are probably already forgotten, so they cost about the same to relearn tomorrow [19] (reported).
- **Not yet Anki's default.** Making R-descending the default is still open as issue #3460, last moved in June 2026 [19] (verified). The holdups are interleaving concerns and the many users who "run with a permanent backlog."
- **A promising variant.** Potential Retrievability Loss is PRL = R(today) − R(tomorrow) [18]. Sorting by PRL + 0.09·R reportedly beat plain R-descending in one small simulation [18] (reported, unverified).
- **What this means for us.** R-descending is the evidence-backed default. Since all due cards have R ≤ desired retention, it naturally serves the "just became due" cards first. It also triages the long-gone ones last. The cost is that very low-R cards can starve under a permanent backlog. Section 4 addresses that.

#### 2.4 Caps, fuzz, load balancing, easy days

- **Daily caps.** Anki has per-deck review and new limits. "New cards ignore review limit" is a toggle [13] (verified).
  - HanziHero's cap is a soft target. The Reviews button grays out at the limit but you can start another capped session [21] (verified).
  - Skritter has a goal mode ("chip away at the due queue 100 items a day"). Its continuous mode hides the due count [23] (verified: staff post).
- **Fuzz.** Anki fuzzes intervals from 2.5 days up: ±15% for 2.5–7 days, ±10% for 7–20 days, and ±5% above 20 days [15] (verified). `ts-fsrs` has optional fuzz middleware, seeded by `cardId + reps` [3] (verified).
- **Load balancer** (Anki 24.11). "Within your fuzz range, Anki will now try to pick days that have fewer reviews waiting" [14]. The code is concrete [16] (verified):
  - Each candidate day gets the weight `(1/count)^2.15 · (1/interval)^3 · sibling_mod · easy_day_mod`, and the day is picked by seeded weighted random choice.
  - Days near a sibling get multipliers of 1e-6, 0.2, 0.4, 0.6, 0.8, 1.0 at 0–5 days away.
  - Balancing is skipped for intervals over 90 days.
- **Easy days.** You mark weekdays as Normal, Reduced, or Minimum, and intervals shift away from the lighter days. Setting every day to Reduced is the same as every day Normal [13][16] (verified). It only affects future intervals.

#### 2.5 Vacation mode, postpone, spreading

- **Freeze-style vacation mode (WaniKani, Bunpro, HanziHero).** It pauses SRS timers, so reviews don't pile up [22][24][25] (reported).
  - Its failure mode is the one our user fears. HanziHero's own docs say it's "quite easy to forget to set it" and you end up with "1k+ reviews" [21] (verified).
  - Users also report bugs and confusion on exit (lost or doubled reviews) [24][25] (reported).
  - Conceptually, freezing timers tells the model no time passed when memory actually decayed. That's fine for fixed-ladder SRS, but wrong for FSRS.
- **FSRS Helper (Anki add-on)** [17] (verified):
  - *Postpone* lengthens today's due intervals while keeping "deviation from the original review schedule … minimal."
  - *Schedule a Break* spreads the break's cards over follow-up days. It warns that it "will reduce future memory retention rates."
  - *Flatten* pushes cards beyond a daily limit to later days.
  - *Advance* reviews ahead before a break.
- **Migaku Vacation (Anki add-on).** It evens out daily counts and has a "Sick Day" feature for *unplanned* days off [26] (reported; third-party-hosted docs).
- **Skritter's stance.** It doesn't artificially shrink the count: "that's how memory works." Instead, it gives tools to cope (goal mode, hiding the count). For very long breaks, it even suggests starting over [23] (verified).

**What works:**

1. Never show the full debt.
2. Use a fixed daily cap, ordered by expected value (R-descending).
3. Stop new cards until caught up.
4. Spread future due dates with load balancing so the catch-up doesn't re-clump.

Physically rewriting due dates (Postpone/Flatten) isn't needed if the queue builder already caps and orders by R. It only changes what the "due" number says.

#### 2.6 Desired retention and workload

- **Anki's guidance.** The default is 0.90. "As desired retention approaches 100%, the workload increases drastically." Stay below 0.97 [13] (verified).
- **Optimal-retention feature removed.** Anki's "compute minimum recommended retention" was removed in 25.07, and the workload simulator remains [13] (verified).
- **Rough interval sizes.** On the FSRS-5 curve, the interval relative to stability is (own calculation from [6]):
  - 0.80 → 2.40·S
  - 0.85 → 1.64·S
  - 0.90 → 1.00·S
  - 0.95 → 0.46·S
  - 0.97 → 0.27·S

  Going from 0.90 to 0.85 lengthens intervals by about 64%. The workload change is smaller than that because more lapses get added back.
- **Relevance to the backlog.** Desired retention is the biggest single workload lever. A user who regularly misses days is better served by 0.85–0.90 than by 0.95.

### 3. Card types for Mandarin and scheduling interactions

| Card type | Front → back | Scheduling notes |
|---|---|---|
| Sentence recognition (Refold "mined" sentence) | Native sentence with target word highlighted → meaning, pinyin, native audio | Primary card. One per mined word |
| Audio-only listening | Native audio clip → transcript and meaning | Ear-training stage. Much harder than reading, so it needs its own parameter preset |
| Word/character recognition | 汉字 → pinyin + meaning | Cheap, high volume |
| Production | English/context → 汉字 or pinyin | Optional and later. Mark as a sibling of the recognition card |
| Tone / pinyin perception | Audio syllable or tone pair → tones | A perceptual drill more than a memory item. Better as a separate drill mode outside FSRS, or as a separate preset |

- **Siblings interfere.** Seeing 你好 → "hello" primes "hello" → 你好. Anki buries siblings: the same note's other cards wait until the next day [13] (verified). Its load balancer also pushes siblings ±5 days apart [16] (verified), and FSRS Helper has "Disperse Siblings" [17] (verified). We should bury siblings for the day and add a sibling penalty in load balancing.
- **Optimize separately per card type.** Anki optimizes FSRS parameters per preset [13]. Listening and reading cards have very different difficulty, so each card type should get its own parameter set once it has enough reviews. Until then, use the global or default set. The usable threshold is unclear: older Anki required 1,000 reviews, and current guidance reportedly has no hard minimum [28] (reported).
- **Refold implies recognition cards dominate.** Production cards are optional. This should be checked against doc 01 (reported).

### 4. Recommendation

**Algorithm: FSRS-7 via `ts-fsrs` v6, with FSRS-6 as a config fallback.**

- **Library.** `ts-fsrs` is MIT, part of the open-spaced-repetition org, and has 849 stars [2] (verified).
  - It's actively maintained, with releases in May, Sept, and Oct 2026 [3] (verified).
  - It needs Node ≥ 24 [2][3] (verified).
  - It has an optimizer package, `@open-spaced-repetition/binding`. Its v0.6.0 added a threadless WASM build for "browser Workers and Cloudflare" [3] (verified).
- **API shape** [2][3][4] (verified):

  ```ts
  const scheduler = await DefaultScheduler({ desiredRetention: 0.9 /*, version: 'FSRS-6', enableFuzz: true */ })
  const card = scheduler.newCard({ cardId, now })
  const options = scheduler.preview({ card, now })              // [{ grade, card, revlog }] per grade
  const { card: next, revlog } = scheduler.review({ card, grade: Rating.Good, now })
  scheduler.retrievability(...)   // or scheduler.model.forgettingCurve(memoryState, elapsedDays)
  scheduler.rollback(...); scheduler.forget(...)
  ```

  - The card fields are `cardId, stability, stabilityFast, difficulty, dueAt, lastReviewAt, reps, lapses, scheduledDays, learningStep, state, scheduleStatus` [4].
  - `review()` doesn't mutate its input. "Save both `result.card` and `result.revlog`" [2].
- **Migration caveats** [3] (verified):
  - Don't reuse FSRS-6 weights for FSRS-7.
  - Don't invent `stabilityFast`.
  - `Reschedule.replay()` rebuilds memory state from full history.

  This is why we must keep complete review logs from day one.
- **Why not FSRS-6?** FSRS-6 is the conservative choice. It's battle-tested in Anki, has a simpler curve, and its R is easy to compute in SQL. FSRS-7 is more accurate [1] and handles same-day reviews natively. That suits us, since learning steps and short-term reviews will be common early on. v6.0.0 is five days old, though. Pin the exact version, and if it misbehaves, replay the history into FSRS-6.

**Return-after-absence policy.** There is no vacation mode. Due dates are never rewritten for backlog reasons. The queue builder does all the work.

```ts
// Defaults (all user-tunable; validate with a simulator before shipping numbers)
const P = {
  dayStartHour: 4,            // study day boundary, user's local tz
  desiredRetention: 0.90,
  reviewCap: 100,             // review cards/day (or derive from a minutes budget × median sec/card)
  newPerDay: 10,
  newCostInReviews: 8,        // heuristic: future load per new card while it matures
  retentionFloor: 0.80,       // 7-day true retention below this halves new cards
  returnGapDays: 2,           // ≥ this many missed study days ⇒ "welcome back" mode
  tailShare: 0.15,            // share of the cap reserved for lowest-R cards (anti-starvation)
}

function buildQueue(user, now): Queue {
  const doneToday = countReviewsSince(startOfStudyDay(now))

  // 1. Intraday (re)learning cards: always first; they're few and time-sensitive.
  const learning = cards.where(state in [Learning, Relearning], dueAt <= now)

  // 2. Review candidates due by end of the study day.
  const due = cards.where(state == Review, dueAt < endOfStudyDay(now), !suspended, !buriedToday)
  for (const c of due) c.r = scheduler.retrievability(c, now)

  // 3. Pick within the cap: mostly R-descending, small tail of lowest-R so nothing starves forever.
  const budget = max(0, P.reviewCap - doneToday - learning.length)
  const byRdesc = [...due].sort((a, b) => b.r - a.r || a.stability - b.stability)
  const tailN = due.length > budget ? floor(budget * P.tailShare) : 0
  const tail = byRdesc.slice(-tailN)                         // lowest R
  const head = byRdesc.slice(0, budget - tailN)
  const reviews = buryAndDedupeSiblings([...head, ...tail])  // ≤1 card per note per day
  const carriedOver = due.length - reviews.length            // NOT shown as a number

  // 4. New-card gate.
  let newQuota = max(0, P.newPerDay - newDoneToday)
  if (carriedOver > 0) newQuota = 0                          // behind ⇒ no new cards
  else {
    const headroom = P.reviewCap - (doneToday + learning.length + reviews.length)
    newQuota = min(newQuota, floor(max(0, headroom) / P.newCostInReviews))
  }
  if (trueRetention(last7Days) < P.retentionFloor) newQuota = floor(newQuota / 2)
  if (daysSince(lastStudyDay) >= P.returnGapDays && carriedOver > 0) mode = 'welcome-back'

  return interleave(learning, reviews, takeNew(newQuota))    // mix card types; siblings buried
}

// After each answer: normal FSRS review (uses real elapsed time; no special overdue handling),
// then pick the due day inside the fuzz window with Anki-style load balancing:
function chooseDueDay(baseInterval, noteId): Day {
  if (baseInterval < 2.5 || baseInterval > 90) return fuzzOnly(baseInterval)
  const [lo, hi] = fuzzBounds(baseInterval)                  // ±15% / ±10% / ±5%
  return weightedPick(range(lo, hi), d =>
    (dueCount(d) === 0 ? 1 : (1 / dueCount(d)) ** 2.15) * (1 / d) ** 3 * siblingMod(noteId, d) * easyDayMod(d))
}
```

**UX rules that go with it:**

- Show "Today: 100 reviews (~18 min)", never "1,043 due."
- In welcome-back mode:
  - Show a catch-up ETA: `ceil(carriedOver / (reviewCap − forecastSteadyLoad))` days.
  - If the cap doesn't exceed the steady load, say so. Then offer a higher cap or a temporary drop to desired retention 0.85.
- After the cap, show a "Done for today" screen with an opt-in "do 20 more" button, the same pattern as HanziHero [21].

### 5. Data model sketch (Postgres/Supabase)

```sql
cards (
  id uuid pk,                -- stable cardId (also fuzz seed)
  user_id uuid, note_id uuid, -- note = sibling group (one word/sentence)
  card_type text,            -- 'sentence_recog' | 'listening' | 'word_recog' | 'production' | ...
  state smallint, schedule_status text, learning_step int,
  due_at timestamptz, last_review_at timestamptz,
  stability double precision, stability_fast double precision, difficulty double precision,
  reps int, lapses int, scheduled_days double precision,
  model_version text,        -- 'FSRS-7'; params_id uuid -> fsrs_params
  suspended bool, buried_until date, created_at timestamptz
)
-- index (user_id, state, due_at)

review_logs (                -- append-only; never delete (needed for optimize/replay)
  id uuid pk, card_id uuid, user_id uuid,
  reviewed_at timestamptz,   -- UTC ms precision
  rating smallint,           -- 1..4
  duration_ms int,
  state_before smallint, state_after smallint,
  stability_before/after, stability_fast_before/after, difficulty_before/after double precision,
  due_before timestamptz, scheduled_days_after double precision,
  r_at_review double precision,  -- predicted R (for calibration / true-retention stats)
  model_version text, params_id uuid, desired_retention real,
  queue_reason text,         -- 'due' | 'tail' | 'learning' | 'new' | 'extra' (for policy analysis)
  client_tz text, day_start_hour smallint,
  undone bool default false
)

fsrs_params (id, user_id, card_type null, model_version, weights jsonb, trained_on_reviews int, created_at)
user_srs_settings (user_id, desired_retention, review_cap, new_per_day, day_start_hour, timezone, easy_days jsonb)
```

The optimizer needs at least `card_id`, `review_time` (UTC ms), and `review_rating`. It can also use `review_state`, `review_duration`, `timezone`, and `day_start` [27] (verified). The before/after snapshots and `r_at_review` aren't needed by FSRS. We store them for cheap stats, audits, and policy simulation.

## Implications for the app

- **MUST** use FSRS via `ts-fsrs` v6 with the exact version pinned. Keep `model_version` (FSRS-7 default, FSRS-6 fallback) as config, not code.
- **MUST** persist every review in an append-only `review_logs` table, with UTC timestamps, rating, duration, and timezone/day-start. Never hard-delete logs, because re-optimization and FSRS-6 ↔ 7 replay depend on them [3][27].
- **MUST** build the daily queue with a review cap, R-descending order, sibling burying, and carried-over cards hidden from the headline count.
- **MUST** set new cards to zero whenever reviews are carried over, and otherwise limit them to the headroom under the cap.
- **MUST NOT** implement a timer-freezing vacation mode, and must not rewrite due dates to hide a backlog.
- **SHOULD** load-balance due dates inside the fuzz window using Anki's weighting, including the sibling penalty [16].
- **SHOULD** default desired retention to 0.90, allow 0.80–0.95, and show estimated minutes per day next to the setting.
- **SHOULD** keep separate FSRS parameter sets per card type (listening vs reading). Fall back to defaults until there's enough data, and re-optimize periodically. The WASM binding can do this in a Worker or edge function [3].
- **SHOULD** build a small offline simulator (ts-fsrs plus synthetic or our own logs) to tune `reviewCap`, `tailShare`, and `newCostInReviews` before trusting the defaults.
- **COULD** offer a "catch-up retention" toggle: temporarily treat cards as due only when R < 0.85, which shrinks the queue instantly with no rewrites.
- **COULD** add easy days (lighter weekends) and an "advance before a trip" action.
- **COULD** try PRL-based ordering in the simulator [18].

## Open questions

- **User decision.** Should the review cap be a card count or a time budget (minutes per day)? A time budget fits bedtime/phone use better.
- **User decision.** 2-button (Again/Good) or 4-button grading? FSRS supports both. Two buttons are simpler on a phone and avoid Hard misuse [17].
- **FSRS-7 vs FSRS-6 at launch.** FSRS-7 is newer and more accurate, but only days old in ts-fsrs. Either way, R in SQL is hard: FSRS-7's forgetting curve has eight parameters and a "rather complex formula" [1]. So should R be computed in TypeScript (client or edge function) rather than in Postgres?
- **Runtime compatibility.** Do `ts-fsrs` v6 and the binding run in Supabase Edge Functions (Deno)? The library declares Node ≥ 24. Untested.
- **Unvalidated numbers.** The anti-starvation tail share (15%) and the new-card cost (8) are our heuristics, not tested in any simulation. Simulate them.
- **Tone drills.** Should they use SRS at all, or a separate perceptual-training mode? This depends on doc 03 (Mandarin curriculum).

## Sources

1. [open-spaced-repetition/srs-benchmark](https://github.com/open-spaced-repetition/srs-benchmark): log loss/RMSE for FSRS-6/7, HLR, Ebisu, DASH, GRU, RWKV; dataset size; FSRS-7 description.
2. [ts-fsrs repo and package README](https://github.com/open-spaced-repetition/ts-fsrs): MIT, `DefaultScheduler` API, Node ≥ 24, options.
3. [ts-fsrs v6.0.0 release (2026-10-28) and releases list](https://github.com/open-spaced-repetition/ts-fsrs/releases/tag/v6.0.0): FSRS-7 default, migration rules, `stabilityFast`, fuzz seeding, binding WASM build.
4. [ts-fsrs docs site](https://open-spaced-repetition.github.io/ts-fsrs/): Card and revlog fields, `preview`/`rollback`.
5. [open-spaced-repetition/fsrs-rs](https://github.com/open-spaced-repetition/fsrs-rs): BSD-3, FSRS-6/7, Node/Python bindings.
6. [FSRS algorithm wiki (awesome-fsrs)](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm): FSRS-6 forgetting curve, SInc vs R, post-lapse formula.
7. [fsrs-vs-sm17](https://github.com/open-spaced-repetition/fsrs-vs-sm17): FSRS-6 vs SM-17/SM-16 on 19 SuperMemo users.
8. [Settles & Meeder 2016, "A Trainable Spaced Repetition Model for Language Learning", ACL](https://aclanthology.org/P16-1174.pdf): HLR formula, ≥45% MAE reduction, +12% engagement.
9. [duolingo/halflife-regression](https://github.com/duolingo/halflife-regression): MIT code, 13M-trace dataset.
10. [Wozniak 1990, SM-2 description](https://super-memory.com/english/ol/sm2.htm): SM-2 formulas, EF floor 1.3.
11. [SuperMemo Guru: Algorithm SM-17](https://supermemo.guru/wiki/Algorithm_SM-17): two-component/DSR model, SInc[D,S,R], SM-18 difficulty, licensing.
12. [Anki FAQ: What spaced repetition algorithm does Anki use?](https://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm): Anki SM-2 ease rules, low interval hell, FSRS overview.
13. [Anki manual: Deck options](https://docs.ankiweb.net/deck-options.html): sort orders, limits, burying, easy days, desired retention, simulator, CMRR removal.
14. [Anki 24.11 release notes](https://github.com/ankitects/anki/releases/tag/24.11): load balancer, easy days, descending retrievability for backlogs.
15. [Anki `fuzz.rs`](https://github.com/ankitects/anki/blob/main/rslib/src/scheduler/states/fuzz.rs): fuzz ranges; AGPL.
16. [Anki `load_balancer.rs`](https://github.com/ankitects/anki/blob/main/rslib/src/scheduler/states/load_balancer.rs): weighting formula, sibling and easy-day modifiers, 90-day limit.
17. [fsrs4anki-helper](https://github.com/open-spaced-repetition/fsrs4anki-helper): Postpone, Advance, Schedule a Break, Flatten, Disperse Siblings.
18. [Anki forum: "Improving sort orders" (Expertium, Sept 2024)](https://forums.ankiweb.net/t/improving-sort-orders/50081): R-descending is best under limits; PRL; dae's response.
19. [Anki issue #3460](https://github.com/ankitects/anki/issues/3460): proposal to make descending R the default; still open, June 2026.
20. [Anki forum: "When will Anki integrate FSRS-7?" (June 2026)](https://forums.ankiweb.net/t/when-will-anki-integrate-fsrs-7/69997): FSRS-7 not in official Anki then.
21. [HanziHero: Daily review limit](https://hanzihero.com/docs/review-limit): soft cap; "easy to forget" vacation mode; 1k+ reviews.
22. [HanziHero: Vacation mode](https://hanzihero.com/docs/vacation-mode): suspend-all vacation mode.
23. [Skritter forum: How to use Skritter after a break](https://forum.skritter.com/t/how-to-use-skritter-after-a-break/3485/22): goal mode, continuous mode, staff stance.
24. [WaniKani community: What exactly does Vacation Mode do?](https://community.wanikani.com/t/what-exactly-does-vacation-mode-do/31147) and [My cautionary tale about Vacation Mode](https://community.wanikani.com/t/my-cautionary-tale-about-vacation-mode/31755): timer-freeze behavior, post-break backlogs (user reports).
25. [Bunpro community: How does the vacation mode work?](https://community.bunpro.jp/t/how-does-the-vacation-mode-works/66940): freeze semantics, exit bugs (user reports).
26. [Migaku Vacation user guide (preview host)](https://deploy-preview-148--tourmaline-brigadeiros-5c144c.netlify.app/tools-guides/migaku-vacation/guide): even counts, Sick Day feature.
27. [open-spaced-repetition/fsrs-optimizer](https://github.com/open-spaced-repetition/fsrs-optimizer): required revlog columns, UTC, timezone/day_start.
28. [Anki forum: How many reviews for accurate optimization?](https://forums.ankiweb.net/t/how-many-reviews-for-accurate-optimization/53320): review thresholds for optimization (community).
29. [haskell-fsrs 7.0.0](https://hackage-content.haskell.org/package/haskell-fsrs): third-party description of FSRS-7 (34 weights, dual trace, difficulty-dependent curve).
30. [Duolingo blog: How we learn how you learn](https://blog.duolingo.com/how-we-learn-how-you-learn): Duolingo personalization overview (not fetched; reported).
