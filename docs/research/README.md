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
| 08 | [Curriculum structure review](08-curriculum-structure-review.md) | Which structural choices (lessons vs knowledge, ids, derived values, media) would box us in as lessons and history pile up? |
| 09 | [Image datasets](09-image-datasets.md) | Which captioned image dataset supplies the vocab-card photo, and how is the photo picked and checked automatically? |

Design docs (`docs/design/`), built on the research:

| Doc | What it is |
|-----|------------|
| [Activity brainstorm](../design/activity-brainstorm.md) | 24 interactables (X1–X24), per-shape I do / we do routines, 9 quiz/check archetypes with feedback rules, a draft variety-matrix sketch, a cut list. Not final. |
| [TDD: curriculum data model](../design/tdd-curriculum-data-model.md) | Entity model, authoring format, interactable registry, check/compile pipeline, derive functions, phases. Unreviewed first pass; the architecture doc overrides it where they differ (its §12). |
| [App UI and flow](../design/app-ui-flow.md) | Navigation, screens, flows, visual style and UI copy rules; mockups board in `sandbox/ui-mockups/`. |
| [Architecture](../design/architecture.html) | C4 architecture (context, containers, components, key contracts), language packs for adding languages, deployment, decisions, departures from the TDD, build phases. Open in a browser. Proposed. |
| [Build phases](../design/build-phases.md) | The build order: a local vertical slice on a six-lesson pilot that settles the content style, a hosted trial, a style gate, then a 30-lesson first batch and a scale check before the remaining lessons. Proposed. |
| [Lesson plans](../design/lesson-plans/README.md) | Executive-summary plans for all 194 lessons (S0, S1, S2a, S2b): how each is taught, mapped onto the lesson arc, with its opener, practice format, variety choices and checked YouTube videos. Drafted and adversarially reviewed 2026-11-03. Owns the lesson-level split; doc 03 §1.8 keeps units and prereqs. |

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
- Mandarin first; native-speaker audio/video for ear training early on. ~~No TTS.~~ Revised 2026-11-03: native datasets (AISHELL-3 + AISHELL-1) first, ElevenLabs v4 for gaps and generated sentences (see the Native audio and TTS row).
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
- **Hard constraint: no manual curation by the user** (stated 2026-11-02). Any audio or video used *inside a lesson* (the clip, examples, "you do" items, cards) must come with a transcript that can be obtained automatically and legitimately. In practice:
  - **Lesson-eligible:**
    - CC sources that ship text (Common Voice, Global Storybooks, audio-cmn, Wikimedia), and we may also run local speech-to-text on these to get timings;
    - YouTube videos whose creator publishes a transcript we may fetch, or has given permission.
  - **Watch-only:** every other YouTube video. These can be embedded as a unit's free-watch video (they need only a duration), but no lesson step may depend on their content. **Refined 2026-11-03** (see Video roles in the Video row): a video may be a lesson's `main` explainer when its contents are known from a transcript, a summary, or its title, description and chapters. The lesson is built around what that information says. Practice items and cards still never use a video's own audio lines unless a transcript can be fetched.
  - **Never:** downloading YouTube audio or scraping captions (YouTube terms; doc 05).
  - Checking transcripts must also be automated (cross-source agreement, dictionary and segmentation sanity checks), not done by hand.
- **v1 scope: HSK 2025 levels 1–3** (~1,000 words, S0–S2), decided 2026-11-02. Use the months at this level to refine the lesson format before adding S3+.
- **Already knows the four tones and all pinyin initials and finals** (stated 2026-11-02). S0 lessons still get built, but the user must be able to mark them complete or test out.
- **Immersion subtitles:** English subtitles "for the first long while" to get used to the sounds, switching to Mandarin subtitles at some comfort level. The app should track subtitle mode per log and help decide when to switch.
- Pacing implied (per doc 01 §8): at ~2 h/day, ~6 months reaches end of Phase 1 / early 2A; Phases 1–2 complete in ~12–14 months.

## Cross-topic synthesis

### The app in one paragraph

