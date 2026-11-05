# Authoring lessons

How a lesson goes from its plan to a checked file. The lesson plans own what each lesson teaches; this page owns how it's written. An agent drafts, a fresh agent reviews, and `pnpm content:check` gates both.

## Brief

**Read first:** the lesson's entry and unit in `docs/design/lesson-plans/`, [the arc](../docs/design/activity-brainstorm.md) (§4), and [the writing style](../docs/design/lesson-writing-style.md).

**The bar is feel.** These lessons set the style every later lesson copies. Write the clearest, shortest thing that works, the way a good teacher would say it.

**Accuracy comes first.** False and over-absolute claims about Mandarin recur in generated content. Check every "always", "never" and "only" against the Chinese Grammar Wiki or native usage. Simplify by leaving things out, never by being slightly wrong.

**Lines and audio:**
- Run `pnpm content:suggest <slug>` for native lines on the lesson's path. Early lessons have few or none, because AISHELL is news and assistant speech. Measured for 是 in lines up to 14 characters: 1 line with no unknown characters, 19 with one.
- Examples and practice use only words on the path, so most early lines are ElevenLabs v4. Alternate the two voices so voice is never the cue.
- Openers are only heard, so they should use real native lines or video when any fit, even with words the learner doesn't know.
- Add every line to `content/zh/media/requests.yaml`. AISHELL lines need restored punctuation.
- Don't use a line whose meaning you can't state, or a fragment. AISHELL has no punctuation, so read each candidate as a whole sentence. Reject 吗 lines that are rhetorical, and 叫 lines that mean shout or order.

**Cards:** one v4 voice for every word card's word and sentence. A card's sentence uses only words on the path. Choose 1–3 senses, only those that apply here.

**Motivation and Tracking rows:** never write pass marks, scores to beat, or copy that treats a miss as failure.

**Reviewer:** read the lesson as a skeptic. Confirm each claim from a source, confirm each line means what its `en` says, and confirm the practice tests the skill rather than the word. Fix what's wrong, and list what you changed and what you couldn't verify.

## Format

A lesson is one file, `content/zh/lessons/<slug>.md`. The slug is the one in `curriculum.ts` (`zh:les:<slug>`), so a file with no curriculum entry is an error. The curriculum owns the title, shape, minutes and skill; a lesson file never repeats them. `pnpm content:check` reports every problem as `file:line RULE message`.

### Frontmatter

