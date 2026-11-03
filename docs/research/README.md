# Research

Background research for the language-learning app. Each topic gets one numbered doc; this README is the index and holds the cross-topic synthesis once the topic docs are done.

## Index

| # | Doc | Question it answers |
|---|-----|---------------------|
| 01 | [Refold methodology](01-refold-methodology.md) | What is Refold, what are its stages, and what does it imply for the app's flow? |
| 02 | [SRS algorithms](02-srs-algorithms.md) | Which scheduling algorithm should we use, and how do we avoid review pile-ups after missed days? |
| 03 | [Mandarin curriculum & materials](03-mandarin-curriculum-and-materials.md) | What order to learn things in, and which free native-speaker video/audio/text sources exist? |
| 04 | [Progression systems](04-progression-systems.md) | What makes a skill tree / knowledge graph motivating enough to come back daily? (Math Academy, etc.) |
| 05 | [Infra & licensing](05-infra-and-licensing.md) | Free-tier hosting, auth, DB, media storage; what content we can legally store/serve behind a login. |
| 06 | [Lesson design](06-lesson-design.md) | Which lesson patterns from the user's vue-crash-course transfer to Mandarin (atomic lessons, skeleton, writing style)? |
| 07 | [Activity types](07-activity-types.md) | What lesson and activity types does SLA pedagogy support for an input-first beginner, and how should variety be generated, rather than chosen ad hoc? |

