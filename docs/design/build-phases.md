# Build phases

Proposed 2026-11-04. This doc owns the build order. The [architecture](architecture.html) owns the system design, the [lesson plans](lesson-plans/README.md) own what each lesson teaches, and the [README synthesis](../research/README.md#cross-topic-synthesis) owns decisions.

## 1. Objective

Build one thin but complete version of every core system on a six-lesson pilot, and use it until the content feels right, before committing to a lesson style.

**The pilot's job is to settle the style.** Every later lesson copies what the pilot locks in: how an opener hooks, how long the I do runs, how examples and practice feel, what a card looks like, which voices and images work. Changing that across six lessons is cheap. Changing it across 194 isn't.

Everything runs locally until the systems work together. The pilot then moves to the hosted free tiers for a short trial, and the [style gate](#61-style-gate) locks the style. A first batch of 30 lessons then builds the remaining formats and tests whether authoring scales, and the [scale check](#62-scale-check) decides on the last 158.

## 2. Requirements

- **Real code, not a demo.** The slice is built in the architecture's layout (`apps/web`, `packages/core`, `packages/content-tools`, `languages/zh`, `content/`, `tools/media-ingest`, `supabase/`). What passes the gate stays.
- **Nothing depends on `sandbox/`.** Spike code is copied and rewritten into its production home (§4.2). Data that production needs is imported into `content/`.
- **No manual curation.** Every content step is scripted or done by an agent and gated by automatic checks. The owner only spot-checks and judges feel.
- **Same contracts locally and hosted.** The two environments differ only in environment variables, so nothing built locally has to be rebuilt for hosting.
- **Additive graph.** A gap the pilot exposes becomes a new unit or edge, not a reshuffle ([dependency review](lesson-plans/review-2026-11-03/README.md)).
- **Cost:** $0 hosting with the ~$10 a month ceiling, plus the ElevenLabs Starter plan already in use.

## 3. Lesson sets

### 3.1 The pilot: six lessons

| Lesson | Shape | Opener | Practice | Min | What it lets you judge |
|---|---|---|---|---|---|
| 0.1a Each tone is a pitch shape | Sound | Mystery | C0 | 5 | A sound lesson, syllable audio, a contour figure |
| 0.14b Checkpoint: tones and pairs | Checkpoint | none | C0 | 7 | Test-out and the checkpoint result |
| 1.1a 是 links two nouns | Pattern | Discover | C0 | 6 | The core grammar lesson, with native AISHELL examples |
| 1.1b 叫 gives your name | Pattern | Showdown | C0 | 5 | A second pattern lesson, so style differences show |
| 1.1c Meeting someone | Clip | Story | C1 | 7 | A clip lesson and ElevenLabs dialogue |
| 1.2a 吗 makes a yes-no question | Pattern | Showdown | C0 | 16 | A lesson built around a full `main` video (13:22) |

**Totals:** 46 minutes, 21 words and 5 skill cards, with all four shapes and all four openers. Unit 1.1 is whole, so 1.2a's prereq holds. The rest of S0 is covered by self-report, the way the owner will really use it. 1.1b's `main` video is still `to find`; an agent finds it in Phase 1 under the README Video row's rules.

**Not in the pilot:** formats C2–C8, parts-library scenes and the diagram renderer. They're built in Phase 7, after the style is set. A format's content rules come from the pilot; only its interaction is new.

### 3.2 The first batch: 30 lessons

0.1b, 0.1c, 0.13b, the rest of units 1.2–1.10 (25 lessons), 1.11a and 1.19a: 207 minutes. With the pilot, that's a prereq-closed set of 36 lessons (18.6% of 194) that reaches every shape, opener and format, plus parts-library scenes (1.5b, 1.6a, 1.9b) and the diagram renderer (1.10c). It brings 164 lesson, unit and prep words, 34 skill cards and S1's queue of 196 words.

Its other `to find` videos are 1.2c, 1.4a, 1.5b and 1.8a.

## 4. Interfaces and code homes

The architecture's contracts stand, except for the changes below.

### 4.1 Contract changes

These come from the spikes and aren't in the architecture yet. Phase 0 writes them into it.

**Events** (`packages/core/events.ts`; spike D §3):

```ts
interface EventEnvelope {
  device_seq: number                 // added: per-device counter, so gaps are detectable
  // id, kind, v, lang, occurred_at, device_id, build, payload as before
}
type Event =
  | { kind: 'review'; v: 1; cardId: CardId; rating: Rating; durationMs: number
      dueAt: number                  // added: the device's load-balanced due date
      prevReviewId: string | null }  // added: guards dueAt during replay
  | { kind: 'device'; v: 1; reason: 'hello' | 'day' }   // added: proves a device has flushed
  | { kind: 'day_closed'; v: 1; date: string; xp: number; credit: Credit
      rules: Record<string, string>
      minutes: number                // added: 2 dp, never a raw float
      basis: 'settled' | 'grace' }   // added
  // the other kinds are unchanged; synced settings gain studyTz and dayStartHour
```

**Push** (`supabase/migrations/`). Client inserts go through one serialized function, so `seq` can't commit out of order and skip a pull cursor (spike D, C1):

```sql
create function push_events(batch jsonb) returns void  -- idempotent; takes an advisory lock
```

**Vocab card** (`languages/zh/logic/cards.ts`, compiled by `content:build`). It follows the README Vocab card format. One `voice` field makes a two-voice card impossible to express, and `image` makes "no image" a normal state:

```ts
interface VocabCard {
  itemId: ItemId
  word: RubyToken[]                     // pinyin above each character
  senses: string[]                      // 1–3, only those that apply where the word is learned
  sentence: { tokens: RubyToken[]; target: [start: number, end: number]; translation: StringKey }
  audio: { voice: SpeakerId; word: MediaId; sentence: MediaId }
  image: { media: MediaId } | { none: 'no_candidate' | 'gate_failed' | 'hazard' }
}
```

**Check rules** (`packages/content-tools`). These join the rule ids from spike E:

| Rule | Fails when |
|---|---|
| `DEP001` | An item's words, grammar or interleaved confusables aren't on its lesson's prereq path (brainstorm §4.5) |
| `DEP002` | A lesson's target word isn't in that lesson's tier |
| `VOC001` | A placement rule breaks (`check_vocab.py`'s list) |
| `MED002` | A card's word and sentence audio have different voices, or a clip isn't at −20 LUFS |
| `LIC001` | An image or clip has no source, author or license record |

### 4.2 Where each spike goes

| Spike | Production home | What carries over |
|---|---|---|
| sync-replay | `packages/core` (events, srs, derive) | Fixes C1–C7, the settled day-close rule, the per-card cache, fast-check properties, queue defaults |
| authoring-format | `packages/content-tools`, `languages/zh` | The format with its six syntax changes, rule ids, build-time `analyze()`, hash-named build |
| activity-pilot | `apps/web` | Lesson arc steps, trial runner, widgets and their feel knobs, i18n tables |
| media-ingest, tts-grader, elevenlabs-check | `tools/media-ingest` | Whisper validation, the tone gate, TTS synthesis, loudness normalization |
| clip-coverage | `content:suggest` | Sentence matching against AISHELL transcripts |
| image-retrieval | `tools/media-ingest/images/` | The matcher and gates from the Card images row |
| figure-drawing | `packages/content-tools/figures/`, `content/shared/figures/` | Scene specs, layout, parts library, diagram renderer, figure checker |
| dependency-check | `packages/content-tools` (`DEP001`, `DEP002`, `VOC001`) | Rewritten against authored items, so it stops being noisy |
| review-load | Stays in `sandbox/` | Rerun at the scale check with measured seconds per card |

## 5. Local and hosted

| Piece | Phases 0–5 (local) | Phase 6 on (hosted) |
|---|---|---|
| Database, auth, storage | Supabase CLI stack in Docker | Supabase Free |
| Sign-in email | Captured by Mailpit (`supabase status` shows its URL); the code is read there | Real email codes |
| App | Vite dev server | Cloudflare Pages |
| Content and media | `content:build` uploads to the local bucket | CI uploads to the private bucket |
| Phone | HTTPS on the Wi-Fi network | The public URL |
| Pipelines | Laptop | Laptop |

**Phone access.** Service workers need a secure origin, so plain `http://<laptop-ip>` isn't enough. Vite serves HTTPS with a `mkcert` certificate the phone trusts, and proxies `/supabase` to the local gateway, so the app sees one origin. Phase 0 proves this, including whether YouTube embeds accept that origin.

**Not installed yet:** Docker Desktop (WSL2 backend), the Supabase CLI (`scoop install supabase`, or per project through npm) and pnpm. Installing Docker Desktop and accepting its terms is the owner's step. Leave Supabase analytics off, since on Windows it needs extra daemon setup ([Supabase CLI docs](https://supabase.com/docs/guides/local-development/cli/getting-started)).

## 6. The two checkpoints

### 6.1 Style gate

After Phase 6. The question is whether the content feels right. The owner judges each row after using the pilot daily. A "no" sends that element back to Phase 5.

| Element | The question |
|---|---|
| Opener | Does it make you want the answer? |
| I do | Is the explanation the right length, and does a long video work in a lesson? |
| Examples | Do they show the idea in action, with enough variety? |
| Practice | Is the difficulty right, and does it test the idea, not just the word? |
| End card and pacing | Does a lesson end well, and does the length suit a short session? |
| Vocab card | Is the layout right, and are the definitions, sentence and image helpful? |
| Skill card | Does the review feel like a quick version of the lesson? |
| Audio | Are native and ElevenLabs clips both good to learn from, and do they sit well together? |
| Overall | Would you keep using this every day? |

Hard checks at the same gate: no lost or diverged events during the trial, every day closes correctly, and a warm lesson starts within 1.5 s.

**Output: the locked style.** `lesson-writing-style.md`, `content/zh/templates/` and the six lessons as reference lessons, which every later draft copies and which must keep passing `content:check`.

**Outcomes:**
- **Lock:** go to Phase 7.
- **Revise:** rework the elements marked no, and repeat only those.
- **Rethink:** the lessons don't work as a form. Change the design before building more.

### 6.2 Scale check

After Phase 7, with 36 lessons in use. The question is whether the locked style can be produced and sustained at volume. Targets are proposals until the owner sets them at the end of the style gate.

| Question | Measure | Target |
|---|---|---|
| Do lessons fit? | Real minutes against planned | Median within ±30% |
| Can agents author it? | Lessons passing `content:check` with no hand edit; owner minutes per lesson | ≥90%; ≤5 min |
| Is audio good enough? | Items with audio passing the gates; native share | ≥95%; measured |
| Do images work? | Cards with a passing image; wrong images among those shown, from a blind sample | ≥60%; ≤5% |
| Is the review load sustainable? | Real seconds per card, retention and SRS minutes at ~17 new cards a day | ≤30 min a day; retention 0.85–0.95 |
| Is the pace real? | `review-load` rerun with measured numbers | S1–S2 fits about 3 months (1,552 cards ÷ 90 days ≈ 17 a day) |
| Does it fit the budget? | Storage and ElevenLabs use for 36 lessons × 5.4 | Under 1 GB, or R2 costed; inside the ceiling |
| Is it fast enough? | Derive on the phone | No visible stall |

A miss means fixing that system and repeating that measurement before Phase 8.

## 7. Phases

Each phase ends with something that runs, and with its tests passing.

### Phase 0: Local foundation

Purpose: everything talks to everything, locally.
- Update the architecture with §4.1 and the other corrections in spike D §7 and spike E §6.
- Set up the pnpm workspace, TypeScript, dependency-cruiser rules, the CJK lint and CI.
- `packages/core`: ids and events. `languages/zh` and `languages/_toy` stubs.
- `supabase/`: `config.toml`, the events table, RLS, `push_events`, the private bucket, the owner account.
- `apps/web`: sign-in, event store, outbox, pull.
- Phone access (§5).

**Done when** a phone signs in, records an event that the laptop pulls, plays a clip from the local bucket and plays a YouTube embed.

### Phase 1: Content spine

Purpose: the pilot goes from source to compiled bundle with no manual step.
- Import into `content/zh/`: curriculum and prereqs (doc 03), vocab placement, the HSK list, and the dictionary.
- `packages/content-tools`: parse, resolve, check (with §4.1's rules), build, upload.
- `tools/media-ingest`: selective AISHELL extraction (only the chosen utterances; the full corpora aren't local), audio-cmn syllables, ElevenLabs synthesis, normalization, tone gate, quarantine report.
- The Claude drafting loop: draft, check, fix. Author the pilot from its lesson plans.
- Credits data: a license record on every file.

**Done when** the pilot builds from a clean checkout, `content:check` passes, and the manifest loads in the app. Record minutes and ElevenLabs characters per lesson from here on.

### Phase 2: Lesson player

Purpose: a lesson plays the way the plans describe.
- Lesson arc, widget registry, trial runner, media adapter (AISHELL and TTS clips, YouTube with full-play tracking).
- C0 and C1 widgets, and the pilot's figures.
- Format intros on first appearance on the path. The checkpoint runner for 0.14b.
- Evidence events, and derive v1 for lesson status and mastery.
- A note button on every lesson step and card, stored as a `flag` event, so style reactions are captured in the moment.

**Done when** all six lessons play on the phone, resume after the app is killed, and sync to the laptop.

### Phase 3: Daily loop

Purpose: lessons feed cards, and the day runs itself.
- SRS replay with pinned `ts-fsrs`, and the queue policy with spike D's defaults.
- The vocab card and skill card.
- New-card feed: lesson and unit words at the end card, prep with deadlines, the queue in frequency order, and the first-look step for queue words.
- Session builder, settled day close, per-card cache.

**Done when** the 15-minute bedtime flow works offline on the phone, and spike D's two-device properties pass on the real code.

### Phase 4: Product surfaces

Purpose: every system has its screen.
- Today, Path, Unit view and the graph map. Progress meters and Weekly review.
- Item detail, the Watch log, test-out and self-report.
- First-run setup, Settings, Credits, and the support-language toggle.
- Service worker and offline cache.

**Done when** each screen in [app-ui-flow](app-ui-flow.md) works with the pilot's data, and a new account can self-report S0 and reach unit 1.1.

### Phase 5: Style pass

Purpose: get the content right while it's cheap to change.
- Card images: finish the stopped spike on the pilot's real sentences, set the gate thresholds, and generate images for all 21 words.
- Add about 20 S1 queue words, so the first-look step can be judged.
- Use the pilot on the phone and work through the notes: rewrite lessons, cards, copy, pacing and voices, then rebuild.
- Compare the card voice options (open decision 14) by ear on real cards.

**Done when** the owner has no open style notes, and is ready to try it as a daily routine.

### Phase 6: Hosted trial

Purpose: real conditions, on the real stack.
- Create the Supabase project and Pages site, and apply migrations.
- CI: check, build, upload, deploy.
- The weekly ping and backup, plus one restore drill from a dump.
- Confirm the AISHELL-1 terms, or use AISHELL-3 only.
- Use the app daily for 7 days on phone and laptop, then work through the style gate.

**Done when** the style gate's outcome is Lock, and the locked style is committed.

### Phase 7: First batch

Purpose: finish the systems, and prove the locked style at volume.
- Author the 30 lessons (§3.2) from the reference lessons, with no change to the process.
- Widgets for C2–C8.
- Figures: parts library, scene specs, diagram renderer, figure checker.
- Card images for every word in the set, and the rest of the queue feed.
- Use it daily for at least 14 days at ~17 new cards a day, then fill in the scale check.

**Done when** all 36 lessons pass `content:check`, every card has audio and an image or a recorded reason for none, and the scale check is complete.

### Phase 8: Scale content

Purpose: the remaining 158 lessons.
- Author in unit order by stage. Each batch passes `content:check` and a sampled review.
- Run an adversarial accuracy review on each stage, since false claims recur in generated content.
- Add S0's remaining lessons and checkpoints when the owner's test-out needs them.

**Done when** all 194 lessons are deployed and a stage checkpoint has been passed on each stage.

### Phase 9: Hardening and cleanup

Purpose: remove what the build left behind.
- Availability check for YouTube embeds, with ranked fallbacks.
- Remove superseded rule versions and provisional fields.
- Update the TDD to match the build, or mark it superseded.
- Regenerate doc 03's Prereqs column as a planning view from `content/zh/curriculum.ts`.
- Delete the sandbox spikes whose code has moved.

**Done when** the checklist is empty and nothing references `sandbox/` or a superseded doc.

## 8. Decisions needed

The pilot uses these defaults unless the owner says otherwise. Each is cheap to change until the style gate.

| Needed by | Decision | Pilot default |
|---|---|---|
| Phase 1 | Definitions: CC-CEDICT, Wiktionary, LLM-written explanations checked automatically? | Yes |
| Phase 5 | Card voice (README open decision 14) | One ElevenLabs v4 voice for word and sentence |
| Phase 3 | Card grading (open decision 7) | 2 buttons, Again and Good |
| Phase 3 | Do lesson trials touch FSRS? (TDD open question 2) | No: mastery evidence only |
| Phase 4 | XP visibility (open decision 9) | Hidden; minutes and rings only |
| Phase 4 | English-subtitle Netflix (open decision 6) | Its own subtitle mode, counted at 0.5 |
| Style gate | Scale check targets (§6.2) | As proposed |

Shadowing (open decision 4) stays out of the pilot.

## 9. Implementation guidance

- **Build the contract first.** Each phase starts from the architecture's contract and its tests, then adds the screen. Golden fixtures and two-device properties live in `packages/core`.
- **One writer for each fact.** Events are the only user write path; `content/` is the only content source.
- **Measure from Phase 1.** Log per-lesson minutes, characters and quarantine counts as they happen, since the scale check needs them and they can't be reconstructed.
- **Prefer what spikes already proved.** Rewrite to production quality, but don't redesign something a spike settled unless the pilot shows a problem.
- **Don't build ahead of the pilot.** Before the style gate: no widgets, figures or tooling the six lessons don't use. Before the scale check: no batch dashboards, no incremental derive beyond the per-card cache, and no language switcher.
