# Lesson writing style

How the support text in lessons is written: titles, idea lines, explanations, prompts, option labels and feedback. These rules are adapted from vue-crash-course `CURRICULUM.md` §3. The rules carry over; the budgets don't. A Vue lesson has to explain a mechanism. Here the native clip does the teaching, so the support text only names the rule and gets out of the way.

**Support text** is anything written in the support language: English now, Chinese later (see [Localization](architecture.html#l10n)). **Target text** is the Chinese being learned (examples, transcripts, items). Target text is never translated in place, and the rules below apply only to support text.

## Budgets

| Piece | Budget | Example (from the activity pilot) |
|---|---|---|
| Idea line | at most 15 words, one claim | 没 says it didn't happen. 不 says you don't, or won't. |
| Explanation title | a claim, at most 10 words | 没 looks back. 不 looks at habits and ahead. |
| Explanation body | **at most 60 words in total**, 1–3 short sentences, plus at most one figure and one ✗/✓ pair | Both mean "not". What decides it is when: a past action takes 没, a habit or a plan takes 不. |
| Prompt | at most 6 words, a question | Did it happen? · Which tone? |
| Option sublabel | at most 3 words | didn't · doesn't, won't |
| Feedback | one line | Not quite. That was 没. |
| Go deeper | a question title, and an answer of at most 30 words | Why 没有, never 不有? |

The `check` script enforces word budgets on support text only, so target text isn't counted.

## Rules carried over from vue-crash-course

1. **One idea per lesson.** The idea line and the explanation title make the same claim.
2. **Titles state a claim**, never a topic. "没 looks back" rather than "Negation".
3. **Hear it, then explain it.** The clip always comes first, and prose never describes what the learner is about to hear. (This is the language version of "show the state, then explain it".)
4. **Give the rule, then the cases.** The cases are heard examples, not more prose. One rule should predict 你好, 很好 and 可以.
5. **Say why in the same breath as what.** "有 is the one verb 不 can't negate" rather than a rule plus a separate exception.
6. **One word per concept.** Pick one term and keep it: *tone* (not pitch or inflection), *past action*, *measure word*.
7. **Write for a peer.** The reader is an adult. No scene-setting, no staged reveals, no "Great job!".
8. **No filler, hedges or course talk.** Ban "simply", "just", "easy", "in this lesson", "don't worry", "let's".
9. **Simplify by leaving things out, never by being slightly wrong.** Exceptions go to Go deeper.
10. **Check every absolute.** Language rules have exceptions, so check each "never" and "always" against the Grammar Wiki and native usage.
11. **Name sources in Go deeper**, linked, never in the body.

## Rules for language lessons

12. **Target text carries the weight.** If an example can show it, delete the sentence that says it.
13. **No translation of target text inside support text**, apart from a short gloss of the one example a rule hinges on. Meanings live in tap-to-gloss and the Meaning reveal.
14. **No pinyin inside support sentences.** Pinyin belongs on examples, under the hanzi.
15. **Minimal grammar jargon.** Allowed terms (tone, measure word, verb, past action) are defined once and listed in the terms table. Avoid labels like "aspect marker" or "complement" unless the lesson is about exactly that.
16. **No internal terms** in anything a learner sees (app-ui-flow.md "UI copy").

## Writing so it translates

The support text will get a Chinese column later, so write each string so it can be translated on its own:

17. **Whole sentences, no concatenation.** Write "Not quite. That was {answer}.", never "Not quite. That was" plus a variable plus ".". Word order differs between languages.
18. **Named placeholders** (`{n}`, `{answer}`) and **separate strings for singular and plural** ("1 new card" and "{n} new cards").
19. **No idioms, puns or wordplay.** Use plain literal English.
20. **Target text stays marked up** inside support strings (`:ex[…]`, or the `zh` class in the pilot), so translators leave it alone and the check can find it.
21. **Use the terms table.** Recurring terms have a fixed translation in every column (tone → 声调, measure word → 量词), so a translation can't drift.
