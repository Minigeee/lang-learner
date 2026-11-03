# TDD: Curriculum data model and authoring format

**Status:** proposed, 2026-11-02. **Scope:** how curriculum content is modeled, written, checked and shipped, and how user state refers to it. The player UI, the SRS queue (doc 02) and the knowledge-graph view (doc 04) are covered only where they touch this model.
**Binding inputs:** [08 Curriculum structure review](../research/08-curriculum-structure-review.md) (principles), [06](../research/06-lesson-design.md) (skeleton), [07](../research/07-activity-types.md) (T1–T18, D1–D7), [02 §5](../research/02-srs-algorithms.md) (cards and review logs), [04 §4](../research/04-progression-systems.md) (graph and mastery), [03 §1.8 and §3](../research/03-mandarin-curriculum-and-materials.md) (units, sources, open data), [activity-brainstorm](activity-brainstorm.md) (interactables X1–X24, feedback and "unseen" rules), and the vue-crash-course authoring system.

---

## 1. Objective

Build a curriculum format in which a lesson can be drafted in about an hour, by hand or by Claude, and checked by a script before it ships. The format must keep changing for months (v1 exists to refine the format) without losing or misstating any progress. The design gets there by separating three kinds of data:

1. **Authored content** lives in the repo, is compiled to a static bundle, and is identified by stable ids.
2. **User state** lives in Postgres and holds only facts that point at those ids.
3. **Derived data** (categories, XP, mastery, lesson status) is computed from facts by versioned functions and is never stored as truth.

Content can then be reordered, split, rewritten or re-templated freely, because user state never depends on its shape.

## 2. Requirements

| # | Requirement | Source |
|---|---|---|
| R1 | **Fast authoring.** A lesson is one file, scaffolded from a template. It refers to things by id, gets per-line errors from a check script, and is easy for Claude to draft from a generated reference. | brief, 06 |
| R2 | **Refinable without breaking progress.** Splitting, merging, reordering or rewriting lessons, and changing templates, widget configs or mapping rules, never orphans or misstates progress. | 08 F1–F3 |
| R3 | **Native-only media with license records.** Every Chinese example plays a native recording. Every media item carries rights and attribution, and a Credits page is generated. YouTube is embed-only. | README, 05 |
| R4 | **Phone-first player.** It loads one small compiled lesson at a time and resumes at activity boundaries. It uses a single shared YouTube player, queues facts offline, and follows the brainstorm's §1.0 layout rules. | README, brainstorm |
| R5 | **One owner.** There is no CMS, no roles and no multi-tenant content. `user_id` and RLS stay, because Supabase auth requires them and they cost nothing. | README |
| R6 | **v1 = HSK 2025 levels 1–3** (S0–S2, about 140 lessons). The graph is seeded with all HSK levels so that mining beyond L3 has somewhere to live. | README, 08 F8 |
| R7 | **Input before output.** Phases 0–2 allow output levels 0–1 only. | 07 |
| R8 | **Project rule:** design to AGENTS.md "Code health": boundaries around volatile decisions, deep interfaces, invalid states hard to express. | AGENTS.md |

## 3. Decisions at a glance

