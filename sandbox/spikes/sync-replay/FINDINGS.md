# Spike: event-log sync and SRS replay

Is the event-log sync and SRS-replay design in `docs/design/architecture.html` (rev 2.1, §5–§6) correct and fast enough for a phone and a laptop used every day?

Run on 2026-11-02. Node 24.19, `ts-fsrs` **6.0.0** (pinned exactly; it is the current release, published 2026-10-28), fast-check 4.10.2, vitest 4.1.0. The server is simulated in memory. The subagent wrote this report; the orchestrator saved it, because subagents can't write report files in this harness.

## Verdict

- **The core idea holds.** Fold everything from one append-only log, order by `(occurred_at, id)`, use deterministic card ids, and make pushes idempotent. With the fixes below, 10,000 random two-device runs per property converged, with no counterexample. The runs covered offline windows, late syncs, ±2 min clock skew and skew changes, lost acks, duplicate pushes, voids and concurrent reviews of the same card. After a full sync, both devices held the same log and derived the same card states, mastery, lesson status, open days and frozen `day_closed` results.
- **As written, the design breaks in five places.** Each one has a shrunk counterexample:
  - the pull cursor;
  - day close;
  - the local copy of a deterministic-id event;
  - the study-day time zone;
  - live reviews under clock skew.
- **A full derive costs 1.3 s on this laptop, or about 5 s on a mid-range phone.** That is too slow to run every time the log changes. Add a small per-card cache. A full incremental framework isn't needed.
- **The queue policy works. Recommended defaults:** review cap as a time budget, `tailShare` = 0, `newCostInReviews` = 8.

## How to run

```
npm install
npm test                    # determinism + convergence + counterexamples (RUNS=10000 npm test for the long run)
npm run bench               # full-derive timing over a generated year
npm run queue-sim           # doc 02 queue policy grid (about 80 s)
npm run engine-check:v8     # card-state dump from V8; engine-check:jsc does the same in JavaScriptCore (bun)
```

| File | What it is |
|---|---|
| `src/events.ts` | Event envelope and payloads, including the fields proposed below |
| `src/server.ts` | In-memory events table: `'identity'` mode (seq taken at insert, visible at commit, like Postgres) or `'serialized'` mode (seq order equals commit order) |
| `src/device.ts` | Client: local log, FIFO outbox, pull cursor, day close (`naive` or `settled`), and the fix toggles |
| `src/srs.ts`, `src/derive.ts` | Replay through ts-fsrs, and the pure derive |
| `test/*.ts` | Property tests, directed scenarios, and counterexample finders (each removes one fix) |
| `src/bench.ts`, `src/gen-year.ts` | Performance |
| `src/queue-sim.ts` | Queue-policy simulator |

## 1. Determinism of replay

**What ts-fsrs 6.0.0 actually does.** The fuzz middleware already seeds its PRNG deterministically. The seed is the string `` `${card.cardId}${reps}` ``, fed to `fnv1aMulberry32Rng`. There's also a `createSchedulerFuzzingMiddleware({ rng })` hook. Three caveats:

- **Pass `cardId` to `newCard()` every time.** Without it, the middleware calls `crypto.randomUUID()`, so replays differ. The test `COUNTEREXAMPLE: newCard() without cardId` shows this.
- **Turn fuzz on explicitly.** `DefaultScheduler()` defaults to `enableFuzz: false`.
- **The architecture's "seeded from (cardId, reviewedAt)" isn't what the library does.** The `rng` hook only receives the seed string, so it can't see `reviewedAt` without a custom middleware. It doesn't need to, either: `(cardId, reps)` is just as deterministic, because `reps` is a function of the replayed history.

**The load balancer is the real determinism problem.** Doc 02 recommends Anki-style load balancing. It picks the due day from the device's *current global due counts*, so it can't be replayed. Review B2's fix said to store the chosen `due_at`. Revision 2.1 dropped it and kept only "seeded fuzz".

**Recommended approach (implemented as `dueMode: 'recorded'`):**

