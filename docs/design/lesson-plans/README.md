# Lesson plans

Executive summaries of every lesson: how a teacher would teach it, mapped onto the lesson arc. They sit between the curriculum (which lists what to teach, in what order) and lesson authoring (which writes the actual sentences and items).

| File | Covers |
|---|---|
| [S0.md](S0.md) | Stage S0, units 0.1–0.14 |
| [S1.md](S1.md) | Stage S1, units 1.1–1.19 |
| [S2a.md](S2a.md) | Stage S2, first half: units 2.1–2.16 (through the midpoint checkpoint) |
| [S2b.md](S2b.md) | Stage S2, second half: units 2.17–2.33 |
| [vocab-S1.tsv](vocab-S1.tsv), [vocab-S2.tsv](vocab-S2.tsv) | Preliminary placement of all 1,010 HSK 2025 L1–3 entries in the four vocabulary tiers (README synthesis, Vocabulary placement). Columns: word, level, tier, place, needed_by, rank, note. Every entry is placed exactly once across both files; a word S1 borrows from level 2–3 is placed in S1. |
| [vocab-extra.tsv](vocab-extra.tsv) | Preliminary placement of the core frequency-gap words (frequent subtitle words HSK L1–3 misses), in the same tiers. Columns: word, stage, tier, place, needed_by, rank, hsk2025_level, note. A queue `rank` is a position within that stage's queue in vocab-S1/S2: 15.01 comes right after that file's rank 15. No word appears in both this file and vocab-S1/S2. |
| [vocab-post-S2.tsv](vocab-post-S2.tsv) | Frequency-gap words not in the core set, queued for after S2 (README synthesis, Vocabulary placement). Columns: word, tier, place, rank, hsk2025_level, subtitle_rank, blended_rank, note. Ranked by subtitle frequency; `subtitle-only` marks words outside the blended top 3,000. |
| [review-2026-11-03/](review-2026-11-03/README.md) | Dependency, ordering and skill review of every plan and the vocab placement: new units, prereq edges, vocab moves and wording fixes. Applied 2026-11-03. |

## What these plans rely on

Rules live in their owning docs. Plans apply them and point to them; they don't restate them.

- **What to teach, and in what order:** [doc 03 §1.8](../../research/03-mandarin-curriculum-and-materials.md) unit tables (ideas, prereqs).
- **The lesson arc, openers, practice formats (C0–C8), skill cards and the matrix checks:** [activity-brainstorm.md §4](../activity-brainstorm.md).
- **Lesson shapes** (Sound, Pattern, Clip, Checkpoint): [doc 07](../../research/07-activity-types.md).
- **Support-text style:** [lesson-writing-style.md](../lesson-writing-style.md). It applies to the idea lines here.
- **Decisions** (audio sources, TTS, visuals, video roles, input-before-output): the [README synthesis](../../research/README.md#cross-topic-synthesis).

## Scope

In scope: the teaching plan for each lesson, its place in the arc, its variety choices, and its video.

Out of scope: specific example sentences, exact prompts and options, item counts, and feedback copy. Those belong to authoring.

## Format

Each file has a stage summary, then one section per unit, then lessons.

**Stage summary** (top of each file):
- the path through the stage, and what the learner can do at the end;
- the **format introduction schedule**: which lesson is the first planned appearance of each practice format in this stage;
- a table of every lesson: id, title, shape, opener, practice format, minutes;
- **decomposition notes**: where the curriculum's split didn't teach well and what the plan changed (merged, split, moved or reworded a lesson), with the reason.

**Unit section:**
- theme, and what the unit adds;
- **unit videos**: each with title, channel, URL, approximate length, **role** (`main` or `supplemental`, per the README Video row), and where its content information came from (transcript, summary, or title/description/chapters). `main` only when that information is enough to build the lesson around the video and fill its gaps. Videos that couldn't be verified are listed as `to find`, with search criteria, never with a guessed URL;
- **unit checks**: the brainstorm §4.5 checks, each pass or fail with a note.

**Lesson entry:**

```
#### 1.16a · 没 says it didn't happen   (les:mei-did-not-happen)
- Shape: Pattern · Skill: 没 marks an action that didn't happen (zh:g:mei-verb) · ~6 min
- Teacher's summary: two to four sentences, the way a teacher would describe teaching it.
- Opener (Showdown): the hook, and which video span or audio it uses.
- Lesson (I do): the one idea, its figure if any, the ✗/✓ pair if any.
- Examples (we do): what is shown in action; contexts, voices and rung.
- Practice (you do): format and C-code, what the learner discriminates, rungs, and why this format fits.
  The skill card reviews in this same format.
- Variety: opener · format (new?) · rungs · contexts · interleaved confusables · support stage.
- Media: video and role, or none; audio source class (AISHELL, ElevenLabs v4, syllable set).
- Notes: open questions, risks, judgement calls.
```

## Conventions (from the 2026-11-03 sanity check)

- **Checkpoints add no skill card.** A checkpoint item's evidence goes to the lesson skill it is tagged to; an untagged item counts as general listening evidence. Checkpoint entries read "Skill: none".
- **Checkpoint clip pools are disjoint.** An "unseen" clip in one checkpoint (1.19, 2.16, 2.33) appears nowhere else in any plan.
- **Knowledge-item kinds.** Plans use the architecture's `g`, `sc` and `sr`, plus two kinds not yet registered there: `v` (a vocabulary theme, for vocabulary-like Clip lessons) and `l` (a listening skill: following narration, real-speed speech, fillers). Register both before authoring. `sc` also covers sound-to-spelling maps (0.6's pinyin spelling rules).
- **Long videos are fine** (README Video row): when a `main` video carries the explanation, the written I do is only the claim and its figure. Main videos play in full, and Min counts their whole length.
- **Dependencies** (from the [2026-11-03 dependency review](review-2026-11-03/README.md)): a lesson relies only on what its unit's prereq closure (doc 03 §1.8) and earlier lessons in its own unit teach. That covers words, grammar, sound skills and interleaved confusables. A lesson's target words sit in its own lesson tier. A format's one-line intro shows at its first appearance on the learner's actual path, so a format-schedule table lists the default path only.

Lesson ids: the display number is the unit plus a letter (`1.16a`). The stable id is the `les:` slug, which survives renumbering (doc 08 F3).
