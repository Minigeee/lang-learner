# 08 · Curriculum structure review

A "code health" pass over the *structure* of the curriculum: how lessons, knowledge, cards, media and classifications relate. It doesn't review the content. The question it answers is which of today's choices would be expensive to change once lessons, progress and review history pile up. It reviews docs 01–07 as of 2026-11-02, with v1 scoped to HSK 2025 levels 1–3.

## TL;DR

- **The biggest risk is progress tied to lessons.** Today a lesson "teaches" nodes and marking a lesson complete is the main record of progress. If lessons are the spine, then reordering, splitting or rewriting them (the whole point of v1) breaks progress. **Make knowledge items the spine.** Words, characters, components, grammar points and sound contrasts each get a stable id. Lessons, cards, mining and test-out all *point at* knowledge items, and mastery lives only there.
- **Store facts, derive classifications.** These are all mappings we've already said we'll tune:
  - the Refold category, Nation strand, bucket and XP weight of a minute;
  - a node's mastery state;
  - whether English-subtitle watching counts.

  So log raw facts (activity type, minutes, subtitle mode, media id, outcome) and compute everything else when it's read. Then a changed rule recomputes history instead of needing a data migration.
- **Ids are not positions or labels.** "Lesson 1.13", "HSK 3" and Grammar Wiki titles are all volatile:
  - HSK 2021 → 2025 moved about 41% of shared words to a different level;
  - Grammar Wiki is an external site under a non-commercial license;
  - numbering changes on every reorder.

  Use stable slugs, and keep order, levels and external references as attributes.
- **Media and speakers need to be first-class entities.** Doc 07's rules ("you do" on *unseen* material, a different speaker than the "I do", ≥4 voices per contrast, re-listening studied clips) can't be enforced unless clips and speakers are records with exposure tracking. YouTube videos also disappear, so lessons should reference clips with fallbacks, plus an availability check.
- **Mastery should take evidence from several sources:**
  - FSRS reviews;
  - drill accuracy (tones are drilled outside FSRS, per doc 02);
  - checkpoints;
  - self-report (test-out);
  - implicit credit (FIRe-lite).

  Make "evidence → mastery" one rule, so adding a source doesn't mean special-casing every node type.
- **What's already healthy:**
  - the fixed lesson skeleton;
  - soft gates;
  - three separate meters (effort, input, knowledge);
  - doc 07's "activity type → derived dimensions → derived category";
  - review logs that are never deleted.

  Keep all of these.

## Findings

### F1. Two spines: lessons vs knowledge (high risk)

Doc 03 organizes *what is taught* as stage → unit → lesson. Doc 04 organizes *what is known* as Sound / Script / Grammar nodes, with "lesson → node (teaches)" edges. The completion spec in the README records status **per lesson**. Together that gives two hierarchies, and the user-visible progress sits on the more volatile one.

Over v1's "refine the format for months" period, lessons will be split, merged, reordered and rewritten. If "complete" lives on lesson ids, each of those edits orphans or misstates progress. Knowledge items barely change: 了 is still 了 after the lesson about it is rewritten.

**Fix:**
- Knowledge items are the source of truth.
- A lesson is a *delivery* of a set of knowledge items (`teaches: [ids]`).
- Completing or testing out of a lesson writes **evidence onto its knowledge items**, and lesson status is computed from them.

Then a rewritten lesson that teaches the same items shows as complete automatically. A new lesson that teaches already-known items shows as "covered".

### F2. Derived values stored as facts (high risk)

Several docs plan to tune mappings after real use:
- doc 04: immersion XP weight and caps, "tune after about 4 weeks";
- resolution 3: English-subtitle weighting;
- doc 07: shadowing logged as output, strand checks;
- doc 01: activity → Refold category.

If a session row stores `refold_category = 'interactive'` or `xp = 12`, every rule change means rewriting history or living with a split-brain history.

**Fix:**
- Session and event rows store only facts: `activity_type`, `media_id`, `started_at`, `active_ms`, `subtitle_mode`, `engagement`, `source (in_app | manual)`, and `outcome`.
- Category, strand, bucket, XP and Habit-Health credit come from versioned mapping functions in code.

Doc 07 already does this for activity types. Extend it to logs and XP.

### F3. Ids coupled to position and external labels (medium risk)

- **Positional ids.** Unit "1.13" and lesson numbers double as identity. vue-crash-course already paid for this: its v0.3 renumbered every lesson and had to keep an old-number table (its CURRICULUM §8).
- **HSK levels as structure.** Level is a *tag* from a syllabus version, and the syllabus already changed once. Store it as `(syllabus, level)`, allowing several per word, e.g. `hsk2025:3` and `hsk2021:2`.
- **Grammar Wiki as identity.** Own the grammar-point ids (e.g. `gram.le-completion`) and store the Grammar Wiki URL and A1/A2 code as attributes. This also keeps the NC-licensed source swappable.
- **Stage ≠ Refold phase ≠ HSK level.** Doc 03 lines them up (S2 ≈ early Phase 2 ≈ HSK 3), which is fine as guidance. But they measure different things: content sequence, learner state as judged by gates, and word-list tag. **Never derive one from another in code.** Refold phase advancement uses doc 01's gates, not "finished S1".

### F4. Media, speakers and exposure aren't modeled (medium risk)

Doc 07's variety principle depends on things we have no place to store:
- "unseen" material for every "you do" and checkpoint;
- "never reuse the 'I do' speaker for the 'you do'";
- ≥4 voices per contrast;
- fluency re-listens of *studied* clips;
- fading support across a unit.