Synthesis: see [Cross-topic synthesis](#cross-topic-synthesis) below (written after 01–06).

## Conventions

- One doc per topic, numbered so the reading order is stable. New topics get the next number.
- Every topic doc uses the same sections, in this order:
  1. **TL;DR**: 5–10 bullets a reader can stop after.
  2. **Findings**: the body of the research, organized however suits the topic.
  3. **Implications for the app**: concrete requirements, features or constraints this creates. Mark them `MUST` / `SHOULD` / `COULD`.
  4. **Open questions**: things we couldn't settle, or decisions only the user can make.
  5. **Sources**: links, with a few words on what each one supports. Claims in Findings cite these as `[n]`.
- Mark confidence where it matters: `(verified)` = checked against a primary source; `(reported)` = secondhand / community claim.
- Record decisions in the synthesis section of this README, not inside the topic docs, so there's one place to look.

## App requirements (from the brief)

- Web app, usable on desktop and phone. A key use is low-effort bedtime sessions on the phone, screen on: ~15 min of flashcards, or a 5–10 min video lesson. (Not screen-locked background audio.)
- Some immersion happens outside the app (e.g. Chinese shows in the Netflix app), so input time should be loggable manually.
- Private, but on a public URL, so login is required.
- Progress persisted (Supabase free tier is the candidate).
- Media persisted somewhere with a generous free tier.
- Free / non-paid study material only, since it's served from a public URL.
- Refold methodology; custom SRS (not Anki) that degrades gracefully after missed days.
- Mandarin first; native-speaker audio/video (no TTS) for ear training early on.
- Skill tree / knowledge graph for progress tracking and daily motivation.

## User's proposed time split (draft, to validate against research)

| Share | Activity | In app scope? |
|-------|----------|---------------|
| 25% | Core curriculum study: structured foundation work for roughly the first 6 months (≈ Refold phases 1–2, starting from zero) | Yes, core |
| 25% | Flashcards (SRS) | Yes, core |
| 50% | Netflix / immersion | Only as a tracker, a manual time log, and a suggestions list |

## User's study parameters (stated)

- **Normal day: ~2 h total, fragmented** into chunks of anything from 5 min to 30 min to 1 h. Sessions must be resumable, and units should come in a few lengths (≈5 / 15–30 / 60 min).
- **Lazy day: 15–20 min in bed**, phone screen on.
- **Already knows the four tones and all pinyin initials and finals** (stated 2026-11-02). S0 lessons still get built, but the user must be able to mark them complete or test out.
- **Immersion subtitles:** English subtitles "for the first long while" to get used to the sounds, switching to Mandarin subtitles at some comfort level. The app should track subtitle mode per log and help decide when to switch.
- Pacing implied (per doc 01 §8): at ~2 h/day, ~6 months reaches end of Phase 1 / early 2A; Phases 1–2 complete in ~12–14 months.

## Cross-topic synthesis

### The app in one paragraph

A phone-first web app with one owner. It runs three buckets of study:
- **Curriculum:** 42 themed units (~140 atomic lessons of 5–7 min) over roughly 6 months. Each lesson starts with a native clip, then follows I do / we do / you do.
- **Flashcards:** FSRS with a capped, backlog-proof queue, fed by lessons and sentence mining.
- **Immersion:** mostly outside the app (Netflix). It is logged by hand and supported by a suggestions list.

Every activity logs minutes under Refold's categories. Progress appears as three separate meters (effort XP, input hours, knowledge-graph mastery). A forgiving consistency system counts a 15-minute bedtime session as a full day. It is hosted for $0 on Supabase plus Cloudflare.

### Decisions the research supports

| Area | Decision | Docs |
|---|---|---|
| Time split | Phase-adaptive split, not a fixed 25/25/50. The split starts at 25/25/50 (1A–1B), shifts to ~10/20–25/65–70 (1C–1D), then ~0–5/20/75–80 (Phase 2). Flashcards are capped by **minutes** (~15–25/day), not by percentage. | 01 §8, 04 |
| Pacing | At ~2 h/day the curriculum covers Phase 1 to early 2A (~1,000 words) in ~6 months, and Phases 1–2 take ~12–14 months. The app shows a time-to-goal projection from the trailing 14-day average. | 01 §8, 03 §1.7 |
| SRS | FSRS-7 via `ts-fsrs` 6.0.0, with the version pinned (npm release confirmed 2026-10-28) and FSRS-6 as a config fallback. Append-only review logs. | 02 |
| Backlog | Daily cap, retrievability-descending order with a 15% lowest-R tail, siblings buried, and the carried-over count hidden. New cards are zero while behind. No vacation mode. | 02 |
| Lessons | One idea per lesson with a 5–7 min core. Native clip first, ≤300-word explanation, I do / we do / you do, and each lesson emits flashcards. Input before output: Phases 0–2 use output levels 0–1 only. | 06, 07, 03 §1.8 |
| Activity types | **Proposed, not final** (doc 07): 18 candidate activities (T1–T18) on 7 dimensions; the activity follows the target skill (transfer-appropriate processing); four lesson shapes chosen by idea type (Sound, Pattern, Clip, Checkpoint); variety comes from content (voices, speakers, clips), interleaved confusables and support faded across a unit, not from rotating formats (no evidence that helps learning); at most 1 optional "wildcard" activity per unit; Nation strand balance checked weekly. Build to spec, Upgrade and Fix it are parked until Phase 4–5. | 07 |
| Curriculum | S0 Sounds (12 units) → S1 (15 units, ~300 words, Grammar Wiki A1) → S2 (15 units, ~1,000 words, A2 core); ~140 lessons total. HSK **2025** syllabus as the word scaffold. Characters learned in context, with components shown on demand. | 03 |
| Tones | High-variability tone trainer (≥4 native voices), which also acts as the S0 gate. The user already knows tones and pinyin, so it serves as the S0 test-out and an optional daily drill rather than week-1 teaching. | 03, 01 |
| Completion & test-out | **Lesson status:** not started → in progress → complete, with one-tap "mark complete" on any lesson (as in vue-crash-course §4). Nothing is gated. **Test-out:** "I already know this" on a lesson, unit or whole stage offers an optional Checkpoint (unseen voices; ≥80% passes) or plain self-report. Status records its source: `completed` / `tested_out` / `self_reported`. These count as met prerequisites in the knowledge graph, so the frontier moves on to S1. No XP for marking complete (04: no backfill credit). A weak checkpoint area (e.g. 3rd-tone sandhi, zh/j) recommends just those lessons. | 04, 06, here |
| Progress meters | XP = focused minutes (in-app 1/min; logged immersion 0.5/min, capped at 20/day). Input hours and graph mastery are kept as separate meters. | 04 |
| Knowledge graph | Sound / Script / Grammar layers plus lesson nodes, with mastery derived from FSRS stability and soft gates. On the phone: a frontier list plus rings. Cytoscape.js for the zoomable map. | 04 |
| Leave out | Leagues, negative XP, hearts or gems, random rewards, guilt notifications, hard locks. | 04 |
| Stack | Cloudflare Workers/Pages (frontend), Supabase Free (Postgres + email-OTP auth, signups off, RLS), private R2 behind an auth Worker (media), daily keep-alive ping, weekly `pg_dump`. | 05 |
| Video | YouTube IFrame embeds only, `playsinline=1`. Our subtitles render below the player, synced by polling `getCurrentTime()`. Card audio replays a `start`/`end` span of the embed. No downloads or caption scraping. | 05, 03 |
| Native audio | `hugolpz/audio-cmn` (CC BY-SA), Wikimedia Commons, Common Voice, Global Storybooks (CC BY). **Most Tatoeba Mandarin audio is unlicensed**, so it is excluded by default. | 03, 05 |
| Licensing | Store a license record per item and file, and show a credit line plus a Credits page. Ship the CC-CEDICT, LGPL and Arphic license texts. Staying non-commercial keeps Grammar Wiki (NC) excerpts usable. | 03, 05 |

### Conflicts between docs, and the resolution recommended here

1. **Habit Health (01) vs streaks (04).** Both lead with a rolling hit rate: Refold's 14-day Habit Health ≥80% and 04's "days in last 30". **Recommendation:** make the 30-day hit rate the headline and show the streak (with rest tokens and repair) as secondary. A Floor day counts toward both.
2. **Three versions of the short session:** "Quick 15" (01), the "N-minute" builder (03) and the "bedtime button" (04). **Recommendation:** build one session builder (5 / 15–20 / 30 / 60 min). Its content comes from the current sub-phase (01's templates) and is assembled from lessons and 5-min review batches (03). Reaching the Floor (≥8 measured minutes) satisfies the day (04).
3. **English-subtitle Netflix.** 01 would log it as `background` (not counted). 04 counts it at 0.5 in hours. 03's evidence says English subtitles help you follow the story but do little for hearing the sounds. **Recommendation:** log it as its own subtitle mode and count it at 0.5 in input hours. Never count it as `background`, because the user is attending to it. Run 03's switch check after S1. *Needs user OK.*
4. **Review cap: cards (02) or minutes.** **Recommendation:** use minutes, converted to cards from the median seconds per card. This fits fragmented time and 01's minute-based SRS budget.
5. **Lesson and activity types.** The user rejected the archetypes translated from vue-crash-course (06) on 2026-11-02: they were ad hoc and included output tasks. Doc 07 replaces them. Mystery, Showdown and Walkthrough survive only as ways of framing the written explanation.
6. **Shadowing timing.** 06 put shadowing in the Phase 0–2 "we do". Refold puts chorusing at 3D/4A. Doc 07 cites perception gains from early shadowing (Hamada). **Recommendation (07):** make it optional from 1B, offered only once tone identification is accurate. Log it as `output`. *Needs user OK.*
7. **S0 is nearly all study** (now mostly moot, since the user tests out of most of S0). Doc 03's 12 Sounds units are almost 100% language-focused, against Nation's guideline (≤ about half early, ≤ about a quarter from 1C) and Refold's advice that sound study be "short and bounded". **Recommendation (07):** pair every S0 day with a scheduled Clip lesson (CI video), and run the tone trainer as a daily 5–10 min drill as well as inside lessons.
8. **Graph library.** 04 mentions React Flow "if the app is React". The user's last project was Vue, and Cytoscape.js is framework-agnostic either way, so the graph doesn't force a framework choice.

### Biggest risks

- **Content curation is the real cost.** About 140 lessons across 42 units need hand-picked native clips with timestamps (Common Voice transcript search is the fallback for grammar examples), plus hand-made line timings and transcripts, because YouTube captions can't be fetched for other people's videos. Plan it as its own workstream.
- **Card audio from YouTube spans.** Mounting one iframe per flashcard is heavy on a phone. Prototype it early, using a single reused player and pre-roll. Fall back to rehostable native audio for word cards.
- **FSRS-7 is days old.** Pin the version, keep full logs, and replay the history into FSRS-6 if it misbehaves.
- **Supabase Free pauses after ~7 idle days and has no backups.** The cron ping and weekly dump are MUST-haves, not extras.
- **Unverified items:** Netflix titles against the user's region; official Peppa Pig / Bluey Mandarin YouTube channels; whether `ts-fsrs` runs in Deno edge functions; Supabase Storage Range support.

### Open decisions for the user

1. Simplified only (recommended), or a Traditional toggle too? Mainland or Taiwan accent?
2. Bring back "we do" guided practice, unlike vue-crash-course? (Recommended: yes. Doc 07's evidence supports it.)
3. Adopt doc 07's framework (four lesson shapes, stable routines, content variety, a wildcard cap), or keep exploring?
4. Shadowing: none until Phase 3D, optional and perception-gated from 1B (recommended), or in every "we do"?
5. Accept Refold's near-zero meaningful output for ~1,500 h, given that a meta-analysis found production practice wins on delayed productive tests?
6. How should English-subtitle Netflix count (resolution 3)?
7. Should flashcards use 2-button (Again/Good, recommended for the phone) or 4-button grading?
8. Is it OK to put a card on file with Cloudflare for R2? (No-card fallback: Backblaze B2.)
9. Should XP be visible at all, or only rings, hours and mastery?
10. Lesson authoring: markdown in the repo with a `check` script (like vue-crash-course), or rows in Supabase?
11. Who curates the clips and timestamps for the ~140 lessons, and when?
12. Is the app non-commercial forever? That keeps the CC BY-NC sources usable.
13. Frontend framework: Vue 3 (the user's recent stack) or something else?