A phone-first web app with one owner. It runs three buckets of study:
- **Curriculum:** 64 themed units (~200 atomic lessons of 5–7 min) over roughly 6 months. Each lesson starts with a native clip, then follows I do / we do / you do.
- **Flashcards:** FSRS with a capped, backlog-proof queue, fed by lessons and sentence mining.
- **Immersion:** mostly outside the app (Netflix). It is logged by hand and supported by a suggestions list.

Every activity logs minutes under Refold's categories. Progress appears as three separate meters (effort XP, input hours, knowledge-graph mastery). A forgiving consistency system counts a 15-minute bedtime session as a full day. It is hosted for $0 on Supabase plus Cloudflare.

### Decisions the research supports

| Area | Decision | Docs |
|---|---|---|
| Time split | Phase-adaptive split, not a fixed 25/25/50. The split starts at 25/25/50 (1A–1B), shifts to ~10/20–25/65–70 (1C–1D), then ~0–5/20/75–80 (Phase 2). Flashcards are capped by **minutes** (~15–25/day), not by percentage. | 01 §8, 04 |
| Pacing | At ~2 h/day the curriculum covers Phase 1 to early 2A (~1,000 words) in ~6 months, and Phases 1–2 take ~12–14 months. After the stage reviews, S2 fills the ~30 min/day core slot with no slack and may run 2–4 weeks past month 6; testing out of S0 gives back about 2–3 weeks. The app shows hours to the next milestone, never a projected date. | 01 §8, 03 §1.7 |
| SRS | FSRS-7 via `ts-fsrs` 6.0.0, with the version pinned (npm release confirmed 2026-10-28) and FSRS-6 as a config fallback. Append-only review logs. | 02 |
| Backlog | Daily cap, retrievability-descending order with a 15% lowest-R tail, siblings buried, and the carried-over count hidden. New cards are zero while behind. No vacation mode. | 02 |
| Lessons | One idea per lesson with a 5–7 min core. Native clip first, ≤300-word explanation, I do / we do / you do, and each lesson emits flashcards. Input before output: Phases 0–2 use output levels 0–1 only. | 06, 07, 03 §1.8 |
| Content & authoring (proposed, TDD) | Content lives in the repo and compiles to hash-named files plus a per-build manifest in a private Supabase Storage bucket; each app build pins its manifest. No content in Postgres; Postgres holds only append-only facts. Lessons are markdown with `:::slot` containers, ```` ```@widget ```` YAML blocks and `:ex[…]{clip=…}` examples. One TS module owns order and `teaches`/`assumes`. Vue 3 + TS + Vite SPA, with only the views depending on Vue. Prerequisites live on knowledge items, so 03 §1.8's unit `Prereqs` column becomes a planning view. | TDD |
| Data model principles | Knowledge items are the spine, and lessons, cards and mining point at them. Store facts and derive categories, XP and mastery. Use stable ids, with order, HSK level and Grammar Wiki as attributes. Media, clips and speakers are entities, with exposure tracking and fallback clips. One evidence → mastery model. Seed the graph from data, not from lessons. | 08 |
| Activity types, variety and lesson arc | **Decided 2026-11-03.** Doc 07's catalog (T1–T18) and four lesson shapes (Sound, Pattern, Clip, Checkpoint), with the activity following the target skill. **Arc** ([brainstorm §4](../design/activity-brainstorm.md)): opener (context and hook) → lesson (the I do) → examples (the we do: the grammar or words in action) → practice (the you do, in the format the SRS reviews) → a short end card. No synthesis step: the SRS brings the skill back. **Openers** (Story, Showdown, Mystery, Discover) and **practice formats** (C0–C8) rotate by fit, for motivation while the habit forms; practice climbs a context ladder, adapts toward ~80–90% accuracy and ends on mastery or ~3 min. **Skills are SRS cards like vocabulary:** each lesson adds a `skill` card whose review is a short burst of its practice format on unseen stimuli, graded automatically. Build to spec, Upgrade and Fix it stay parked until Phase 4–5. | 07, brainstorm §4 |
| Curriculum | S0 Sounds (14 units, perception only, mostly tested out) → S1 (18 units, ~300 words, all 40 Grammar Wiki A1 points, ~90% of HSK 2025 L1 grammar) → S2 (32 units, ~1,000 words, ~75 of 99 A2 points and nearly all HSK 2025 L2–3 structural grammar, including 把/被/complements); ~200 lessons. Each unit has a `Prereqs` column; the graph was machine-checked on 2026-11-02 (acyclic, no forward references). HSK **2025** syllabus as the word scaffold. Characters learned in context, with components shown on demand. | 03 |
| Vocabulary placement | **Decided 2026-11-03.** The 1,000 HSK 2025 L1–3 words are placed in four tiers, and a word becomes an SRS card when the learner first meets it, the same way skills do. **1. Lesson:** words a lesson's examples and video need, about 5 at most; met in the examples, carded at the lesson's end card. **2. Unit:** theme words that belong to a unit but no single lesson; met in the unit's video, Clip lesson or a short word-set step; carded as the unit's lessons complete. **3. Prep:** words a later unit needs that fit neither tier; scheduled into the SRS ahead of the unit that needs them, with a deadline. New words never go inside checkpoints. **4. Frequency queue:** HSK words no lesson needs; fed by the SRS new-card budget in frequency order, finishing by the end of their stage. Example sentences are then filtered by the words the learner already has plus the lesson's target (i+1), not by HSK level. Placements are preliminary and move as lessons are authored. **Frequency gaps:** the top 1,200 subtitle words (OpenSubtitles zh_cn) that HSK misses, after dropping segmenter joins and proper nouns, split two ways. The core set (frequent in both subtitle and blended counts) is placed into S1 and S2 in the same tiers. The rest, mostly subtitle-only words such as interjections and casual forms, waits for a post-S2 queue in subtitle-frequency order, fed during an immersion-and-vocabulary stretch after S2. A post-S2 word moves into the lesson, unit or prep tier if authoring finds that S1 or S2 needs it. **Stage queues are part of their stage:** "every S2 unit assumes S1" includes S1's frequency queue, so S2 may use S1-queue words freely and the scheduler finishes the S1 queue before S2 relies on it. A lesson's own target never waits in a queue. | 03 §1.3, lesson plans |
| Vocab card format | **Decided 2026-11-03.** Less is more on the card, because every extra element lengthens every review. **Front:** the word in characters only. **Back:** the word again, with pinyin above each character; 1–3 definitions, only the senses that apply where the word is learned (fewer is better); one example sentence with the word in bold, plus its translation into the learner's language; audio of the word and of the sentence; and one image that puts the sentence in context. **One voice per card:** the word and the sentence use the same voice, and cards don't rotate voices. **Image:** retrieved automatically from a captioned image dataset by matching the example sentence with text embeddings (the Card images row). | lesson plans, 09 |
| Card images | **Decided 2026-11-04.** **Source:** Open Images V7 with Localized Narratives captions is the primary pool: images listed as CC BY 2.0 with per-image author and source metadata, hosted copies, and captions small enough to search before downloading any image. COCO 2017 is the fallback; prefer its BY, BY-SA and no-known-restrictions images, because many others are NonCommercial and it ships no author names. URL-only web-scale sets and gated sets are out. **Matching, all automatic:** BGE-M3 caption retrieval on the card's English translation (top ~20), SigLIP 2 or Chinese-CLIP rerank on those images, then a Qwen3-VL-2B yes/no gate plus a hazard gate (NSFW, public figures, watermarks, prominent text). **No fit means no image:** that's a normal card state, never the best of the bad matches. Chosen images are copied, resized, into the app bundle with their source, author and license on the Credits page. Fit rates and gate thresholds are **unmeasured**: the spike stopped before results, so measure them before building. | 09, spike image-retrieval |
| Tones | High-variability tone trainer (≥4 native voices), which also acts as the S0 gate. The user already knows tones and pinyin, so it serves as the S0 test-out and an optional daily drill rather than week-1 teaching. | 03, 01 |
| Completion & test-out | **Lesson status is computed from knowledge-item evidence (doc 08 F1):** not started → in progress → complete, with one-tap "mark complete" on any lesson (as in vue-crash-course §4). Nothing is gated. **Test-out:** "I already know this" on a lesson, unit or whole stage offers an optional Checkpoint (unseen voices; ≥80% marks a unit tested out, ≥85% for the S0 sound checkpoints; nothing is shown as failed) or plain self-report. Each one writes evidence onto the lesson's knowledge items, with source `checkpoint` or `self_report` (self-report is capped at Familiar). These count as met prerequisites in the knowledge graph, so the frontier moves on to S1. No XP for marking complete (04: no backfill credit). A weak checkpoint area (e.g. 3rd-tone sandhi, zh/j) recommends just those lessons. | 04, 06, here |
| Progress meters | XP = minutes: in-app and logged immersion both at 1/min, with no daily cap. Input hours and graph mastery are kept as separate meters. | 04 |
| Motivation | **Decided 2026-11-04.** Motivation and consistency matter most, so anything that harms them goes, even where doc 04 says otherwise. **Nothing shown ever resets or falls:** no streak, rest tokens or repair; consistency is days studied in the last 30 plus a heatmap, and a total that only rises. Any study counts as a study day, immersion included. What you know counts the highest state each item has reached; a forgotten card simply comes back for review, and the scheduler still uses its real state. **No failing:** finishing a lesson's practice completes the lesson at any score, and low accuracy only brings its cards back sooner. Checkpoint results show what's solid and what's worth another look, never a score against a pass mark. **No pressure:** no projected finish dates, no targets to fall short of in the weekly review, no notes about late or uncounted minutes, and nothing that remarks on a gap. Coming back after a break is a normal session. **Kept, because it protects motivation:** the review cap, hidden carry-over and no new cards while behind, since a wall of reviews is what makes people quit. | 04, 01, here |
| Tracking | **Decided 2026-11-04.** The app trusts its one owner: tracking records what happened, and never polices it. This overrides doc 04 and the TDD where they differ. **Credit:** a step counts once it's started or marked done. A video counts at its full length as soon as it starts, however much of it plays, and it can be skipped or marked watched. A lesson's minutes come from its estimate, not a stopwatch. **Dropped:** idle detection, visible-only timing, per-card time caps, the immersion log's runtime and date limits, the honesty mirror, and the rule that the Floor needs measured in-app minutes (logged immersion counts too). **Kept:** evidence of learning, because it's what the app is for: review grades, practice results and checkpoints still drive mastery and scheduling. Timings such as seconds per card may be logged to tune estimates, but never decide credit. | here |
| Knowledge graph | Sound / Script / Grammar layers plus lesson nodes, with mastery derived from FSRS stability and soft gates. On the phone: a frontier list plus rings. Cytoscape.js for the zoomable map. | 04 |
| Leave out | Leagues, negative XP, hearts or gems, random rewards, guilt notifications, hard locks. | 04 |
| Stack | **Revised 2026-11-08** (replaces the 2026-11-02 two-vendor stack). **App:** a Tauri v2 app built for Windows and Android from the same Vue code, with a plain web build possible. Content and media are bundled into the app, compressed (Opus audio, WebP images), so it works offline from install and nothing is served or hosted for it. A content change ships as a new app build. **Sync:** Supabase Free as an events-only database, reached only through `push_events` and `pull_events` functions that require a sync key. The app's settings hold the sync server address and the key; it syncs automatically and has a Sync now button. No Supabase Auth, no Storage, no Cloudflare Pages. The sync port stays swappable, so a Tailscale or home server could implement the same two calls later. **Backups:** every device holds the full log, a weekly GitHub Action dumps the database, Settings offers a manual export, and the media cache gets an off-laptop copy. **YouTube in Tauri:** embeds play on Windows from the bundled origin `http://tauri.localhost` (spike 2026-11-08, both hosts). Android is untested and is checked before phone testing; the fallback is opening the video in the YouTube app. | 05, architecture, spike tauri-youtube |
| Video | YouTube IFrame embeds only, `playsinline=1`, foreground, online only. Our subtitles render below the player, synced by polling `getCurrentTime()`. Card audio comes from hosted, openly licensed clips (lesson-eligible media), not YouTube spans. No downloads or caption scraping. **Video roles (decided 2026-11-03):** every chosen video is tagged with a role. A **main** video carries the lesson's explanation, so it must come with enough automatically obtainable information about its contents (a transcript, a summary, or its YouTube title, description and chapters) to build the rest of the lesson and its practice around it, and to let the lesson fill whatever the video doesn't explain. A video without that information can only be **supplemental**: watched for exposure or gist, never the thing the lesson's practice depends on. Doc 03 §1.8's `YT:` entries name channels, not videos, so this rule applies when specific videos are picked. **Length (decided 2026-11-03):** a `main` video may run as long as it needs. When a video carries a lesson's explanation, the written I do shrinks to the claim and its figure, and the lesson's minutes count the video. **Main videos play in full (decided 2026-11-03), never as spans:** the lesson's minutes count the whole video. A video that is `main` for several lessons plays in full in whichever of them the learner reaches first (a tested-out lesson doesn't count), and the others point back to it. | 05, 03, architecture |
| Visuals | **Decided 2026-11-03.** **Video:** embedded clips (YouTube embeds, per the Video row) wherever a clip serves the lesson better than a still. **Images:** no image-generation models. Lesson figures are assembled from an LLM-generated parts library, as in spike F's approach B: the authoring agent writes a scene spec (objects plus relations such as on, in, under, beside, heldBy; no coordinates), deterministic code does layout and draw order, and an automatic checker gates every figure. Each object kind is drawn once by an LLM in a render-and-critique loop, spot-checked once, then reused everywhere. Parts use theme tokens, so figures work in light and dark, and labels go through `t()`. Timelines, calendars and clocks for time words come from a small diagram renderer in the same library. | spike F (figure-drawing) |
| Native audio and TTS | **Decided 2026-11-03.** **Sentences:** AISHELL-3 and AISHELL-1 (OpenSLR 93 and 33, Apache 2.0; AISHELL-1's page also says "free for academic use", so confirm before shipping) are the main native sentence datasets. Spike B measured 148 of 158 S1/S2 lesson ideas covered by the two together. **Measured 2026-11-04:** that count was at stage level. Against what the learner knows in the first units, AISHELL has almost nothing, because it's news and assistant speech: lines of up to 14 characters with 是 number 1 with no unknown characters and 19 with one, and none for 叫 or 吗. So early examples and practice are ElevenLabs v4, and only openers, which are heard rather than understood word by word, use native lines beyond the path. Common Voice, THCHS-30, Tatoeba audio and Global Storybooks are dropped as sentence sources. **Gaps and generated text:** ElevenLabs `eleven_v4` with voices `ByhETIclHirOlWnWKhHc` and `DowyQ68vDpgFYdWVGjc3` covers ideas the datasets can't, and voices every procedurally (LLM) generated sentence: practice items, options and skill reviews. Library voices need a paid plan (Starter). Every clip, native or TTS, is normalized to −20 LUFS. The tone grader (spike tts-grader) is a triage gate, not a score. **Single syllables** (initial + final + tone, for tone drills): a dedicated syllable dataset first. `hugolpz/audio-cmn` (CC BY-SA) has all 1,707 toned syllables in one voice. Fall back to the user's local Yoyo Chinese pinyin-chart cache (403 syllables × 4 tones), which is personal-use only: never committed, never public, and only in the owner's own app builds. Openers still use real native media whenever possible. Earlier source notes: `hugolpz/audio-cmn` (CC BY-SA), Wikimedia Commons; **most Tatoeba Mandarin audio is unlicensed**. | 03, 05, spikes B, tts-grader |
| Licensing | Store a license record per item and file, and show a credit line plus a Credits page. Ship the CC-CEDICT, LGPL and Arphic license texts. Staying non-commercial keeps Grammar Wiki (NC) excerpts usable. | 03, 05 |

### Conflicts between docs, and the resolution recommended here

1. ~~Habit Health (01) vs streaks (04).~~ **Decided 2026-11-04 (Motivation row):** no streak. Days studied in the last 30 is the headline, with no target line.
2. **Three versions of the short session:** "Quick 15" (01), the "N-minute" builder (03) and the "bedtime button" (04). **Recommendation:** build one session builder (5 / 15–20 / 30 / 60 min). Its content comes from the current sub-phase (01's templates) and is assembled from lessons and 5-min review batches (03). Reaching the Floor (≥8 measured minutes) satisfies the day (04).
3. **English-subtitle Netflix.** 01 would log it as `background` (not counted). 04 counts it at 0.5 in hours. 03's evidence says English subtitles help you follow the story but do little for hearing the sounds. **Recommendation:** log it as its own subtitle mode and count it at 0.5 in input hours. Never count it as `background`, because the user is attending to it. Run 03's switch check after S1. *Needs user OK.*
4. **Review cap: cards (02) or minutes.** **Recommendation:** use minutes, converted to cards from the median seconds per card. This fits fragmented time and 01's minute-based SRS budget.
5. **Lesson and activity types.** The user rejected the archetypes translated from vue-crash-course (06) on 2026-11-02: they were ad hoc and included output tasks. Doc 07 replaces them. On 2026-11-03, Story, Showdown, Mystery and Discover came back as rotating lesson **openers**, and receptive practice formats rotate across lessons (brainstorm §4).
6. **Shadowing timing.** 06 put shadowing in the Phase 0–2 "we do". Refold puts chorusing at 3D/4A. Doc 07 cites perception gains from early shadowing (Hamada). **Recommendation (07):** make it optional from 1B, offered only once tone identification is accurate. Log it as `output`. *Needs user OK.*
7. **S0 is nearly all study** (now mostly moot, since the user tests out of most of S0). Doc 03's 12 Sounds units are almost 100% language-focused, against Nation's guideline (≤ about half early, ≤ about a quarter from 1C) and Refold's advice that sound study be "short and bounded". **Recommendation (07):** pair every S0 day with a scheduled Clip lesson (CI video), and run the tone trainer as a daily 5–10 min drill as well as inside lessons.
8. **Graph library.** 04 mentions React Flow "if the app is React". The user's last project was Vue, and Cytoscape.js is framework-agnostic either way, so the graph doesn't force a framework choice.

### Biggest risks

- **Content curation is the real cost.** About 200 lessons across 64 units need hand-picked native clips with timestamps (Common Voice transcript search is the fallback for grammar examples), plus hand-made line timings and transcripts, because YouTube captions can't be fetched for other people's videos. Plan it as its own workstream.
- **Card audio from YouTube spans.** Mounting one iframe per flashcard is heavy on a phone. Prototype it early, using a single reused player and pre-roll. Fall back to rehostable native audio for word cards.
- **FSRS-7 is days old.** Pin the version, keep full logs, and replay the history into FSRS-6 if it misbehaves.
- **Supabase Free pauses after ~7 idle days and has no backups.** The cron ping and weekly dump are MUST-haves, not extras.
- **Unverified items:** Netflix titles against the user's region; official Peppa Pig / Bluey Mandarin YouTube channels; whether `ts-fsrs` runs in Deno edge functions; Supabase Storage Range support.

### Open decisions for the user

1. ~~Simplified or Traditional?~~ **Decided 2026-11-02: simplified only.** `zh` is a language code; script is a display setting.
2. Bring back "we do" guided practice, unlike vue-crash-course? (Recommended: yes. Doc 07's evidence supports it.)
3. ~~Adopt doc 07's framework?~~ **Decided 2026-11-03:** doc 07's shapes and catalog, with rotating openers and practice formats (each format introduced once, in one line) instead of a wildcard cap, and skill cards in the SRS.
4. Shadowing: none until Phase 3D, optional and perception-gated from 1B (recommended), or in every "we do"?
5. Accept Refold's near-zero meaningful output for ~1,500 h, given that a meta-analysis found production practice wins on delayed productive tests?
6. How should English-subtitle Netflix count (resolution 3)?
7. Should flashcards use 2-button (Again/Good, recommended for the phone) or 4-button grading?
8. ~~Card on file for R2?~~ **Decided: OK, with a ceiling of about $10/month.** R2 is not used unless media outgrows Supabase Storage.
9. Should XP be visible at all, or only rings, hours and mastery?
10. ~~Lesson authoring?~~ **Proposed in the architecture:** repo-only markdown, compiled into a private bundle in Supabase Storage that each app build pins.
11. Who curates the clips and timestamps for the ~200 lessons, and when?
12. Is the app non-commercial forever? That keeps the CC BY-NC sources usable.
13. ~~Frontend framework?~~ **Proposed in the architecture:** Vue 3 + TS + Vite PWA.
14. Vocab card voice: when the example sentence is a native AISHELL clip, should the word audio be cut from that same clip (one speaker, but in-sentence pronunciation), or should both come from one ElevenLabs v4 voice (clean citation form, but TTS)?
