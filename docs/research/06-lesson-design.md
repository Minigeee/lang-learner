# 06: Lesson design (patterns from vue-crash-course)

The user's earlier education project, `C:\Users\tritn\Documents\m42\vue-crash-course` (a VitePress Vue 3 course), produced a lesson system they liked: atomic lessons, a variety matrix, and a strict writing style. This doc records what transfers to a Mandarin curriculum, what has to change, and why. The source is internal: [CURRICULUM.md](../../../../m42/vue-crash-course/CURRICULUM.md) (§2 lesson format, §3 writing style, §4 navigation) and lesson 2.2 as the reference.

## TL;DR

- **Atomic lessons transfer directly.** One idea per lesson, a ~5–7 min core, optional collapsed "Go deeper". This is exactly what fragmented 5/30/60-min study time needs.
- **The shared skeleton transfers. The *idea* of a variety matrix transfers too, but not vue-crash-course's list.** Its six archetypes were chosen ad hoc for conceptual CS lessons. A language curriculum's lesson and activity types should come from SLA pedagogy and Refold's input-first ordering, not from translating the Vue list. **Not decided yet:** see [07 Activity types](07-activity-types.md).
- **The writing rules transfer almost unchanged.** These are peer register, claim headings, "give the rule, then the cases", one word per concept, ❌/✅ for the common mistake, checking every absolute, and naming and linking sources.
- **Two things must change for language:**
  1. **"Show the state, then explain" becomes "hear it first, then explain."** Native audio or video comes first, and the explanation is short. Input is the content; prose is support.
  2. **"We do" comes back.** vue-crash-course deliberately removed guided practice (its §16, decided 2026-10-30) because its ideas were conceptual. Tones, sounds and characters are perceptual and motor skills that need many guided reps, so a language lesson needs I do → we do → you do.
- **Every lesson ends by feeding the SRS.** The lesson's words, sentences and clips become cards, so the lesson connects to the 25% flashcard time (doc 02).
- **`curriculum.ts` as the single source of truth maps onto the knowledge graph.** Each lesson has an id, idea, prereqs and minutes; prereqs are suggestions, not gates. This matches doc 04's soft-gated graph.

## Findings

### What vue-crash-course does

**Lesson shape (its §2).** The parts are: The idea (1–2 sentences) → Explanation (≤ ~1,000 words, claim headings, ❌/✅ mistake) → Demo (a working playground) → Recap (3 bullets) → Challenge (optional, ≤ 10 min, different domain from the demo) → Go deeper (collapsed sections titled as questions). The target is ~7 min for explanation + demo + recap. A lesson that runs long is split in two; the prose is not compressed.

**Variety (its §2).** Six archetypes, chosen by "what kind of idea is this?":

| Archetype | For an idea that is… |
|---|---|
| Walkthrough | how something works |
| Showdown | a choice between approaches |
| Mystery | a gotcha (symptom shown first, cause after) |
| Build-along | how to do something, in 3–4 steps |
| Refactor | a better structure for working code |
| Tour | orientation through an artifact |

It also has six challenge formats: Build to spec, Fix it, Extend, Refactor, Predict, Review. The rules are checked mechanically: neighbors on the path never share an archetype or a format, and each module uses at least 3 of each.

**Writing style (its §3).** Ease comes from structure, reasoning and language, not from cutting words. The rules that matter most here:
- Headings make a claim ("Why Vue can't see a plain variable", not "The problem").
- Each paragraph follows from the last, using connecting words.
- Mechanisms are told as a numbered sequence.
- Say why in the same breath as what.
- Give the rule, then the cases, so the reader can predict the cases instead of memorizing them.
- One word per concept.
- No filler ("simply", "just"), no hedges, no talking about the course.
- Simplify by leaving things out, never by being slightly wrong.
- Write for a peer: no scene-setting, no staged reveals.

**Navigation (its §4).** It is meant to be done in order but is skippable. Nothing is gated, and prereq chips show a one-line refresher. Each term has one owning lesson. Every module has a cheat sheet.