| Decision | Choice | Main trade-off |
|---|---|---|
| Where content lives (README open decision 10) | **The repo.** Content is compiled to a static, content-addressed JSON bundle served with the app. **No content is synced into Postgres.** | Lessons can't be edited from the phone. Mitigation: a `content_flags` table collects fixes noted on the phone, and the GitHub web editor plus CI handles small edits. Postgres can't foreign-key to content ids, so ids are checked at the write boundary and by an orphan check. |
| Frontend (open decision 13) | **Vue 3 + TypeScript + Vite SPA** (not VitePress, which is a docs generator). Only `app/` and `View.vue` files depend on Vue. The content model, compiler, check script and derive functions are plain TS. | Switching framework would mean rewriting the player and widget views only. |
| Lesson syntax | **Markdown with light YAML frontmatter.** Skeleton slots are `:::slot` containers, interactables are ```` ```@widget ```` fenced YAML blocks, and Chinese examples are inline `:ex[…]{clip=…}` directives. | YAML inside fences gets no editor schema help. Mitigation: the check script gives line-precise errors and a widget reference is generated (§6.5). |
| Structure source | **One TS module, `content/curriculum/`,** owns order, membership, titles, ideas, `teaches` and `assumes`, as `curriculum.ts` did in vue-crash-course. | Slightly more ceremony than frontmatter-only, in exchange for planning and order-checking all ~200 lessons before they're written. |
| Templates (shapes) | A template **scaffolds** a lesson file and **declares the rules** the check enforces. There is no runtime inheritance. | Changing a template doesn't rewrite old lessons; the check lists the lessons that now violate it. |
| Feedback, retries, novelty | **Owned by the runtime, not by widgets.** | Widgets lose some freedom, but every widget gets the brainstorm's §3 rules for free. |
| Validation library | Zod 4 schemas, used at build time only (with JSON Schema export). | Neither the bundle nor the app ships a runtime validator for content. |

## 4. Boundaries and contracts

### 4.1 Three kinds of data

| Kind | Examples | Lives in | Owner and mutation | Identity |
|---|---|---|---|---|
| **Authored content** | knowledge items, edges, curriculum, lessons, templates, media, clips, speakers, licenses, datasets | `content/` in git, compiled to `dist/content/<release>/` | Author only, through commits. Git is the history. | Stable prefixed ids (§5.1) |
| **User state (facts)** | sessions, activity spans, trials, claims, exposures, review logs, comprehension ratings, lesson runs, notes, cards, mined sentences, content flags | Supabase Postgres | Facts are append-only. Only scheduling state (`cards`), resume cursors and flag resolution are updatable. | uuid, client-generated |
| **Derived data** | Refold category, Nation strand, bucket, XP, Habit-Health credit, mastery state, lesson status, the variety-matrix report | Computed in TS; cached per device in IndexedDB | Nobody writes it. Caches are keyed by rule version and are always safe to delete. | None |

**Invariant:** no Postgres column stores a derived value, and no content file stores user state.

### 4.2 Decisions hidden behind boundaries

| Volatile decision | Hidden in | What callers see |
|---|---|---|
| Media provider (YouTube IFrame, R2 audio, a future host) | `src/media/`: one shared player per lesson; exposure recording | `ClipId` → `PlayableClip`, plus `play/stop/onLine` events. Content never names a provider outside media records. |
| Which clip fills a slot (ranked fallbacks, dead embeds, "unseen", speaker rules) | `src/media/clipResolver.ts` | `resolve(slotOrPool, ctx) → ResolvedClip | Unfillable` |
| Feedback timing, retry queue, missed item → card | `src/player/trialRunner.ts` | Widgets receive `TrialItem`s and call `respond()` (§7) |
| Mastery rule, lesson status | `src/derive/mastery.ts`, `src/derive/lessonStatus.ts` | `masteryOf(itemId)`, `lessonStatus(lessonId)` |
| XP, category, strand, bucket mappings | `src/derive/*` | Pure functions of facts plus a rule version |
| FSRS version and parameters | `src/srs/` (doc 02) | `Card`, `review()`, `stability`. Mastery reads `stability` only. |
| Lesson file syntax | `src/content-model/compiler/` | `CompiledLesson` JSON |
| Seed dataset formats (hsk30, CC-CEDICT, Make Me a Hanzi) | `scripts/import/*` | `KnowledgeItem`, `Edge`, dictionary shards |
| Storage and sync (Supabase, offline outbox) | `src/facts/` | `record*()` writers and typed query functions |
| Widget implementation | the interactable registry | a widget name, a validated config, and a View |

### 4.3 Contracts at the main boundaries

- **Content bundle → app.** Each bundle is immutable and versioned by `release` (the git SHA), and each lesson file carries its `hash`. The app may assume:
  - every id it contains resolves inside the same bundle;
  - every config has already been validated and migrated to the current widget version;
  - every retired id is listed in `redirects`.
- **App → facts.** Callers pass ids that exist in the current bundle (a precondition, asserted in development). `src/facts` guarantees idempotent writes (client uuids), eventual delivery from the IndexedDB outbox, and append-only storage. It does not promise ordering across tables. Derive functions must not depend on arrival order; they order by the event timestamps.
- **Facts → derive.** Derive functions are pure: the same facts, bundle and rule version always give the same output. They tolerate unknown ids (an orphaned fact is ignored and counted, never thrown).

---

## 5. Entity model

### 5.1 Ids

Every id is `<prefix>:<key>`. The prefix decides the type, and the key never encodes position, level or an external label (08 F3).

```ts
// src/content-model/ids.ts: the id grammar. parseId() enforces it at every boundary.
export type WordId          = `w:${string}:${string}` // w:<simplified>:<pinyin, a tone digit 1–5 after each syllable, ü as v>, e.g. w:行:hang2, w:爸爸:ba4ba5
export type CharId          = `c:${string}`           // exactly one code point: c:好
export type ComponentId     = `cmp:${string}`         // a component-only form: cmp:氵. A component that is also a character is just its c: id
export type GrammarId       = `g:${string}`           // our own slug: g:le-completion (Grammar Wiki is an attribute)
export type SoundContrastId = `sc:${string}`          // sc:tone2-tone3, sc:zh-j
export type SoundRuleId     = `sr:${string}`          // sr:third-tone-sandhi, sr:bu-sandhi
export type KnowledgeId = WordId | CharId | ComponentId | GrammarId | SoundContrastId | SoundRuleId

export type StageId = `stage:${string}`; export type UnitId = `unit:${string}`; export type LessonId = `les:${string}`
export type MediaId = `media:${string}`; export type ClipId = `clip:${string}`; export type SpeakerId = `spk:${string}`
export type LicenseId = `lic:${string}`; export type DatasetId = `ds:${string}`; export type TemplateName = string
```

**Word ids are computed from a natural key (hanzi plus citation pinyin), not assigned.** As a result, any CC-CEDICT entry has a valid id even though it isn't seeded as an item. A word mined from Netflix gets a note and evidence without anyone importing 125k items. Homographs separate naturally (`w:行:xing2`, `w:行:hang2`).

**Sound contrasts and sound rules are separate kinds** (this answers 08 open question 2). A drill trial scores the contrast itself (`sc:tone2-tone3`). Sandhi and the 一/不 rules are rules (`sr:`), not contrasts. Tone pairs start as contrasts. A future split into per-sound items is a redirect (§8.5).

### 5.2 Knowledge items and edges

```ts
// src/content-model/types.ts
interface SyllabusLevel { syllabus: 'hsk2025' | 'hsk2021' | 'hsk2.0'; level: number }   // a tag, never structure
interface SourceRef { dataset: DatasetId; version: string }                               // ties the record to its license
interface ExternalRef { site: 'cgw'; code?: string; url: string }                         // Chinese Grammar Wiki (NC): a link, never copied text

type KnowledgeItem =
  | { kind: 'word';           id: WordId;          hanzi: string; pinyin: string; gloss: string[]; levels: SyllabusLevel[]; sources: SourceRef[] }
  | { kind: 'char';           id: CharId;          ids?: string /* IDS decomposition */; radical?: string; levels: SyllabusLevel[]; sources: SourceRef[] }
  | { kind: 'component';      id: ComponentId;     form: string; meaning: string; variantOf?: CharId; sources: SourceRef[] }
  | { kind: 'grammar';        id: GrammarId;       name: string; pattern: string; refs: ExternalRef[]; levels: SyllabusLevel[] }
  | { kind: 'sound_contrast'; id: SoundContrastId; axis: 'tone' | 'initial' | 'final'; members: [string, string, ...string[]] }
  | { kind: 'sound_rule';     id: SoundRuleId;     name: string; statement: string }

// Edges hold facts only. Implicit-credit weights are a derive rule keyed by edge kind (doc 04), not stored here.
type Edge =
  | { kind: 'composes';   from: CharId | ComponentId; to: CharId }        // seeded from Make Me a Hanzi
  | { kind: 'appears_in'; from: CharId; to: WordId }                      // seeded from word hanzi
  | { kind: 'prereq';     from: KnowledgeId; to: KnowledgeId }            // `to` builds on `from`; authored; at most 3 per grammar item (warn)
  | { kind: 'confusable'; members: [KnowledgeId, KnowledgeId, ...KnowledgeId[]] }  // authored; feeds interleaving (07 rule 3)
```

The edge union makes it impossible to write a `composes` edge from a word, or a `confusable` set with one member.

### 5.3 Curriculum: stages, units, lessons

```ts
// content/curriculum/index.ts composes s0.ts, s1.ts and s2.ts. Array order is THE ordering source (08 F7).
interface Stage { id: StageId; title: string; units: Unit[] }
interface Unit  { id: UnitId; title: string; lessons: LessonPlan[] }
interface LessonPlan {
  id: LessonId
  title: string
  idea: string               // 1–2 sentences, shown before the lesson and as the refresher on prereq chips
  template: TemplateName     // 'sound' | 'pattern' | 'clip' | 'checkpoint' at first; the set is data
  teaches: KnowledgeId[]     // ≥1. Completing or testing out writes evidence onto these (08 F1)
  assumes?: KnowledgeId[]    // used but not taught here; must be taught earlier (check ORD001)
}
```

Display numbers ("1.13") are computed from position. A lesson with no file shows as "soon", as in vue-crash-course. **Prerequisites live on knowledge items** (`prereq` edges), not on lessons or units. Lesson- and unit-level prerequisites are derived: lesson L depends on the lessons that teach the prereqs of L's `teaches`. The "Prereqs" column being added to 03 §1.8 is a planning input. `content:plan` prints the derived unit prerequisites so the two can be compared, and the item edges win.

### 5.4 Skeleton slots, activity instances, templates

The skeleton is a **code constant**, because the player renders slots, never shapes (08 F6):

```ts
export const SLOTS = ['hear', 'explain', 'we-do', 'you-do', 'recap', 'cards', 'deeper'] as const
export type SlotName = typeof SLOTS[number]