1. The review event records the due date the device chose (`dueAt`, integer ms, after load balancing). It also records `prevReviewId`, the review the device treated as this card's previous one (`null` for the first).
2. Replay computes the memory state (S, S_fast, D) with pinned ts-fsrs. It takes the recorded `dueAt` only when the event's `prevReviewId` equals the replayed previous review. Otherwise, it falls back to ts-fsrs's seeded fuzz. The concurrent-review case falls back like this. Both branches are deterministic, so all devices agree.
3. Pin the scheduler config with the rules: `version`, `desiredRetention`, steps, `enableFuzz`, `maximumInterval`.

**Proven by tests:**

- replaying the same history twice gives the same state;
- replaying on a second "device" that received the events in a shuffled order gives the same state;
- a fresh scheduler instance agrees (300 and 100 fast-check runs);
- both due modes converge in the two-device property.

**Cross-engine check (V8 vs JavaScriptCore).** The phone runs Safari (JSC) and the laptop runs Chrome (V8). I replayed a generated year (5,779 cards) in Node and in bun 1.4.4:

- **Unrounded fields differ.** The last ulp of `scheduledDays` differed for **73 cards (1.3%)**, a relative difference up to 1e-14.
- **Rounded fields were identical.** ts-fsrs rounds stability and difficulty to 8 decimals, so those matched. `dueAt`, mastery, lessons and days were also identical.
- **Rule:** never hash or compare raw floats across devices, and never freeze an unrounded float into an event. Recording `dueAt` as an integer also makes due days immune to this noise.

This was a single successful bun run; bun later crashed on this machine with an environment issue. Re-check it in WebKit (for example, Playwright WebKit) in phase 2.

## 2. Two-device convergence

The generator interleaves the following on two devices:

- reviews of 4 shared cards, so concurrent reviews are frequent;
- trials and spans;
- voids;
- going offline and online;
- syncs whose server commit lands later, so two pushes can overlap;
- lost acks, which re-push the batch;
- re-pushes of already-acked events;
- clock skew changes within ±2 min;
- time jumps from 1 min to 24 h, starting 10 minutes before the 04:00 day boundary.

After a forced full sync, the test asserts identical logs and an identical snapshot. The snapshot covers card states, mastery, lesson status, frozen days and open days. A second property checks that every frozen day's XP equals the XP from the complete log. That property is skipped for runs where a device held unsynced events longer than the grace period.

### Counterexamples (each found by fast-check and shrunk; `npm test` prints them)