All of these need:
- `media` (video/audio source, license, availability) and `clip` (a span of a media item, with transcript lines) as entities;
- `speaker` as an entity, tagged on clips;
- an exposure log per clip, which the session facts in F2 already give us.

YouTube availability is volatile. A lesson should reference **clip slots** ("a native clip exemplifying `gram.bi-comparison`, ≤20 s, unseen") with ranked candidates. A periodic check flags dead embeds. Then losing a video swaps in a fallback instead of breaking the unit.

### F5. Mastery from one source only (medium risk)

Doc 04 derives leaf mastery from FSRS stability. But:
- doc 02 keeps tone drills **outside** FSRS;
- doc 04 credits Sound nodes from drills and checks;
- the README's test-out adds checkpoints and self-report;
- FIRe-lite adds implicit credit.

That makes five evidence sources. Without one model, each node type grows its own mastery code.

**Fix:**
- Define one `evidence` record type with a source kind (`srs_review`, `drill`, `checkpoint`, `self_report`, `implicit`) and one function from evidence to mastery state, per node type if needed.
- Self-report caps at a floor state (e.g. Familiar, so prerequisites are met) until real evidence arrives.
- Implicit credit never reaches Mastered (doc 04).

### F6. Lesson shapes as a type vs templates (low–medium risk)

Doc 07 proposes four shapes (Sound / Pattern / Clip / Checkpoint), still undecided. If the UI or schema hard-codes `shape` as an enum with per-shape screens, adding a fifth shape or a hybrid lesson becomes a code change everywhere.

**Fix:**
- A lesson is data: the fixed skeleton slots (Hear it → explanation → we do → you do → cards), each filled with activity instances.
- A shape is just a **template** that pre-fills the slots.
- The player renders slots and activities, never shapes.

Then the shape debate can stay open without blocking the build.

### F7. Two ordering sources (low risk)

The lesson order (stage → unit → lesson) and the grammar prerequisite edges (≤3 per node) can contradict each other. Keep one as primary: authored lesson order is the default path, and prerequisites are suggestions. A `check` script, as in vue-crash-course, verifies that no lesson comes before a lesson teaching its prerequisites.

### F8. Graph bounded by the curriculum (low risk, matters for v1 scope)

v1 stops at HSK 3, but mining and immersion keep going. If the knowledge graph only contains items that a lesson teaches, a word mined from Netflix has nowhere to live. **Seed the graph from the data**, not the lessons:
- `hsk30` words for all levels;
- Make Me a Hanzi characters and components;
- grammar points.

Lessons then cover a subset. HSK 4+ items show progress from mining alone, and adding S3 later is just adding lessons.

### F9. Notes deduplicated by knowledge item (low risk)

A word taught in lesson 1.4, mined later from a Netflix episode, and tested out of should end up as **one** note with several cards and several example sentences, not three. Key notes on the knowledge item: one note per word, while sentence cards reference their words. Doc 02's sibling burying assumes this.

### F10. Too many user-facing classification systems (low risk, UX)

These all describe the same minutes:
- the 3 buckets (curriculum / SRS / immersion);
- Refold's 5 categories;
- Nation's 4 strands;
- XP.

They're fine as *derived* views (F2), but the UI should lead with one of them. Suggestion:
- buckets for the daily and weekly split, since they're what the user planned around;
- Refold categories in the weekly review;
- strands only as a background warning.

## Implications for the app

- **MUST** make knowledge items (word, character, component, grammar point, sound contrast) the spine, with stable slug ids. Lessons `teach: [ids]`. Lesson completion and test-out write evidence onto items, and lesson status is computed.
- **MUST** store session and evidence facts only, and compute Refold category, strand, bucket, XP, Habit-Health credit and mastery state with versioned mapping functions.
- **MUST** give lessons, units and grammar points stable ids, separate from display order. HSK levels are `(syllabus, level)` tags, and Grammar Wiki is an attribute.
- **MUST** model `media`, `clip`, `speaker` and exposure. Lessons reference clip slots with ranked fallbacks, and an availability check flags dead embeds.
- **MUST** use one evidence → mastery model, with sources `srs_review | drill | checkpoint | self_report | implicit`. Self-report is capped at a floor state.
- **SHOULD** store lessons as skeleton slots filled with activity instances, with shapes as templates only.
- **SHOULD** run a `check` script for lesson order vs prerequisites, slot completeness (every example has a native clip), and the writing rules from doc 06.
- **SHOULD** seed the knowledge graph from data (all HSK levels, characters, components), not from lessons.
- **SHOULD** dedupe notes by knowledge item.
- **COULD** keep the lesson content version on completion events, so you can see which version you studied.

## Open questions

1. **Where does lesson data live?** This was already open (decision 10 in the README). F1–F6 work with either repo files or database rows. Repo files make the `check` script and diffs easy. A hybrid also works: lessons and knowledge items authored in the repo and synced to the database on deploy, with user progress only in the database.
2. **How should a "sound contrast" node be modeled?** One node per contrast (2nd vs 3rd tone), or per sound plus a contrast edge? This affects how drill accuracy rolls up. Decide when building the tone trainer.
3. **How granular should grammar points be?** Grammar Wiki splits some points finely (several 了 entries). Owning the ids means picking our own grain. Start coarse and split later. Splitting is cheap when evidence sits on items and lessons are only pointers.

## Sources

Internal review of docs 01–07 and README (2026-11-02), plus vue-crash-course `CURRICULUM.md` (its renumbering history in v0.3 and §8, and the lesson status model in §4).