interface InstanceBase { key?: string; optional?: boolean; reason?: string /* required when the widget isn't the template default: the matrix's "named alternative" */ }
// ActivityInstance is DERIVED from the registry (§7), so it is a discriminated union on `widget` that no one maintains by hand.
type ActivityInstance = { [W in WidgetName]: InstanceBase & { widget: W; config: ConfigOf<W> } }[WidgetName]

type Block =
  | { kind: 'prose'; mdast: Root }                        // explanation text, with :ex/:bad/:k/:w resolved
  | { kind: 'interactable'; instance: ActivityInstance }  // activities and figures alike
type ClipRef = ClipId | { slot: string }                  // a named clip slot from the frontmatter

interface CompiledLesson {
  id: LessonId; hash: string; release: string
  plan: LessonPlan
  support: SupportStage                   // derived from position in the unit (brainstorm X5 fading); a lesson may override it
  clipSlots: Record<string, ClipSlot>
  slots: Partial<Record<SlotName, Block[]>>
  cards: CardSpec[]
  estimateSec: number                     // summed from widget estimates and reading time; never hand-entered
}
```

A template is data:

```yaml
# content/templates/pattern.yaml
template: pattern
budgets: { explainWords: 200, minutes: [5, 7] }
slots:
  hear:   { required: true,  defaults: [clip-stage] }
  explain:{ required: true,  requires: [mistake-pair] }
  we-do:  { required: true,  defaults: [timeline-picker, meaning-grid, confusable-sorter], allow: [tap-when-you-hear, recall-flip] }
  you-do: { required: true,  defaults: [timeline-picker, meaning-grid], allow: [tap-when-you-hear, gist-question] }
  recap:  { required: true,  bullets: 3 }
  cards:  { required: true }
  deeper: { required: false }
scaffold: scaffolds/pattern.md     # the text `content:new` writes, with TODO markers
```

### 5.5 Media, clips, speakers, transcript lines, licenses

> **Constraint (2026-11-02):** a clip used by any lesson slot must have a transcript obtained automatically from a permitted source (README "User's study parameters"). Media without one can only be a unit's free-watch item, and the check script rejects a lesson slot that references such media.

```ts
// Rights are tied to the provider at the type level: a YouTube item can't claim rehost rights or carry a storage key.
type Media =
  | { id: MediaId; title: string; context: MediaContext; durationSec: number; speakers: SpeakerId[]; status: 'active' | 'retired'
      source: { provider: 'youtube'; videoId: string }; rights: { kind: 'embed' } }
  | { id: MediaId; title: string; context: MediaContext; durationSec: number; speakers: SpeakerId[]; status: 'active' | 'retired'
      source: { provider: 'r2'; key: string; mime: 'audio/mpeg' | 'audio/ogg' | 'audio/mp4' | 'video/mp4' }
      rights: { kind: 'open'; license: LicenseId; author: string; sourceUrl: string; modified: boolean } | { kind: 'own' } }
type MediaContext = 'ci-teacher' | 'kids-show' | 'vlog' | 'interview' | 'read-aloud' | 'storybook' | 'word-audio'  // matrix "contexts" (brainstorm §4)

interface Clip {
  id: ClipId; media: MediaId; span: [startSec: number, endSec: number]
  lines: Line[]                       // ordered, non-overlapping, inside the span
  questions?: GistQuestion[]          // live on the clip, so any lesson can reuse the clip as a you-do
}
interface Line {
  t: [number, number]; zh: string
  py?: string                         // override only; otherwise generated with pinyin-pro at build
  en?: string; speaker?: SpeakerId
  tags?: KnowledgeId[]                // what this line exemplifies. Clip-level "exemplifies" is the union of its lines' tags
  words?: Record<string, WordId>      // segmentation overrides for polyphones (了, 长, 行)
}
interface GistQuestion { ask: string; choices: string[]; answer: number; tests?: KnowledgeId[]; line?: number /* where the answer is said (brainstorm Q8) */ }
interface Speaker { id: SpeakerId; label: string; sex?: 'f' | 'm'; accent?: string; pace?: 'slow' | 'natural' | 'fast' }  // Common Voice speakers stay opaque ids
interface License { id: LicenseId; name: string; url: string; requires: ('attribution' | 'share-alike' | 'no-download' | 'no-overlay')[]; nonCommercialOnly: boolean; textFile?: string }
```

Transcript lines are **internal to their clip**. Nothing outside a clip refers to a line by index. A sentence card's audio is a one-line clip, so retiming lines never breaks a reference.

### 5.6 User state (SQL sketch)

Content ids are `text` columns whose shape is checked in SQL. Existence is checked in `src/facts` at write time and by `content:orphans`.

```sql
-- supabase/migrations/0001_user_state.sql (sketch). RLS on every table: user_id = auth.uid().
-- Facts tables get INSERT and SELECT policies only: append-only by construction.
create domain knowledge_id as text check (value ~ '^(w|c|cmp|g|sc|sr):.+');
create domain content_id   as text check (value ~ '^[a-z]+:.+');

create table sessions (id uuid primary key, user_id uuid not null default auth.uid(),
  started_at timestamptz not null, ended_at timestamptz, client_tz text not null, device text);

create table activity_spans (               -- minutes are facts; category, strand, XP and bucket are derived
  id uuid primary key, user_id uuid not null default auth.uid(),
  session_id uuid references sessions,       -- null for manual logs
  source text not null check (source in ('in_app','manual')),
  activity_type text not null,               -- 'T1'..'T18' | 'explain' | 'immersion'
  widget text, widget_version int,
  lesson_id content_id, lesson_hash text, activity_key text, slot text,
  media_id content_id, external_title text,  -- in-app media / manual title (e.g. a Netflix show)
  subtitle_mode text check (subtitle_mode in ('none','zh','zh_pinyin','en','zh_en')),
  engagement text check (engagement in ('focused','casual','background')),
  started_at timestamptz not null, active_ms int not null check (active_ms > 0),
  check ((source = 'manual') = (activity_type = 'immersion')),
  check (source = 'in_app' or (external_title is not null and subtitle_mode is not null)),
  check ((widget is null) = (widget_version is null)));

create table trials (                        -- one scored response; evidence source 'drill' or 'checkpoint'
  id uuid primary key, user_id uuid not null default auth.uid(),
  span_id uuid not null references activity_spans,  -- carries widget, lesson, hash and slot
  item_id knowledge_id not null, item_key text not null,
  mode text not null check (mode in ('lesson','drill','checkpoint')),
  correct boolean not null, picked text, expected text, response_ms int check (response_ms >= 0),
  attempt smallint not null default 1,       -- 2+ = re-asked after a miss (brainstorm feedback rule 3)
  novelty text not null check (novelty in ('unseen','recycled')),   -- recycled = the pool ran dry: practice, not transfer
  stimulus_clip_id content_id, speaker_id content_id, answered_at timestamptz not null);