| # | Broken assumption | Minimal counterexample | Fix |
|---|---|---|---|
| C1 | **`select … where seq > cursor` sees every row.** An identity `seq` is taken at insert but becomes visible at commit. | The phone and laptop push at the same time. The laptop's transaction takes seq 1–2, and the phone's takes seq 3–4 and commits first. The laptop pulls (cursor = 4), then the laptop's rows commit. The phone's cursor is already past them, so it never sees the laptop's review. Card `reps` ended at 1 on one device and 2 on the other. | Push through one RPC that takes `pg_advisory_xact_lock(hashtextextended(user_id::text, 0))` before `insert … on conflict (id) do nothing`. Seq order then equals commit order. An overlap window plus id dedup is weaker, because a long transaction can still exceed it. |
| C2 | **"The second device's copy is a no-op."** That's true on the server, not on the device. | Both devices close 2026-02-28 with different local data: the phone has 5 XP, and the laptop has 0 XP because it hasn't pulled the phone's span. The server keeps the first copy. The other device keeps its own payload under the same id forever, because a pull of a known id is ignored. | **The server row is authoritative for an id.** Pull writes with `put`, overwriting the local copy. That applies to every deterministic-id event, not just `day_closed`. |
| C3 | **"The first device to open the app after the day ends closes it."** | The laptop spends 8 min on Feb 28 (a Floor day) and hasn't synced. The phone opens after 04:00, closes Feb 28 at 0 XP / `none`, and the streak breaks permanently. The directed test shows the same thing for the reverse case (below). | The **settled rule** (§4). |
| C4 | **Every device knows which devices exist.** | Under the settled rule, a device that has never pushed anything doesn't appear in the log. The other device closes the day without waiting for it. | **Register at sign-in.** Sign-in needs the network anyway, so each device pushes a `device` hello event before any study is recorded. |
| C5 | **The study day can use the device's time zone.** | The phone is on UTC−5 and the laptop on UTC−6, for example after travel. A 10-minute span at 03:50 falls on different study days, so the open days disagree, and so does whatever gets frozen. | The study time zone and `dayStartHour` are synced `setting` events. Derive never reads the device's zone. |
| C6 | **§14's skew mitigation ("the later of occurred_at and the previous review time") only needs to happen in derive.** | The laptop is 2 min ahead and reviews card X. The phone pulls and then reviews X. With its slower clock, elapsed time is negative, and **ts-fsrs throws `SRSSchemaError: elapsedDays must be finite and non-negative`**. That would crash a live review. | **Apply the clamp at record time:** a review's `occurred_at` = max(clock, last stamp, the card's last known review time). Replay sorts by time, so it never sees a negative gap. |
| C7 | **A device's timestamps never go backwards.** | The phone's clock is 90 s fast. It writes a mark at "04:00:30", which proves it has flushed the old day, and the laptop closes the day. Then NTP pulls the phone back 60 s, and a 9-minute span is stamped 03:58, inside the closed day. The window is 2 min wide, so this came from a directed test, not random search. | **Monotonic stamping per device:** occurred_at = max(clock, last stamp). |

`AS_WRITTEN` (C1 + C2 + C3 + C4 + C7 together) fails convergence after 7 random runs.

### The critical question: the laptop closes a day before the phone's offline events arrive

Directed tests in `test/convergence.test.ts`. On study day Mar 1, the phone is offline and studies 20 min; the laptop studies 5 min online. The laptop opens first the next morning.

| Rule | Phone syncs 30 h later | Phone syncs 100 h later |
|---|---|---|
| As written (first device closes) | **Frozen at 5 XP, credit `none`.** The 20 min are lost forever and the streak breaks. | Same |
| Settled rule (proposed) | The laptop waits. The day closes at **25 XP, `standard`** once the phone syncs. | Past the 72 h grace, so the laptop closes at 5 XP. This loss is accepted and bounded. |

## 3. Recommended event schema changes

Envelope (all events):

- **`device_seq int`** is a per-device counter. With it, a gap in a device's sequence is detectable, and the settled check can also require a contiguous prefix.
- **`occurred_at` stamping rules:**
  - monotonic per device (C7);
  - for reviews, never before the card's last known review (C6).
- `seq` stays server-assigned, but is written only through the serialized push RPC (C1).

Payloads:

| Kind | Change |
|---|---|
| `review` | **Add `dueAt: number`** (integer ms, the device's load-balanced choice) **and `prevReviewId: string \| null`** (§1). |
| `device` (new) | `{ reason: 'hello' \| 'day' }`. `hello` is pushed at sign-in before any study (C4). `day` is written on sync when the device has recorded nothing since the current study day began, at most once per device per day. It proves the device has flushed the previous day. |
| `setting` | Synced keys **`studyTz`** (IANA name) **and `dayStartHour`**. The latest by `(occurred_at, id)` wins (C5). Not tested: DST transitions with IANA zones, since the spike used fixed offsets. |
| `day_closed` | Keep the id `hash(userId, date)` and integer or rounded values only. Add `minutes` (2 dp) and `basis: 'settled' \| 'grace'` for audit. **It can't be voided.** A correction is a later rule version, never an edit. |
| `void` | Rejected when it targets a `day_closed`. |

Client store: a pull **overwrites** by id (C2). Day close runs only right after a successful pull, never offline.

## 4. Rule for late events vs closed days

1. **Open days.** A study day D, in the synced study time zone and starting at `dayStartHour`, stays *open* until it is settled. Open days show provisional XP and credit derived live. The streak UI treats an open day as pending, not broken.
2. **When D settles.** Right after a successful pull, any device may append `day_closed(D)` when either of these holds:
   - **(a)** every *other* device that recorded anything in the 14 days before D's end has an event in the local log with `occurred_at ≥ end(D)`. A FIFO outbox, serialized seq and monotonic stamps together guarantee that this device's D events are already present;
   - **(b)** 72 hours have passed since `end(D)`.
3. **Events that arrive after D closes** are kept, and they still count for cards, mastery and input hours. They never change D's XP or credit. That can only happen when a device sat on unsynced study for more than 72 h. Show a small "N minutes synced too late to count" note; don't silently drop them.
4. **Both devices closing D** write the same id. The first one on the server wins and the other converges on pull (C2). Under (a), both have the same data, so the payloads only differ if the two builds have different rule versions.

The 72 h grace and the 14-day "recently active" window are owner-tunable. The window only stops a retired device from blocking closes forever.

## 5. Performance

Generated year: **140,365 events**:

- 40k reviews over 5,779 cards;
- 70k trials;
- 15k spans;
- 15k exposures;
- 365 day closes.

That's 28 MB as JSON. Measured on this laptop (i7-10750H, Node 24.19), median of 7 runs:

| Step | Laptop | Mid-range phone (assumed 4×) |
|---|---|---|
| Full derive (cards + mastery + lessons + daily XP + closes) | **1,270 ms** | **~5.1 s** |
| … of which replaying all cards through ts-fsrs | 970 ms (23 µs per `review()`) | ~3.9 s |
| … sorting all events | 100 ms | ~0.4 s |
| `JSON.parse` of the whole log (a lower bound for reading IndexedDB) | 158 ms | ~0.6 s or more |
| Load a per-card state cache (2.1 MB) | 10 ms | ~40 ms |
| Apply a day's reviews (115) to the cache | 3 ms | ~14 ms |
| Late event: replay one card from scratch (11 reviews) | <1 ms | ~1 ms |

**The phone factor is an assumption, not a measurement.** I assumed 4×, for a Snapdragon 7-series-class Android against this 2020 laptop CPU. A recent iPhone is probably 1–1.5×. Measure on the real phone in phase 2.

**Where the time goes.** Profiling shows ts-fsrs's per-call schema validation and object copying, plus GC, at about a third of the time. The FSRS-7 math is about 15%.

**Recommendation: incremental derive is needed for cards, in its simplest form.** "Recompute from the local log when the log changes" (§5) means 1–5 s after every sync by the end of year one.

- **Per-card cache.** Keep each card's derived state in IndexedDB, tagged with the rules and FSRS version and the card's last applied review.
  - A new review for the card that's later than its last applied one is applied directly.
  - An event older than that replays just that card.
  - Because each card is a pure fold of its own reviews, this is trivially deterministic.
- **XP.** It only needs the open days, since closed days are frozen.
- **Mastery.** A similar per-item fold.
- **Full recompute.** Run it only when the rules or FSRS version changes, in a Web Worker in the background.

Decision 10 ("defer incremental derive") should change to "per-key fold caches from phase 2".

## 6. Queue policy (doc 02 `buildQueue`)

**Simulator setup.** The simulator is `src/queue-sim.ts`:

- ground truth is the FSRS-7 default model itself, with recall drawn as Bernoulli(R), the standard FSRS-simulator assumption;
- 365 days;
- a bedtime session each day, 5% random missed days, and a 1-week break (day 100) and a 2-week break (day 220);
- 8 s per pass, 15 s per fail, 20 s per new card;
- `newPerDay` 10, `retentionFloor` 0.8, intraday learning steps;
- 3 seeds per row, so differences under about 1 day or 0.01 are noise.

Bedtime user (15–30 min sessions, half of it on cards, so 7.5–15 min of cards):

| reviewCap | tailShare | newCost | cards learned/yr | true retention | min/day | clear after 1 wk | clear after 2 wk |
|---|---|---|---|---|---|---|---|
| 60 | 0.15 | 4 | 1,544 | 0.868 | 8.6 | 3.0 d | 8.7 d |
| 60 | 0.15 | 8 | 1,170 | 0.873 | 6.2 | 2.0 d | 5.0 d |
| 60 | 0.15 | 12 | 875 | 0.868 | 4.6 | 1.3 d | 3.0 d |
| 100 | 0.15 | 4 | 1,991 | 0.870 | 10.7 | 6.3 d | 7.7 d |
| **100** | **0.15** | **8** | **1,830** | 0.871 | 9.7 | **3.0 d** | **7.3 d** |
| 100 | 0.15 | 12 | 1,515 | 0.868 | 8.1 | 1.7 d | 5.7 d |
| 150 | any | 8 | 2,041 | 0.871 | 10.8 | 2.3 d | 7.7 d |

Full grids, including a card-heavy user, an overloaded user and a due-date-order baseline, are printed by `npm run queue-sim`.

What the numbers say:

- **Retention barely moves (0.865–0.875) with any parameter, including during catch-up.** The R-descending order plus the new-card gate keep it there. True retention sits about 0.03 under the 0.90 target in every row, an artifact of late reviews (skips and gaps) that applies to all policies alike.
- **The new-card gate is the real backlog control.** Even the "overloaded" user (5–8 min/day, 15% skips, 20 new/day, cost 4) never built a permanent backlog, because new cards stop as soon as anything is carried over. As a result, **`tailShare` made no measurable difference anywhere** (0, 0.15 and 0.30 within noise). The starvation it guards against needs a permanent backlog, which the gate prevents.
- **R-descending beat due-date order only under overload** (1 wk: 4.7 vs 6.7 days to clear; 2 wk: 8.7 vs 10.0). Elsewhere they tie, so R-descending is still the right default.
- **For the bedtime user, time binds before a cap of about 100.** Cap 150 rows are identical to each other. `newCostInReviews` is the main lever between cards per year and recovery speed.

**Recommended defaults:**

- **Make the review cap a time budget**, which answers doc 02's open question. Use about 10 min of cards a day, converted to cards with the user's median seconds per card. That's about 75–100 cards, the `reviewCap` 100 rows.
- **`tailShare` = 0.** Drop the mechanism and revisit only if logs show R < 0.5 cards piling up.
- **`newCostInReviews` = 8.** 4 learns about 10% more cards but doubles the 1-week recovery. 12 recovers fastest but learns about 17% fewer.
- **Welcome-back ETA.** With these defaults, expect about 2–3 days to clear after a 1-week break and about 5–8 days after a 2-week break.

## 7. What the architecture doc gets wrong or leaves out

1. **§5 Pull.** `seq > cursor` on an identity column skips rows committed out of order (C1). It needs a serialized push RPC.
2. **§5 Cards, "fuzz seeded from (cardId, reviewedAt)".** ts-fsrs seeds from `cardId + reps`, has fuzz off by default, and falls back to a random uuid if `newCard()` gets no `cardId`. The real non-replayable part is the load balancer (doc 02), which rev 2.1 dropped silently. Restore B2's recorded `dueAt`, guarded by `prevReviewId` (§1).
3. **§5 Frozen history.** "First device to open the app afterwards" freezes a day without the other device's offline study (C3). Use the settled rule plus device registration (C4).
4. **§5 "the second device's copy is a no-op".** It isn't a no-op locally: pull must overwrite by id (C2).
5. **§6 Event union.** It lacks `review.dueAt` and `prevReviewId`, the `device` hello and day marks, `device_seq`, and the synced study time zone and day start (C5).
6. **§14 clock skew.** The clamp has to happen when the event is recorded, not only in derive; otherwise ts-fsrs throws (C6). Device stamps must also be monotonic (C7).
7. **§5 performance and decision 10.** "Recompute from the local log" costs about 5 s per change on a mid-range phone at one year. Per-card and per-item caches are needed from phase 2 (§5 above).
8. **Cross-engine floats aren't mentioned.** V8 and JSC differ in the last ulp of unrounded values. Nothing frozen or compared across devices may depend on an unrounded float.
9. **What's right:** ordering derive by `(occurred_at, id)` and never by `seq`, deterministic card ids, insert-only with `on conflict do nothing`, and one events table. All of these held up under testing.

## Limits of this spike

- The server is in memory. Supabase specifics weren't run: the RLS behavior of `on conflict do nothing` under an insert-only policy, and the RPC with the advisory lock.
- The time zones were fixed offsets, with no DST.
- The phone performance factor is assumed, not measured.
- The JSC comparison is one run in bun on Windows, not Safari on iOS.
- The queue simulator assumes the FSRS model is the truth, and it uses default parameters with simplified answer timing.