| Key | Needed | What it is |
|---|---|---|
| `idea` | always | The idea line: one claim, at most 15 words. |
| `cards` | when the lesson adds words | Word ids carded at the end of the lesson, such as `zh:w:学生:xue2sheng5`. Each sits in this lesson's tier or its unit's tier (`content/zh/vocab/`) and has an entry in `items/overrides/words.yaml`. A checkpoint has none. |
| `skill` | when the lesson has a skill | `pool:`, the review stimuli for the skill card, as a list of [items](#items). The card takes its format, prompt and options from the lesson's practice, so pool items answer the same options. Pool lines shouldn't repeat practice lines: a review wants a line the learner hasn't heard. With no pool the lesson adds no skill card, and the check warns. A lesson the curriculum gives no skill has no `skill` key. |
| `chunks` | optional | Fixed chunks the lesson uses whole, such as `认识你很高兴`. `DEP001` lifts them out of a line before checking its words. |
| `names` | optional | Names used in lines, such as `王明`, treated the same way. |
| `deeper` | optional | Go deeper: a list of `{ question, answer }`, the answer at most 30 words. |

### Slots

A lesson fills slots in this order. Start and Done are generated, so they aren't written. Each slot holds paragraphs and at most one ` ```yaml ` fence. Nothing sits outside a slot.

| Slot | Paragraphs | Fence keys |
|---|---|---|
| `:::opener{type=story\|showdown\|mystery\|discover}` | `:ex` lines only | `video`, `hook: { prompt, options }` (2–4 options). Needs an `:ex` line or a video. |
| `:::lesson` | The explanation, at most 60 words in all. One string per paragraph. | `figure` (a name), `video`, `wrong` (a ✗ line, never played), `right` (its ✓ line, or a clip id) |
| `:::examples` | `:ex` lines only, each with `{en="…"}` | `words` (word ids, for a word-set step), `highlight` (strings to light up). Needs an `:ex` line or `words`. |
| `:::examples{type=read-along}` | `:ex` lines only, each with `{en="…"}`, in reading order | none |
| `:::practice{format=C0}` | none | `prompt`, `options`, `items` |

`:::examples` can repeat, as when a Clip lesson has a read-along and a word set. Which slots a lesson needs depends on its shape:

| Shape | Slots |
|---|---|
| Pattern, Clip | opener, lesson, examples, practice |
| Sound | opener, lesson, practice; examples optional |
| Checkpoint | practice only, and it can repeat, say for tones then pairs |

There are no `recap` or `we-do` slots.

`video` is `{ youtubeId, role: main | supplemental, durationSec }`.

### Inline directives

| Directive | Meaning |
|---|---|
| `:ex[我是学生。]` | A line that plays. Its clip is found by transcript, ignoring punctuation and spaces, so `:ex[我是学生]` matches a clip whose transcript is 我是学生。 An unpinned line takes every voice of that transcript. |
| `:ex[…]{clip="clip:…"}` | Pins one clip, for one voice. |
| `:ex[mā]{syllable=ma1}` | A bare syllable: the text is shown, and the audio is every voice of that toned syllable. |
| `:ex[…]{en="I'm a student."}` | The line's translation. A line has one translation across all lessons. |
| `:w[学生]` | A word chip. Pin a word with several readings: `:w[行]{#zh:w:行:xing2}`. |
| `:k{#zh:g:shi-links-nouns}` | A chip for any item. |
| `:m[…]` | A mention: target text with no audio and no link. |

- Attributes go in one pair of braces, and a value with a colon or a space needs quotes: `{en="He's a teacher." clip="clip:a3-ta-laoshi-1"}`.
- An unmarked Han run of up to 4 characters with no sentence punctuation is a mention already (`是 joins two nouns`). A longer one is an error (`ZH001`): mark it `:ex` or `:m`.
- A colon in prose must not touch a letter (`Note:This` reads as a directive). Write `Note: this`, or escape it as `\:`.

### Items

Practice `items` and `skill.pool` use one shape:

| Key | Needed | What it is |
|---|---|---|
| `line`, `clip` or `syllable` | exactly one | The stimulus. `line` matches like `:ex` and takes every voice. `clip` pins one. `syllable` is toned pinyin, such as `ma3`. |
| `rung` | always | The context ladder: 1 syllable, 2 word, 3 phrase, 4 sentence, 5 line in a real clip. |
| `answer` | C0 | An option key. |
| `en` | C1 | The meaning the reveal shows. Optional elsewhere. |
| `target` | checkpoints | The item its evidence goes to. Elsewhere it defaults to the lesson's skill. |
| `options` | optional | This item's own buttons, in place of the step's. |

An option is `{ key, label }`, the label at most 3 words. Add `target: true` when the label is target text, which is never translated: `{ key: '1', label: ā 1, target: true }`.

YAML reads a comma in a flow value as a separator, so quote any value that holds an English comma, colon or quote mark.

### C0 Pick

Hear it, tap one of 2–4 buttons.

````md
---
idea: 是 joins who someone is to what they are.
cards: [zh:w:学生:xue2sheng5, zh:w:老师:lao3shi1]
skill:
  pool:
    - { line: 他是学生。, answer: he, rung: 4 }
deeper:
  - question: Is 是 always "is"?
    answer: It links two nouns. Adjectives work differently, and a later lesson shows how.
---

:::opener{type=discover}
:ex[我是学生。]
:ex[他是老师。]

```yaml
video: { youtubeId: aaaaaaaaaaa, role: supplemental, durationSec: 107 }
hook:
  prompt: What does 是 do?
  options: [It joins two nouns, It asks a question, It says no]
```
:::

:::lesson
是 joins two nouns: who, then what they are. :ex[我是学生。] says it in one line, and :w[学生] comes last.

```yaml
figure: slot-bands
wrong: 我学生。
right: 我是学生。
```
:::

:::examples
:ex[我是学生。]{en="I'm a student."}
:ex[他是老师。]{en="He's a teacher." clip="clip:a3-ta-laoshi-1"}

```yaml
highlight: [是]
```
:::

:::practice{format=C0}
```yaml
prompt: Who is the teacher?
options:
  - { key: he, label: He is }
  - { key: me, label: I am }
items:
  - { line: 他是老师。, answer: he, rung: 4 }
  - { line: 我是老师。, answer: me, rung: 4 }
```
:::
````

### C1 Recall

Hear it, think of the meaning, reveal, grade yourself. There are no options or answers, and every item has `en`.

````md
---
idea: Greetings are fixed chunks, learned whole.
cards: [zh:w:你好:ni3hao3, zh:w:再见:zai4jian4]
chunks: [认识你很高兴]
skill:
  pool:
    - { line: 我是学生。, en: I'm a student., rung: 4 }
---

:::opener{type=story}
```yaml
video: { youtubeId: bbbbbbbbbbb, role: supplemental, durationSec: 95 }
hook:
  prompt: Who does she introduce?
  options: [Herself, Her teacher]
```
:::

:::lesson
Greetings are fixed chunks, so you learn them whole. :w[你好]{#zh:w:你好:ni3hao3} opens and :k{#zh:w:再见:zai4jian4} closes.
:::

:::examples{type=read-along}
:ex[你好！]{en="Hello!"}
:ex[认识你很高兴。]{en="Nice to meet you."}
:ex[再见！]{en="Goodbye!"}
:::

:::examples
```yaml
words: [zh:w:你好:ni3hao3, zh:w:再见:zai4jian4]
```
:::

:::practice{format=C1}
```yaml
prompt: What does it mean?
items:
  - { line: 你好！, en: Hello!, rung: 2 }
  - { line: 再见！, en: Goodbye!, rung: 2 }
```
:::
````

### Word cards

Each word in `cards` has an entry in `content/zh/items/overrides/words.yaml`. It's a share-alike overlay of CC-CEDICT, and `VOC001` traces each sense to a real one.

```yaml
- id: zh:w:学生:xue2sheng5
  senses: [student]                 # 1–3, each one of the word's CC-CEDICT senses, or a whole-word part of one
  word: clip:tts-xuesheng           # the word on its own
  sentence: clip:tts-xuesheng-line  # same voice as `word`; its line must contain the word
  en: I'm a student.                # the sentence's translation
  target: 学生                       # optional: the text to bold, when it isn't the word's own surface
```

`image` defaults to `{ none: pending }`, so leave it out.

### Media

Lines reach `content/zh/media/media.yaml` through `requests.yaml` and `tools/media-ingest`. Put the punctuated display text in a request's `zh`; it must equal the transcript once punctuation is ignored. A TTS line is as legal as a native one. `pnpm content:suggest <slug>` lists AISHELL lines whose words are all on a lesson's path, with speaker counts, and works before the lesson has a file.