create table claims (                        -- self-report: "mark complete" or test-out without a checkpoint
  id uuid primary key, user_id uuid not null default auth.uid(),
  item_id knowledge_id not null,             -- one row per item the scope taught AT THAT TIME
  scope_id content_id not null, scope_hash text,
  kind text not null check (kind in ('mark_complete','test_out_self')), claimed_at timestamptz not null);

create table exposures (                     -- in MEDIA coordinates, so re-cutting a clip keeps "seen" correct
  id uuid primary key, user_id uuid not null default auth.uid(), span_id uuid references activity_spans,
  media_id content_id not null, clip_id content_id,
  from_sec real not null, to_sec real not null check (to_sec > from_sec),
  pass smallint, subtitle_mode text not null, played_at timestamptz not null);

create table comprehension_ratings (         -- X22 self-rating: a fact, never mastery evidence
  id uuid primary key, user_id uuid not null default auth.uid(), span_id uuid references activity_spans,
  media_id content_id, external_title text, pass smallint,
  rating smallint not null check (rating between 1 and 4), rated_at timestamptz not null);

create table lesson_runs (id uuid primary key, user_id uuid not null default auth.uid(),
  lesson_id content_id not null, lesson_hash text not null, started_at timestamptz not null,
  finished_at timestamptz, cursor jsonb);    -- cursor is opaque to everything except the player

create table notes (id uuid primary key, user_id uuid not null default auth.uid(),
  item_id knowledge_id not null, created_at timestamptz not null,
  unique (user_id, item_id));                -- one note per knowledge item (08 F9)

-- cards and review_logs: as doc 02 §5, plus on cards:
--   card_type text not null, variant text not null default '',   -- '' for word cards; a clip id or 'mined:<uuid>' for sentences
--   origin text not null check (origin in ('lesson','miss','mining','manual')), origin_ref text,
--   unique (note_id, card_type, variant)

create table mined_sentences (id uuid primary key, user_id uuid not null default auth.uid(),
  zh text not null, source_title text, source_at text, created_at timestamptz not null);

create table content_flags (id uuid primary key, user_id uuid not null default auth.uid(),
  target_id content_id not null, kind text not null check (kind in ('note','embed_error','wrong_timing')),
  body text, created_at timestamptz not null, resolved_at timestamptz);

create table fact_voids (fact_table text not null, fact_id uuid not null, voided_at timestamptz not null,
  reason text, primary key (fact_table, fact_id));   -- corrections append; derive skips voided facts