**Tooling.** `npm run check` lints each lesson's structure and style rules. `curriculum.ts` holds titles, ideas, prereqs and minutes.

### What changes for Mandarin

1. **Input first, short explanation.** Refold (doc 01) and the CI research say a learner acquires from comprehensible input, not from explanation. The vue explanation budget of ~600–1,000 words drops to roughly **100–300 words**. The native clip is the "demo", and it comes first.
2. **Guided practice returns.** A Vue reader can understand `ref()` once and apply it. A beginner can't hear 2nd vs 3rd tone after one explanation, so perception needs dozens of guided, feedback-rich reps. The new shape is: I do (a native speaker models it) → we do (guided discrimination with instant feedback; shadowing is optional and perception-gated per doc 07) → you do (an unscaffolded check on new material).
3. **No TTS means every example needs a native recording.** In the vue course an example was free to write. Here each example sentence needs a native clip: timestamps in an embeddable YouTube video, Common Voice (CC0), audio-cmn (CC BY-SA) or Global Storybooks (CC BY) (doc 03). Most Tatoeba Mandarin audio is unlicensed, so it is excluded by default. This is the main content-production cost, and it shapes which examples a lesson can use.
4. **Examples are chosen by what is audible, not by "domain".** The vue "rotate domains" rule becomes "rotate speakers and contexts". Hearing the same word from several voices (male/female, fast/slow, a kids' show vs a vlog) is the language version of seeing an idea in several kinds of software.
5. **Lessons end in cards.** Every lesson emits candidate SRS cards: its words, its one-new-thing sentences, and its tone pairs. The challenge is optional, but the cards are what the lesson leaves behind.
6. **Explanations are in English, examples in Chinese with pinyin.** Pinyin removal is staged by word count, per doc 01.

### Archetypes translated (first pass, superseded)

> **Status: not adopted.** This is a straight translation of the Vue list, and it has two problems:
> - It inherits that list's ad hoc origin.
> - Some entries are output tasks, which Refold puts much later. "Upgrade" (rewrite like a native) and free sentence building don't belong in Phases 0–2.
>
> It is kept here only as a record. Doc 07 replaces it with a taxonomy grounded in language-learning pedagogy.

| Vue archetype | Language version | Use when the idea is… | Example lesson |
|---|---|---|---|
| Walkthrough | **Walkthrough** | how a sound or rule works | Third-tone sandhi as a sequence: two 3rd tones → the first rises |
| Showdown | **Showdown** | two things that are easily confused | 二 vs 两, 不 vs 没, zh vs j, 2nd vs 3rd tone |
| Mystery | **Mystery** (*"What did they say?"*) | a gotcha the ear trips on | Play 你好: why does it sound like *ní hǎo*? Clues, then the cause (sandhi) |
| Build-along | **Build-along** | assembling something | Build a sentence slot by slot: 我 → 我想 → 我想喝 → 我想喝咖啡 |
| Refactor | **Upgrade** | a more natural way to say working Chinese | Textbook sentence → how a native would say it, in stages |
| Tour | **Tour** | orientation through an artifact | The pinyin chart; the parts of a character (radical + phonetic) |
| (new) | **Clip study** | a native clip worth mining | 30–90 s of Mandarin Corner: watch → key words → mine 1–3 sentences |
| (new) | **Ear drill** | pure perception | Minimal-pair rounds for tones or initials, with no explanation beyond the idea line |

### Practice formats translated (first pass, superseded)

> **Status: not adopted.** Superseded by doc 07. Input-first note: Pick what you heard, Predict and Meaning check are input tasks. Shadow and Dictation are light, scaffolded output. Build to spec and Fix it lean toward production and probably don't belong in Phases 0–2.

| Format | The learner… | Covers |
|---|---|---|
| **Pick what you heard** | hears a clip and chooses between minimal pairs | we do / you do (perception) |
| **Shadow** | repeats after the native speaker, optionally recording to compare | we do (production) |
| **Predict** | answers "what tone will 一 take here?" before hearing it | you do (rules) |
| **Fix it** | spots the wrong tone, character or word order in a line | you do |
| **Dictation** | types the pinyin or characters of a short clip | you do |
| **Build to spec** | assembles a sentence from tiles to match a meaning | you do |
| **Meaning check** | watches a new clip and answers a gist question | you do (comprehension) |

The vue rules carry over: neighboring lessons never share an archetype or a format, each module uses at least 3 of each, and a starter never "crashes" (every clip loads and is comprehensible at its level).

### Writing rules that carry over unchanged

- **Claim headings:** "Two 3rd tones in a row: the first one rises", not "Tone sandhi".
- **Give the rule, then the cases:** one sandhi rule predicts 你好, 很好 and 可以. The 一/不 rules predict their cases the same way.
- **One word per concept:** pick *tone* (not "pitch" or "inflection") and *syllable*, and stick to them.
- **❌/✅ for the common mistake:** ❌ 我是高 → ✅ 我很高; ❌ two full 3rd tones.
- **Check every absolute:** language rules have exceptions (neutral tones, regional variation). "Never" and "always" need checking against the Chinese Grammar Wiki and native usage.
- **Name and link sources:** "AllSet's Chinese Grammar Wiki puts this at A1 ([link])".
- **Write for a peer:** the user is an adult engineer. No cartoon framing, no "Great job!".

## Implications for the app

- **MUST** model a lesson as data with the same fields as `curriculum.ts`: `id`, `title`, `idea`, `prereqs`, `minutes`, plus `archetype`, `practiceFormat`, `clips[]` (source + start/end), and `emitsCards[]`. Lessons are knowledge-graph nodes (doc 04).
- **MUST** use the fixed lesson skeleton:
  1. Idea.
  2. Hear it (a native clip).
  3. Explanation (≤ 300 words).
  4. We do (guided reps).
  5. You do (a short check on new material).
  6. Recap.
  7. Cards added.
  8. Go deeper (collapsed).
- **MUST** keep each lesson core to 5–7 min, and make lessons resumable mid-way.
- **MUST** use only native-speaker audio for examples. A lesson can't ship until every example has a clip.
- **SHOULD** have a `check` script enforce the writing rules (word budget, claim headings, banned phrases). Whether variety is enforced by a matrix, and with which types, waits on doc 07.
- **MUST** respect input before output: activities in Phases 0–2 are input and perception tasks, with only light, scaffolded output such as shadowing or single-word recall (doc 01).
- **SHOULD** offer prereq chips with one-line refreshers and no gates.
- **SHOULD** give each module a cheat sheet (a tone-rules card, a pinyin chart).
- **COULD** let Claude draft lessons to these rules, with the user reviewing, much as the vue course was written.

## Open questions

1. **Should "we do" come back?** This doc recommends yes for language, reversing the vue course's "no guided practice" decision. Confirm.
2. **Lesson authoring.** Will lessons be hand-reviewed markdown/MDX in the repo (like vue-crash-course), or rows in Supabase? Repo files keep the `check` script and git history; the DB allows editing from the phone.
3. **Recording yourself for shadowing.** It needs microphone permission and storage. Is it worth including in v1?

## Sources

1. vue-crash-course `CURRICULUM.md` §2 (lesson format, archetypes, variety matrix), §3 (writing style, checklist), §4 (navigation), §16 (the "no guided practice" decision). Local file.
2. vue-crash-course `docs/.vitepress/curriculum.ts`: lesson data model (id, title, idea, prereqs, minutes). Local file.
3. vue-crash-course `docs/lessons/2-2.md`: the reference lesson for the writing style. Local file.
4. Doc 01 (Refold): input first, staged pinyin removal, 1T sentences.
5. Doc 02 (SRS): cards emitted per lesson.
6. Doc 04 (progression): soft-gated knowledge graph, lessons as nodes.