```

**Evidence is a read model, not a table.** `src/derive/evidence.ts` assembles one stream per item:
- `srs_review` from `review_logs` (via card → note → item);
- `drill` and `checkpoint` from `trials`;
- `self_report` from `claims`;
- `implicit` computed from edges.

That gives 08 F5's single model without writing any fact twice.

---

## 6. Authoring format

### 6.1 File layout

```
content/
  curriculum/index.ts, s0.ts, s1.ts, s2.ts   # order, titles, ideas, teaches/assumes, template
  lessons/<lesson-key>.md                    # flat; the file name is the id key (les:le-completion → le-completion.md)
  items/grammar.yaml, sounds.yaml            # authored items and their prereq/confusable edges
  items/overrides/words.yaml                 # edits to seeded words (kept apart: CC-CEDICT share-alike)
  media/<collection>.yaml                    # media, their clips and lines; one file per video or per audio set
  speakers.yaml, licenses.yaml, licenses/texts/*.txt, datasets.yaml
  templates/<name>.yaml, templates/scaffolds/<name>.md
  redirects.yaml                             # retired id → replacement id(s)
  generated/                                 # committed output of the importers and the id lock
    items.words.json, items.chars.json, items.components.json, edges.seeded.json, ids.lock.json
src/content-model/   # ids, types, schemas, compiler, check rules (no Vue imports: lint-enforced)
src/interactables/<widget>/definition.ts + View.vue
src/derive/  src/media/  src/player/  src/facts/  src/srs/  app/
scripts/content-{check,build,new,suggest,import,docs,orphans,plan}.ts
```

### 6.2 Syntax: three constructs and nothing else

1. **Slot containers.** `:::hear` … `:::`, one per skeleton slot, in skeleton order. Inside `:::explain`, `##` headings are claim headings (06). Inside `:::deeper`, each `###` heading is a collapsed question.
2. **Interactables.** A fenced block whose info string is `@<widget>`. Its body is YAML: the widget's config plus `InstanceBase` fields. A fence with any other info string is an error, which catches widget-name typos.
3. **Inline directives** (remark-directive text syntax):
   - `:ex[我买了三本书。]{clip=clip:…}`: a native example. The text must match a line of that clip.
   - `:bad[…]`: a wrong form, rendered with the mistake marker. It has no audio, because native audio of an error doesn't exist.
   - `:k[g:le-completion]`: a chip that links any knowledge item.
   - `:w[咖啡]`: a word chip whose id is resolved by the dictionary. Write `{id=w:…}` to pin an ambiguous one.

**Any hanzi outside these four directives and interactable blocks is an error.** That is how the "every example has a native clip" rule is enforced in prose.

### 6.3 Full example lesson

The curriculum entry:

```ts
// content/curriculum/s2.ts (excerpt)
unit('unit:what-happened', 'What happened', [
  lesson({ id: 'les:le-completion', title: '了 after a verb: it got done',
    idea: 'A 了 right after the verb says the action was completed. It marks "done", not "past", so a sentence about yesterday can do without it.',
    template: 'pattern',
    teaches: ['g:le-completion'],
    assumes: ['g:mei-past-negation', 'g:time-before-verb', 'w:喝:he1', 'w:买:mai3'] }),
  // …
])
```

The lesson file:

````markdown
---
lesson: les:le-completion
clips:
  hear:
    want: { exemplifies: [g:le-completion], maxSec: 25 }
    candidates: [clip:lc-weekend-coffee, clip:annie-saturday-02]
  check:
    want: { exemplifies: [g:le-completion], maxSec: 45, novelty: unseen, hasQuestions: true, speaker: { notIn: [hear] } }
    candidates: [clip:mclick-market-04, clip:lc-trip-02, clip:xg-dayout-07]
cards:
  - { kind: sentence, clip: clip:lc-weekend-coffee-l1, note: g:le-completion }
---

:::hear
```@clip-stage
clip: { slot: hear }
prompt: What did she do on Saturday?
```
:::

:::explain
## 了 after the verb marks the action as done

The 了 in :ex[星期六我喝了一杯咖啡。]{clip=clip:lc-weekend-coffee-l1} sits right after 喝, and it says the drinking was completed. English speakers hear it as a past tense, and that guess fails in both directions. Habits in the past take no 了, and a finished action in the future can take one.

```@timeline-figure
marks: [happened, didnt-happen]
```

Completion 了 usually comes with an object that has a number or measure word (一杯咖啡, 三本书). Without one, the sentence sounds unfinished, as if more is coming.

## 没 already says it didn't happen, so 了 goes

:bad[我没喝了咖啡。] → :ex[我没喝咖啡。]{clip=clip:cv-wo-mei-he-kafei}

Negating a completed action uses :k[g:mei-past-negation] alone.
:::

:::we-do
```@timeline-picker
target: g:le-completion
items:
  - { line: 他买了三本书。, answer: happened }
  - { line: 他没买书。, answer: didnt-happen, target: g:mei-past-negation }
  - { line: 我喝了一杯咖啡。, answer: happened }
  - { line: 我没喝咖啡。, answer: didnt-happen, target: g:mei-past-negation }
  - { pool: { exemplifies: g:le-completion, count: 4 }, answer: happened }
```

```@confusable-sorter
set: [g:le-completion, g:mei-past-negation]
labels: { g:le-completion: 了 · done, g:mei-past-negation: 没 · didn't }
count: 10
oldShare: 0.3
```
:::

:::you-do
```@timeline-picker
target: g:le-completion
items:
  - { pool: { exemplifies: g:le-completion, count: 3, novelty: unseen }, answer: happened }
  - { pool: { exemplifies: g:mei-past-negation, count: 2, novelty: unseen }, answer: didnt-happen, target: g:mei-past-negation }
```

```@gist-question
clip: { slot: check }
```
:::

:::recap
- 了 right after the verb says the action was completed.
- It means "done", not "past": a past habit has no 了.
- 没 negates a completed action on its own, so 了 drops out.
:::

:::deeper
### Why does 了 sometimes come at the end of the sentence instead?
Sentence-final 了 marks a change of state, which is the next lesson's idea (:k[g:le-change]). Some sentences carry both.

### Can 了 appear in a sentence about tomorrow?
Yes. 明天吃了饭我就去 means "tomorrow, once I've eaten, I'll go". The eating is completed relative to the going.
:::
````

What the file leaves out is deliberate:
- the title and idea come from the curriculum;
- the template supplies the rules;
- pinyin comes from pinyin-pro;
- voices, fallbacks and "unseen" are resolved at runtime;
- cards for `teaches` are added by the template's `cards` defaults;
- the explicit `cards:` entry adds only the extra sentence card.

### 6.4 Clip slots and fallbacks

```ts
interface ClipSlot {
  want: {
    exemplifies?: KnowledgeId[]; minSec?: number; maxSec?: number
    novelty?: 'any' | 'unseen' | 'studied'     // 'studied' = re-listen (T15)
    hasQuestions?: boolean
    speaker?: { notIn?: string[] }             // other slot names (07 rule 2: the you-do voice differs from the I-do voice)
    context?: MediaContext[]
  }
  candidates: ClipId[]                         // ranked; checked statically against `want`
  pool?: 'catalog' | 'none'                  // default 'catalog': any matching clip, after the candidates
}
```

**Resolution** happens in `clipResolver` at runtime. It walks the candidates, then the pool, and skips each clip that is:
- retired;
- flagged `embed_error` (the YouTube `onError` codes 100, 101 and 150 write a flag, then skip in the same session);
- outside `want`;
- seen, when `novelty: unseen`.

"Seen" follows the brainstorm's §3 definition, computed from facts:
- any exposure overlapping the clip's media span counts, even a glimpse;
- holding a card whose variant is that clip counts;
- for sound items, a speaker already heard on that contrast in this lesson counts.

If nothing qualifies, an `unseen` slot falls back to the least recently heard clip. Every trial on it is then marked `novelty = 'recycled'`, so a checkpoint never passes on recycled audio. Sentence pools (`items: - pool:`) go through the same resolver, so a fresh you-do on every rerun costs no authoring.

### 6.5 Keeping it fast to write

- **`content:new les:le-completion`** writes the file from the template scaffold, with the curriculum entry's `teaches`, empty slots, TODO markers and suggested clip candidates filled in.
- **`content:suggest g:le-completion --unseen-for les:le-completion`** lists catalogd lines tagged with the item, grouped by speaker and context. It also searches Common Voice transcripts (03 §1.8) and writes stub media YAML for the hits worth adding.
- **`content:docs`** generates `docs/design/widget-reference.md` from the registry: each widget's purpose, slots, config schema and an example config. Because it is generated, it can't go stale. Claude drafts with three inputs: that reference, the template and one reference lesson. The check script is the gate, exactly as in vue-crash-course.
- **Short references.** Ids are typed once in `teaches`. Prose uses `:w[咖啡]`, and activity items use plain `line: 他买了三本书。`, resolved by transcript match. An unmatched line fails with "no native clip for …" plus suggestions.

---

## 7. Interactable registry

### 7.1 What is and isn't a registry entry

The brainstorm's X1–X5 (clip stage controls, loop, speed steps, line stepper, reveal layers) are **player capabilities**. The runtime offers them to every widget through the media handle, configured by the lesson's `support` stage. A registry entry is anything a lesson *places*:
- an **activity**, which occupies time in a slot, logs a span and may produce trials;
- a **figure**, which sits inside prose and can never score anything.

### 7.2 The contract

```ts
// src/interactables/contract.ts: framework-neutral. The check script and compiler import this; Vue never does.
interface DefinitionBase<C> {
  widget: string                  // stable forever; a retired name is tombstoned, never reused
  version: number                 // config-schema major. Bump it when a config change breaks old configs or "correct" changes meaning
  config: ZodType<C>
  migrate?: Record<number, (prev: unknown) => unknown>  // v(n) → v(n+1), applied by the compiler before validation
  refs(config: C): ContentRefs    // every id and slot it mentions, so the check needs no knowledge of widgets
  requiresMedia?: 'hosted'        // e.g. a pitch trace needs R2 audio and can't use YouTube
  example: C                      // feeds `content:docs`
}
interface ActivityDefinition<C> extends DefinitionBase<C> {
  role: 'activity'
  slots: readonly SlotName[]
  activityType(config: C): ActivityType          // T1–T18; may depend on config (a choice pad on a sound → T1, on grammar → T7)
  serves: readonly ActivityType[]                // activityType() must return one of these
  outputLevel: 0 | 1                             // level 2 can't be declared (R7)
  scoring: 'items' | 'stream' | 'none'
  expand?(config: C, cat: Catalog): ItemSpec[] // 'items' only: static expansion, so the check can count items, voices and clips
  evidenceTargets(config: C): KnowledgeId[]      // the only items its trials may score
  estimateSec(config: C): number
}
interface FigureDefinition<C> extends DefinitionBase<C> { role: 'figure' }

interface ItemSpec {               // built at compile time
  key: string; target: KnowledgeId; answer: string; cue?: string
  stimuli: ClipId[] | PoolQuery    // the same content in several voices, or a pool resolved at runtime
  options: { key: string; label: string; stimuli?: ClipId[] }[]  // per-option audio, so feedback can play "your pick" in the same voice
}
```

The runtime side of the contract is where the brainstorm's §3 rules live, once:

```ts
// src/player/contexts.ts: what a View receives. The type differs per scoring mode, so a figure can't call respond().
interface ItemsActivityContext<C> {
  config: C; media: MediaHandle; support: SupportStage
  next(): Promise<TrialItem | null>   // the runtime picks the stimulus (novelty rule) and re-queues misses 3–5 items later in a new voice
  respond(item: TrialItem, optionKey: string, responseMs: number): Promise<Verdict>
  // respond() scores against the hidden answer, writes the trial fact, and runs the feedback policy:
  // instant in we-do (play your pick, then the answer, same voice, then the cue line);
  // deferred in you-do and checkpoint (collected for the end-of-step review). A second miss queues a card (origin 'miss').
}
interface StreamActivityContext<C> {  // tap-when-you-hear: tokens in connected speech
  config: C; media: MediaHandle; support: SupportStage
  recordTrial(t: { target: KnowledgeId; key: string; correct: boolean; atSec: number }): void  // the runtime asserts target ∈ evidenceTargets
}
interface FigureContext<C> { config: C; media: MediaHandle }
interface TrialItem { key: string; target: KnowledgeId; stimulus: PlayableClip; options: { key: string; label: string }[]; attempt: number }
type Verdict = { correct: boolean } | { deferred: true }
```

What the contract guarantees:
- **Widgets never write facts directly.** Spans (active time, measured while the page is visible), exposures (from `MediaHandle`, in media seconds, including glimpses) and trials (from `respond`/`recordTrial`) all come from the runtime. So a widget can't forget the "unseen" bookkeeping or log time differently from its neighbors.
- **Facts record `widget@version` on the span,** so a later change to what "correct" means can be told apart in history.
- **The feedback policy is one constant per slot role,** which makes the brainstorm's open question 8 a one-line change.

### 7.3 Three brainstorm widgets against the contract

| | `choice-pad` (X15) | `confusable-sorter` (X20) | `gist-question` (X21) |
|---|---|---|---|
| role / scoring | activity / items | activity / items | activity / items |
| `activityType` | T1 for a `sound_contrast` target; T7 when given a confusable set | T7 | T14 in you-do; T11 when used after pass 3 |
| config (sketch) | `contrast: sc:…`, `trials`, `voices: { min }`, `mode: id \| ax` | `set: [ids]` (must be an authored `confusable` edge), `labels`, `count`, `oldShare` | `clip: ClipRef` (the slot must have `hasQuestions`) |
| `expand` | Syllable or word clips whose lines are tagged with the contrast members, grouped by speaker. The check requires at least 4 speakers. | Lines tagged with each member. `oldShare` pulls items from lessons that teach earlier members. | One item per `GistQuestion`. Options have no audio, and feedback replays the `line` where the answer is said. |
| `evidenceTargets` | `[contrast]` | `set` | the union of the questions' `tests` |
| Novelty in you-do | the speaker not heard on this contrast in this run | the sentence is not in this lesson's hear/we-do and not on a held card, from a new speaker | the clip span has never been played |

None of the three needs widget-specific code in the compiler, check script, facts layer or derive functions. The registry would stay the same if the brainstorm's list were cut in half.

### 7.4 Versioning and wiring

- `src/interactables/registry.ts` exports `definitions` as a `const` object. `WidgetName = keyof typeof definitions`, and `ActivityInstance` (§5.4) is derived from it.
- `app/src/interactables/views.ts` is `Record<WidgetName, () => Promise<Component>>`, so a widget without a view is a type error.
- A breaking config change ships as `version + 1` plus a `migrate` step. `content:migrate --write` rewrites the lesson files, and the cleanup phase then deletes the migrate step.

---

## 8. Pipeline

### 8.1 Commands

| Command | Does |
|---|---|
| `content:check [ids…]` | Parses everything, applies migrations, runs the rules in §8.2, and prints `file:line rule-id message`. Exits 1 on any error. |
| `content:build` | Runs the check, then emits `dist/content/<release>/` and updates `generated/ids.lock.json`. |
| `content:new`, `content:suggest`, `content:docs` | §6.5 |
| `content:import <dataset>` | §8.6 |
| `content:matrix` | The brainstorm's §4 variety report per unit, computed from compiled lessons (no authored matrix) |
| `content:orphans`, `content:flags` | Compare DB ids against `ids.lock`; list open `content_flags` as an authoring to-do |
| `content:plan` | Derived lesson and unit prerequisites, for comparison with 03 §1.8 |

### 8.2 Check rules

Each rule is a small module in `src/content-model/check/rules/` with an id and a severity. The rules run on the parsed AST, not on regexes over raw text (a vue-crash-course lesson; see §10).

| Id | Severity | Rule |
|---|---|---|
| ID001 | error | Every id parses, and its prefix matches the field's type. |
| ID002 | error | Ids are unique across all content. |
| ID003 | error | **Stable ids.** No id in `ids.lock` may disappear without a `redirects.yaml` entry. Retired ids are never reused. |
| ID004 | error | Redirect targets exist, with no chains or cycles. |
| REF001 | error | Every reference resolves: items, clips, slots, speakers, licenses, templates, widgets. |
| ORD001 | error | **Prerequisite order.** Each lesson's `assumes`, and every `prereq` of what it `teaches`, is taught by an earlier lesson (or the same one). |
| ORD002 | error | The `prereq` edges are acyclic. |
| ORD003 | warn | More than 3 authored prereqs on a grammar item; an item taught by two lessons. |
| MED001 | error | **Every example has a native clip.** Every `:ex` text and every activity `line:` matches a clip line. Hanzi outside directives is an error. |
| MED002 | error | Every clip slot has at least 2 static candidates matching `want`, or at least 3 when `novelty: unseen`. |
| MED003 | error | **License present.** Every media item has rights. `open` rights need author, source URL, and a license with its text file. Media tagged non-commercial are allowed only while `config.nonCommercial` is true. Sources excluded by policy (unlicensed Tatoeba audio) are rejected. |
| MED004 | error | Clip spans fit inside the media duration. Lines are ordered, non-overlapping and inside the span. |
| MED005 | error | Every `requiresMedia: hosted` widget points at R2 media. |
| MED006 | warn | Voice variety: a Sound you-do pool has at least 4 speakers per contrast; speakers in `speaker.notIn` slots don't overlap. |
| MED007 | warn (`--online`) | YouTube embeds exist and are embeddable (`videos.list`, 1 quota unit each). |
| STR001 | error | Template rules: required slots, allowed widgets, word budgets. A non-default widget needs a `reason`. At most one wildcard per unit (brainstorm §4). |
| STR002 | error | Each widget config validates after migration. Widget `slots` include the slot it sits in. |
| STR003 | error | `evidenceTargets` ⊆ `teaches ∪ assumes`. The you-do produces evidence for **every** item in `teaches`, so completion is computable. |
| STR004 | error | No widget with output level ≥ 1 in S0 unless it is `optional` (R7). |
| WR001–WR007 | warn | **Writing rules (06):** explanation word budget; claim headings; banned phrases (vue-crash-course's list); at most 3 sentences per paragraph; a mistake pair present where the template requires one; recap of exactly 3 bullets; `deeper` headings phrased as questions. |

### 8.3 Build output and sync

There is **no repo-to-DB sync.** The bundle is static assets on Cloudflare (free and unlimited) and is content-addressed:

```
dist/content/<release>/manifest.json         # lesson index + hashes, widget versions, derive rule versions, redirects
  items.core.json                             # every taught/assumed item + HSK 2025 L1–3 + their edges
  items.ext.<n>.json                          # HSK 4–9 words, other chars and components (lazy)
  media.<unit>.json, lessons/<key>.<hash>.json, dict/<shard>.json (CC-CEDICT), credits.json
```

**The content bundle is private.** Only the app shell (HTML, JS, CSS, login screen) is a public static asset. `dist/content/**` is not deployed as a public asset. It is served by the same Worker that guards `/media/*` (05): `/content/*` checks the Supabase JWT and returns 401 otherwise. Reasons:
- lessons contain hand-curated transcript lines of other people's YouTube videos;
- they may contain Grammar Wiki excerpts (CC BY-NC-SA);
- the app is private on a public URL (README).

CC-CEDICT and the other openly licensed datasets could be public, but they are kept behind the same gate so there's one rule. (Added in review, 2026-11-02.)

The service worker caches the bundle after login. R2 audio is cached; YouTube is never cached (05). The cost is that content attributes can't be joined in SQL. That is acceptable here, because every consumer of content attributes (derive functions, the player) is TS.

### 8.4 Content versioning

- A **release** is a git SHA. A lesson's **hash** is the SHA-256 of its compiled JSON, including the template expansion.
- Spans, lesson runs and claims record `lesson_hash` (08's COULD, made a MUST because it's free). `generated/releases.jsonl` maps each hash to its commit, so `content:show les:le-completion <hash>` shows exactly what was studied.
- Git is the only content history. The DB never stores content versions.

### 8.5 How user state survives edits

| Edit | Effect on user state |
|---|---|
| Reorder, rename, split or merge lessons; change a template | None. Evidence sits on items, and lesson status is recomputed. A rewritten lesson that teaches known items shows "covered". |
| Remove an item from `teaches` | Its evidence stays on the item. Only lesson status changes. |
| Rename an id | A `redirects.yaml` entry. Derive reads old ids through it. |
| Split an item (`g:le` → `g:le-completion`, `g:le-change`) | A redirect to both. Old evidence counts toward each child **capped at Familiar**, so a split never claims Solid on a part that was never tested separately. |
| Merge items | A redirect from each to the survivor. All evidence carries over. |
| Re-cut or retime a clip | Exposures are stored in media seconds, so "seen" stays correct. Cards that point at the clip id are unaffected. |
| Retire media or a clip | `status: retired`. Never played, still resolvable for history. Its cards are flagged for a replacement clip. |
| Change a widget's config schema | `migrate` at compile time. Old trials keep `widget@version` on their span. |
| Change a lesson mid-run | A resume whose `lesson_hash` differs restarts the current slot at its first activity. Facts already written stand. |
| Change a mapping rule (XP, mastery) | Recompute. Caches keyed by the old rule version are discarded. |

### 8.6 Seed data import

`scripts/import/{hsk30,cedict,makemeahanzi}.ts` read a pinned upstream copy into `vendor/` (gitignored) and write the committed files under `content/generated/`. A re-import therefore shows up as a reviewable diff.

```yaml
# content/datasets.yaml
- id: ds:hsk30
  license: lic:mit            # + CC BY 4.0 for the corpus part (03 §3)
  pin: { commit: <sha> }
  produces: [word items (all syllabi as levels), char levels]
- id: ds:cedict
  license: lic:cc-by-sa-4.0
  pin: { release: 2026-11-02 }
  produces: [word glosses, dict shards]
- id: ds:mmah
  license: [lic:lgpl-3.0, lic:arphic-pl]   # dictionary.txt vs graphics: keep both license texts (05)
  pin: { commit: <sha> }
  produces: [char items, component items, composes edges]
```

Rules for the importers:
- Every generated record carries `sources`, which the Credits page and MED003 read.
- Our edits never touch generated files. They go in `items/overrides/`, kept separate so CC-CEDICT share-alike applies only to the overlay if it is ever shared.
- Generated ids are checked against `ids.lock` like any other id. An upstream change that drops a word fails ID003 until it is redirected or the dropped id is marked retired.

---

## 9. Derived data

All mapping functions live in `src/derive/`, are pure, and are versioned side by side:

```ts
// src/derive/rules.ts
export const RULES = {
  activityDims: { v1 },   // T1–T18 → D1–D7 (07's table; owned here, not by widgets)
  category:     { v1 },   // dims → Refold priming / interactive / freeflow / output (07 §a)
  strand:       { v1 },   // dims → Nation MFI / LFL / FD / MFO
  bucket:       { v1 },   // span → curriculum / srs / immersion
  xp:           { v1 },   // README: 1/min in-app; 0.5/min logged, capped 20/day; subtitle_mode weighting (README resolution 3)
  mastery:      { v1 },   // evidence stream → New / Learning / Familiar / Solid / Mastered (04), with caps
  lessonStatus: { v1 },   // mastery + runs + claims → not started / in progress / complete / covered
  support:      { v1 },   // position in unit → pinyin default + replay allowance (brainstorm X5)
} as const
export const CURRENT = { activityDims: 'v1', category: 'v1', /* … */ } satisfies { [K in keyof typeof RULES]: keyof typeof RULES[K] }
```

**`mastery@1` caps:**
- `self_report` evidence lifts an item to Familiar at most;
- `implicit` evidence never reaches Mastered (04);
- split-redirect evidence is capped at Familiar (§8.5);
- `recycled` trials count as practice, never as checkpoint evidence.

Thresholds come from doc 04 (stability in days) and the S0 gate (≥85% on unseen voices), written as named constants in the rule.

The XP, category and subtitle-mode weightings stay unsettled (README resolution 3 needs the user's OK). Shipping one as `v1` and then changing it costs a new version, not a data migration.

**How the rules are versioned:**
- A new version is a new entry, and `CURRENT` flips to it.
- Each version has golden fixtures (`src/derive/__fixtures__/`): facts in, expected output.
- Old versions stay until the cleanup phase, so a "before vs after" comparison stays possible.

**Where it runs:** on the client, incrementally from a watermark, with an IndexedDB cache keyed by rule version. Facts are small at this scale (about 40k review logs and up to 70k trials a year), but a first load on a new phone is the risk (open question 4). Because the functions are pure, moving them into a Worker endpoint later is a deployment change, not a redesign.

---

## 10. Implementation guidance

**Reuse from vue-crash-course:**
- one TS module as the structure's source of truth, with helper constructors (`lesson(...)`);
- light lesson files ("soon" until the file exists; title and idea not repeated in the page);
- VitePress-style `:::` containers;
- a check script that gates every lesson, with errors vs warnings;
- the banned-phrase list and the writing checklist.

**What doesn't scale here, and the replacement:**

| vue-crash-course | Problem at ~140 lessons with user history | Here |
|---|---|---|
| Positional ids (`2.2`, `2-2.md`), a renumbering table in its §8 | Every reorder changes identity | Slug ids; display numbers computed |
| Vue components with JS props in markdown (`:files="{…}"`) | Unvalidated config; couples content to Vue; checkable only by rendering | YAML config validated by a schema per widget |
| Regex checks over raw text in one 300-line script | Brittle once directives and YAML exist | Parse once to an AST; rules as small modules with ids |
| Lesson-to-lesson prereqs | Break when lessons split | Item-level prereq edges; lesson prereqs derived |
| Hand-entered `minutes` | Drifts | `estimateSec` from widgets plus reading time |
| Progress per lesson in localStorage | The F1 problem | Evidence on items, in Postgres |

**Other guidance:**
- Keep `src/content-model`, `src/derive` and `src/interactables/*/definition.ts` free of Vue and DOM imports, enforced by an ESLint import-boundary rule. One package with lint-enforced folders is enough; a workspace monorepo isn't needed for one owner.
- Use `unified`/`remark` with `remark-directive` for parsing, and `pinyin-pro` for generated pinyin.
- Don't add a shallow "content service" over the bundle. The app reads the bundle through one `ContentIndex` (`getLesson`, `getItem`, `clipsTagged`) that also resolves redirects. That is the whole interface.

## 11. Phases

1. **Content model and compiler, with no UI.** Purpose: prove the format.
   - Ids, types, schemas, compiler, check rules, `ids.lock`, redirects.
   - Importers for hsk30, Make Me a Hanzi and CC-CEDICT, with license records and the credits output.
   - Three reference lessons (Sound 0.9 sandhi, Pattern `les:le-completion`, Clip 1.11) plus their media files.
   - *Done when* `content:build` emits a bundle, and each check rule has one failing fixture.
2. **User state and derive v1.** Purpose: facts and their meaning.
   - The SQL migration with RLS and append-only policies; `src/facts` (outbox, writers, queries).
   - `src/derive` v1 with golden fixtures.
   - *Done when* synthetic fact sets produce the expected category, XP, mastery and lesson status, and the RLS tests pass.
3. **Player, registry and media.** Purpose: play the three reference lessons on a phone.
   - Contexts and the trial runner (feedback policy, retry queue, novelty); `MediaHandle` with one shared YouTube player and R2 audio; `clipResolver`.
   - Widgets: `clip-stage`, `choice-pad`, `timeline-picker`, `confusable-sorter`, `gist-question`, `timeline-figure`.
   - *Done when* lessons resume after the app is killed, facts land in Supabase, and a dead embed falls back silently and writes a flag.
4. **Cards.** Purpose: lessons feed the SRS.
   - Notes deduped by item; cards from `cards:` slots and from second misses; doc 02's queue reads them.
   - *Done when* completing a lesson twice creates no duplicate notes or cards.
5. **Authoring throughput.** Purpose: make R1 real.
   - `content:new`, `content:suggest`, `content:docs`, `content:matrix`, `content:flags`; a Claude drafting loop (draft, check, fix).
   - Author S0 (as test-out material) and S1 units 1.1–1.5.
   - Measure minutes per lesson.
6. **Cleanup.** Purpose: remove what the earlier phases left behind.
   - Run `content:migrate --write`, then delete every widget `migrate` step (keeping the version numbers).
   - Collapse redirects: `scripts/rewrite-ids.ts` rewrites old ids in user tables (cheap with one owner), then the redirect entries are deleted. `ids.lock` keeps the old ids as retired, so they're never reused.
   - Delete superseded derive versions after a final comparison report.
   - Remove any provisional hand-entered fields added during phases 1–3, such as lesson minutes.
   - Record decisions 10 and 13 and this TDD's choices in the README synthesis (AGENTS rule).
   - Mark doc 06's lesson-model implication (`archetype`, `practiceFormat`, lesson `prereqs`) as superseded.
   - Replace the positional unit numbers in 03 §1.8's Prereqs column with unit slugs, or mark that table as the planning view `content:plan` regenerates.

## 12. Deliberately not building

- An in-app lesson editor or CMS, or lesson rows in Postgres.
- Runtime template inheritance or slot-merge semantics.
- MDX or arbitrary JS in content, and widgets loaded dynamically from content.
- A generic rules engine. Derive rules are plain versioned functions.
- Stored derived values (XP, category, mastery) in any table.
- A content history in the DB (git has it).
- Multi-user content, roles, A/B lesson variants, localized explanations.
- TTS, YouTube caption scraping, automatic clip discovery on YouTube.
- An authored variety matrix. It is a report computed from lessons.
- A visual graph editor. Edges are YAML and seeded data.
- Traditional characters (pending README open decision 1). Ids are simplified-keyed, and a toggle would be a display attribute.

## 13. Open questions

1. **Sound item grain.** Are the 20 tone pairs 20 `sc:` items, or one `sc:tone-pairs` with pair-tagged trials? This decides how the tone trainer's accuracy rolls up. Decide when the trainer is built; a split is a redirect either way.
2. **Do in-lesson trials on words touch FSRS?** Proposed: no. Trials are mastery evidence only, and cards start as New. The alternative (a lesson trial counts as a first review) would speed up the early queue but mixes two evidence models.
3. **Picture assets for meaning grids and scene hotspots** (brainstorm open question 1). Images would be `media` with `context: 'illustration'` and a license. Which source: own drawings, or an openly licensed icon set?
4. **Derive location.** Is client-side recompute fast enough on a new phone after a year of facts? Measure in phase 4. The fallback is a Worker endpoint running the same package.
5. **Card audio for word cards.** AC (rehostable) by default, or YouTube spans? This is the README's top media risk; prototype it in phase 3.
6. **Unit prerequisites from 03 §1.8.** Do we accept that item edges are the source and the §1.8 column is a planning view, or does the user want authored unit-level ordering hints?
7. **Grammar grain** (08 open question 3): start with coarse points, split later through redirects (§8.5).
8. **Stream-scored widgets** (tap-when-you-hear): is `recordTrial` with a timing window enough, or does a future widget need a third scoring mode? Add one only when a kept widget needs it.
