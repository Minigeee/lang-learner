# Spike findings: lesson authoring format, check pipeline, zh analyzer

**Date:** 2026-11-02. **Status:** throwaway spike; nothing outside `sandbox/` depends on it.
The subagent wrote this report; the orchestrator saved it, because subagents can't write report files in this harness.
**Questions:** (1) Is the TDD §6 authoring format fast to write, especially for an AI agent, and does a minimal compile-and-check pipeline work? (2) Is a simple analyzer (`Intl.Segmenter` + CC-CEDICT + pinyin-pro) good enough for the zh pack's `analyze()`, and is `lemma:reading` a sound `itemKey`?

**Short answers:**
1. Yes, with six syntax changes. Both lessons passed the check within two runs, and every error message pointed at the right line. Most first-run errors came from the TDD's own syntax rather than from mistakes in the content: `:k[g:…]` breaks in remark-directive, and the "no unmarked hanzi" rule rejects the TDD's own example lesson.
2. Good enough for build-time analysis of catalog lines, provided a per-line override exists, as TDD `Line.py`/`Line.words` already provides. The best configuration scores 92.1 segmentation F1, 98.4% per-character reading accuracy and 95.8% on the stressed polyphones. It produced no crossing-bracket segmentation errors. The errors that matter are CC-CEDICT phrase entries that link a token to the wrong item, such as 不想 (CC-CEDICT: "unexpectedly"), 那是 ("of course") and 我去 (a slang interjection).
3. `simplified:reading` works as an item key: it is unique by construction, and 99.4% of entries get one. It is a many-to-one key, though. 4,496 entries share 2,110 keys, and 143 surfaces have keys that differ only by a neutral tone. The TDD should document both facts.

## How to run

```sh
npm install
# CC-CEDICT (CC BY-SA 4.0) into data/cedict/, not committed:
curl -L -o data/cedict/cedict.txt.gz https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz && gunzip -k data/cedict/cedict.txt.gz
npm run check            # content/ → file:line RULE message; exit 1 on errors
npm run build            # check, then dist/files/*.<hash>.json + dist/manifests/<build>.json
npm run fixtures         # one failing fixture per rule; expected.txt freezes exact output (--update to refreeze)
npm run eval:analyzer    # add -- --errors for the error lists, -- --gold for gold-vs-CC-CEDICT disagreements
npm run eval:itemkey     # add -- --examples for more examples
npm run typecheck
```

| Path | What |
|---|---|
| `content/zh/curriculum.ts` | A slice of S0 and S1 (14 lesson plans; 2 with files). Helper constructors record call sites, so curriculum errors are reported as `file:line`. |
| `content/zh/lessons/bu-vs-mei.md` | S1 1.13 "不 or 没?", Pattern template |
| `content/zh/lessons/where-is-the-cat.md` | S1 1.7 "Where is the cat?", Clip template |
| `content/media/*.yaml` | A hand-made placeholder catalog: 26 media, 27 clips, 60 lines. One media item has `transcript: none` and is free-watch only. |
| `content/zh/{items,redirects}.yaml`, `templates/` | Authored items with prereq edges, two redirects, three templates |
| `src/` | ids, parser, catalog and resolver, widget registry, rules, build, CLI |
| `src/zh/` | CC-CEDICT loader and `itemKey`, analyzer, display-time sandhi |
| `fixtures/<RULE>/` | Failing fixtures for REF001, MED001, ORD001, COPY001, OUT001, plus ID001, PARSE, STR002, ZH001 |
| `eval/gold.txt` | 130 hand-segmented, hand-read sentences (588 Han tokens); 8 are flagged low confidence |

## 1. Authoring time and iterations

Times are agent wall-clock, taken from `date` stamps in `data/timing.log`. They measure drafting and fixing only. A human review pass, which is the real cost, comes on top and wasn't measured.

| Lesson | Catalog prep | Draft | Check → fix runs to pass | Errors on run 1 | Wall-clock total |
|---|---|---|---|---|---|
| 1.13 不 or 没? (Pattern, 96 lines) | 0:42 (4 media files, 15 lines) | 0:17 | **2** | 19 (see below) | ≈ 1:40 |
| 1.7 Where is the cat? (Clip, 69 lines) | ≈ 0:20 (1 file, 6 media) | 0:35 | **1** | 0 | ≈ 0:50 |

Lesson 1's 19 errors broke down like this:
- 15 × ZH001: unmarked 不/没/是 mentions in prose;
- 1 × an unknown frontmatter key, `lesson:`, which the TDD shows but which duplicates the file name;
- 2 × errors cascading from that key;
- 1 × `:k[zh:g:you-have]`, which the parser split at the colon.

None of the 19 was a wrong id, a missing clip or an ordering problem. The fix needed one parser change (mentions, §2 change 3) and two edits to the lesson.

Lesson 2 passed on the first run, but **a self-review found a semantic bug the check can't see**. 小猫在床下边 ("under the bed") was keyed to the "Under the chair" option. Answer keys are the format's largest unchecked surface; §2 change 6 removes part of it.

Two caveats:
- I wrote the catalog minutes before the lessons, so every `:ex` matched on the first try. With an ingested catalog, a real author will lean on MED001's "nearest line" suggestions.
- Word ids needed no fixes only because CC-CEDICT's neutral-tone conventions (学生 `xue2sheng5`, 桌子 `zhuo1zi5`) happened to be right in the curriculum. When one is wrong, the error names the right key: `CC-CEDICT has zh:w:咖啡:ka1fei1`.

## 2. Format pain points and proposed changes

Each change below is implemented in the spike, except where marked *proposed*.

**1. Ids can't sit in a directive label.** remark-directive reads `:k[g:le-completion]` as the text `g` followed by a nested directive `:le-completion`, so the id is silently lost. The same thing happens to ordinary prose: "Note:This" or "ratio a:b" becomes a directive, and the text after the colon disappears. Fix: put ids in attributes, and make the parser reject every unknown directive (rule `PARSE`).

```diff
- Negating a completed action uses :k[g:mei-past-negation] alone.
+ Negating a completed action uses :k{#zh:g:mei-past-negation} alone.
- :w[行]                          (ambiguous: 3 CC-CEDICT readings → error)
+ :w[行]{#zh:w:行:xing2}
```

**2. Drop the frontmatter `lesson:` key.** The TDD already makes the file name the id key, so the key is a second source of truth that can disagree with the first. The lesson id is now `<lang folder>:les:<file name>`.

**3. Mentions vs examples.** "Any hanzi outside the directives is an error" (TDD §6.2) rejects the TDD's own example lesson ("sits right after 喝", "(一杯咖啡, 三本书)", "## 了 after the verb…"). A grammar explanation mentions its characters in nearly every sentence, so wrapping each one is noise. The new rule:
- `:m[…]` is an explicit mention: no audio, no item link.
- The zh pack treats an unmarked Han run of **≤ 4 characters with no sentence punctuation** as a mention.
- ZH001 fires only on longer, sentence-like runs: "unmarked Chinese '我昨天没去公司。' reads as an example; mark it :ex[…] or :m[…]".

The core rule from architecture §6 still holds: anything that needs audio is marked explicitly. Only the zh lint is lenient, because Han detection is reliable.

```diff
- :w[了]{#zh:w:了:le5} sits right after :w[喝] …   (or 15 ZH001 errors)
+ 了 sits right after 喝 …                          (mentions; rendered with ruby)
```

**4. `:ex` resolves its clip by transcript match.** The TDD requires `{clip=…}` in prose but resolves activity `line:`s by transcript match, which is inconsistent. In a real catalog, clip ids are ingester-generated strings that the author has to look up. Now `:ex[…]` matches any lesson-eligible clip line containing the text (punctuation and spaces ignored), and `{clip=…}` only pins a choice. Lesson 2 uses no clip ids at all; the compiler records the matching clips.

```diff
- :ex[我昨天没喝咖啡。]{clip=clip:cv-neg-002}
+ :ex[我昨天没喝咖啡。]
```

**5. Shorter ids in language folders** *(proposed)*. Lesson 1 spells `zh:` 23 times. Files under `content/zh/` could write `g:bu-vs-mei` and `w:学生` and leave the qualified, fully keyed id to the compiler and `ids.lock`. A bare `w:学生` would resolve when the lemma has one CC-CEDICT reading; a polyphone would still need its reading. Typing `zh:w:哪儿:na3r5` or `zh:w:桌子:zhuo1zi5` means knowing CC-CEDICT's erhua and neutral-tone conventions; the check's suggestion fixes that in one run, but lemma-only ids remove the run.

```diff
- teaches: ['zh:g:place-you-thing', 'zh:w:猫:mao1', 'zh:w:椅子:yi3zi5', 'zh:w:外边:wai4bian5']
+ teaches: ['g:place-you-thing', 'w:猫', 'w:椅子', 'w:外边']
```

**6. Derive answers from line tags where possible** *(proposed)*. In a sorting activity, the answer is already in the catalog's line tags, so hand-keying it duplicates knowledge and invites lesson 2's bug class. The check would then verify that every line has exactly one matching tag. The spike does validate that each `answer` is one of the option keys (a `superRefine` on the widget schema), which catches typos but not wrong choices.

```diff
- options: [{ key: wont, label: … }, { key: didnt, label: … }]
- items: [{ line: 他不吃肉。, answer: wont }, { line: 他没吃饭。, answer: didnt }, …]
+ options: [{ item: g:bu-negation, label: … }, { item: g:mei-past-negation, label: … }]
+ items: [{ line: 他不吃肉。 }, { line: 他没吃饭。 }, …]     # answer = the option whose item tags the line
```

**Smaller observations:**
- **Instance fields** (`key`, `optional`, `reason`) share the widget's YAML body, so they must be stripped before strict validation. The parser now does that.
- **Flow-style YAML and English commas.** `{ en: I don't drink tea, I only drink coffee. }` silently turns "I only drink coffee." into a key. Strict schemas catch it, but the message (`Unrecognized key: "I only drink coffee."`) needs a hint about quoting. Media files should prefer block style for `en:`, or the ingester should always quote it.
- **One media item per Common Voice sentence takes 10 lines** (`cv-negation.yaml`: 110 lines for 9 sentences). An `audio-set` media shape, with shared rights and transcript source plus one clip per item, would cut that to about 2 lines per sentence. That's the ingester's output format, so it matters even though nobody hand-writes it.
- **A "vs" lesson needs a contrast item.** 不 vs 没 can't `teach` its members, since earlier lessons already teach them, so it teaches `zh:g:bu-vs-mei` with prereqs on both members. The TDD has sound contrasts (`sc:`) but no guidance for grammar contrasts. It should say that a contrast lesson teaches a contrast item, and that its `confusable` edge is separate from the item.
- **Call-site capture works for TS curriculum files.** `lesson()` reads its own stack frame, so curriculum errors print as `content/zh/curriculum.ts:59 ORD001 …` with no YAML needed.
- **For an agent, YAML in fences is not a problem.** The friction came from directive-parser edge cases and from rules that contradicted the reference lesson. An agent copies the reference lesson's habits, so **the reference lesson must pass the check**. Make that a CI rule.

## 3. Were the check errors actionable?

Mostly yes. Each rule has a failing fixture whose exact output is frozen in `fixtures/<RULE>/expected.txt` (`npm run fixtures`: 9/9 ok). Samples:

```
fixtures/REF001/curriculum.ts:5 REF001 zh:les:fixture-ref001 teaches: "zh:w:咖啡:ka1fei4" does not exist; CC-CEDICT has zh:w:咖啡:ka1fei1
fixtures/REF001/lessons/fixture-ref001.md:14 REF001 :k: "zh:g:mei-past-negaton" does not exist; did you mean zh:g:mei-past-negation?
fixtures/REF001/lessons/fixture-ref001.md:14 REF001 :w[行] is ambiguous (zh:w:行:hang2, zh:w:行:heng2, zh:w:行:xing2); pin one with {#…}
fixtures/REF001/lessons/fixture-ref001.md:34 REF002 (warn) @tap-when-you-hear: "zh:g:bu-mei" is retired; write "zh:g:bu-vs-mei"
fixtures/MED001/lessons/fixture-med001.md:15 MED001 :ex[他没去。]: clip:cv-neg-001 has no line containing "他没去。"; nearest: 他没去。 (clip:cv-neg-008) | …
fixtures/MED001/lessons/fixture-med001.md:4 MED001 clip slot "free": clip:cartoon-ep-07-01 has no automatic transcript; it can only be a free-watch item
fixtures/ORD001/curriculum.ts:6 ORD001 zh:les:fixture-ord001 zh:g:place-you-thing needs zh:g:place-words, first taught by zh:les:place-words, which comes later
fixtures/COPY001/lessons/fixture-copy001.md:9 COPY001 explain: internal term "we do" in user-facing text; use Listen / How it works / Practice / Check
fixtures/OUT001/lessons/fixture-out001-sounds.md:22 OUT001 @shadow asks for output level 1; "Sounds" allows 0 for required activities (mark it "optional: true")
fixtures/ID001/lessons/fixture-id001.md:9 ID001 :w[不]: id "zh:w:不:bu4" is not NFC-normalized (U+F967 → U+4E0D; it looks identical but won't match). Retype it
fixtures/PARSE/lessons/fixture-parse.md:9 PARSE ":This" was read as a directive. If it is part of an id, put the id in an attribute (:k{#zh:g:…}); in prose, escape the colon as "\:"
```

The spike fixed three message problems along the way. The table records them because the real implementation will hit the same ones.

| Problem | Fix |
|---|---|
| An invalid frontmatter cascaded into "unknown clip slot" errors for every widget | Skip the dependent checks when the frontmatter fails |
| A zod "unrecognized key" pointed at the enclosing object's line | Report it on the key's own line |
| An NFC error showed two strings that look identical | Show the code points (`U+F967 → U+4E0D`). CJK compatibility ideographs are the realistic way a non-NFC hanzi reaches the repo. |

**Remaining weaknesses:**
- **COPY001's term list is broad.** "slot", "evidence", "template" and "pass 2" are also plain English. It should live next to the app-ui-flow mapping as data, with a per-line allow marker.
- **Some messages state the problem but not where to fix it.** For example, `ORD001 … which comes later` names the lesson, but not whether to move this lesson or add an earlier one. Reading a single line is still enough to decide.
- **The check can't validate meaning.** Answer keys, translations and whether a gist question is answerable are all beyond it (§1).

## 4. Analyzer accuracy (`src/zh/analyzer.ts`, `eval/`)

**The gold set.** 130 sentences, 588 Han tokens. Every listed polyphone has 4–10 sentences. The segmentation guideline was written before any tool was run: lexicalized words are one token, free combinations are split, particles stand alone, and A-not-A is three tokens.

- Readings are citation readings, written by hand.
- I checked each one against CC-CEDICT afterward (`--gold`). Three tokens disagreed:
  - 受不了: CC-CEDICT gives `bu4`.
  - 好久不见: CC-CEDICT gives `bu5`.
  - 小明: not in CC-CEDICT.
- Because the key has to match CC-CEDICT, the gold now follows CC-CEDICT. That also exposed an inconsistency in CC-CEDICT itself: 155 multi-character keys write 不 as `bu5`, the rest as `bu4`.
- 8 sentences are flagged `# low:`. They are mostly granularity choices (这个, 好久不见, 找着, 听不懂) and one context-free ambiguity (好学).

**The strategies compared:**
- Segmenters:
  - `icu`: `Intl.Segmenter('zh')` alone;
  - `fmm`/`bimm`: forward or bidirectional longest match over CC-CEDICT;
  - `hybrid`: ICU first, then BiMM on any ICU token that isn't a dictionary word;
  - `hybrid-merge3`: hybrid, then re-join adjacent tokens that form a CC-CEDICT word of 3+ characters.
- Readings:
  - `pinyin-pro` over the whole sentence (`toneSandhi: false`);
  - `pinyin-pro` per token, with no sentence context;
  - `cedict-guided`: choose among the token's CC-CEDICT readings using the in-sentence pinyin-pro guess;
  - `+particles`: a standalone 了/着/过/得/地 defaults to its particle reading.

| Segmenter | Readings | Seg P / R / F1 | Char reading | Polyphones (n=142) | Sentence fully right | Token item id |
|---|---|---|---|---|---|---|
| icu | pinyin-pro | 81.8 / 70.6 / 75.8 | 94.5% | 88.0% | 70.0% | 59.0% |
| hybrid | pinyin-pro | 93.3 / 90.5 / 91.9 | 94.5% | 88.0% | 70.0% | 83.0% |
| hybrid | pinyin-pro per token | 93.3 / 90.5 / 91.9 | 91.6% | 72.5% | 56.9% | 79.4% |
| hybrid | cedict-guided | 93.3 / 90.5 / 91.9 | 97.0% | 91.5% | 83.1% | 86.1% |
| hybrid | cedict-guided+particles | 93.3 / 90.5 / 91.9 | 97.9% | 95.8% | 88.5% | **87.2%** |
| **hybrid-merge3** | **cedict-guided+particles** | 94.4 / 90.0 / **92.1** | **98.4%** | **95.8%** | **90.8%** | 86.6% |
| fmm | cedict-guided+particles | 93.6 / 88.3 / 90.9 | 98.2% | 95.1% | 89.2% | 84.5% |
| *gold segmentation* | cedict-guided+particles | — | 98.7% | 94.4% | 92.3% | 98.1% |

The full 24-row table comes from `npm run eval:analyzer`.

**What the numbers say:**
- **Sentence context matters.** Running pinyin-pro per token drops polyphone accuracy from 88% to 72.5%. Readings must come from the whole sentence.
- **ICU alone is too coarse for item linking.** It merges, for example, 买东西 and 很好 (in 很好看). It works as the first pass, with the dictionary fixing the rest.
- **CC-CEDICT guidance fixes pinyin-pro's systematic misses**, which are on frequent words:
  - 长得 read `chang2 de2` instead of `zhang3 de5`;
  - complement 得 read `de2`;
  - adverbial 地 read `di4`;
  - 东西 "thing" read `dong1xi1`;
  - erhua read `er2` where CC-CEDICT has `r5`.
- **Treat the `+particles` rows as optimistic.** I added that rule after seeing the errors. It is linguistically generic, but it was tuned on this set. The 1.5-point gain should be confirmed on fresh sentences.
- **`hybrid` and `hybrid-merge3` are within noise of each other.** Pick one with a larger gold set.

**Error taxonomy (hybrid-merge3 + cedict-guided+particles)**

| Type | Count | Examples | Harm |
|---|---|---|---|
| Segmentation: crossing brackets | **0** | — | — |
| Over-merge: CC-CEDICT phrase entry | 33 | 一个 / 一家 / 一遍 (7), 不行 / 不能 / 不是 / 不舒服 / 好不好 (5), 我去 (3: a CC-CEDICT slang entry), V+O 喝茶 / 看书 / 买东西 / 在家, 长得, 穿着, 太好了, 什么时候, 你真行 | Mostly harmless granularity. **Harmful when the phrase entry means something else:** 我去 (interjection), 你真行, and in the lesson catalog 不想 ("unexpectedly") and 那是 ("of course"). These link the token to the wrong item and gloss. |
| Over-split | 3 | 好吃, 好学 (low), 小明 (name) | A missing item link |
| Reading: wrong polyphone | 5 | 行 as a measure word (`hang2`), 得 "must" (`dei3`) ×2 (the particle default wins), 着 in 穿着 (`zhuo2`), 还 "return" (`huan2`) | Real errors |
| Reading: wrong tone | 1 | 只 "only" read `zhi1`, also in the lesson line 我只喝咖啡 | A real error, from pinyin-pro |
| Reading: neutral vs full | 6 | 个 in 一个 ×4 (CC-CEDICT `yi1ge5` vs the gold split `ge4`), 地方 `fang1`/`fang5`, 不 in 好不好 | 5 are convention artifacts; 地方 is a real meaning difference |

**In-domain check:** `npm run build` analyzes all 60 catalog lines. Reviewing them by hand turned up 5 problems: 只 `zhi1`, 不想, 那是, 床下边 → 床/下/边 with 边 as `bian1`, and 小明 split.

**Verdict:** good enough to generate ruby and item links at build time, if the pipeline has three things:
- **Use the existing overrides.** Keep TDD `Line.py` and `Line.words` as the escape hatch.
- **Flag uncertain lines for review.** Have the check *flag*, not fail, a line that has:
  - a token whose pinyin-pro guess isn't among its CC-CEDICT readings;
  - a multi-character token whose first syllable is 不 or 一;
  - a known "false-friend" phrase entry.

  That puts the remaining errors in front of the author once per line instead of in front of the learner.
- **Use the HSK list as the merge arbiter** *(proposed; untested here)*. Merge two tokens only if the merged word is in hsk30 or the parts aren't both HSK words. That would split 不想, 我去 and 那是 automatically, without a hand-made list, which respects the no-manual-curation rule.

**Tone sandhi stays out of the stored reading.** Tokens store citation tones (`不是` = `bu4 shi4`, `一个` = `yi1 ge4`). Display applies the rules at render time through `displayTones(tokens)`, a pure function in the pack keyed by the `sr:` rule ids:
- `sr:bu-sandhi` and `sr:yi-sandhi`, with exceptions for ordinal and counting 一 (第一, 十一);
- `sr:third-tone-sandhi`, applied pairwise from right to left.

On the gold set:
- **一/不:** 27 changes, and pinyin-pro's `toneSandhi: true` agrees on all 27 (after adding the 第一 exception).
- **Third tone:** 28 changes. pinyin-pro has no equivalent. A pairwise rule is approximate: chains such as 我也很好 depend on prosodic grouping. Token boundaries are a reasonable proxy, but the "spoken tones" display should be labeled as approximate.

Because the stored reading never changes, display is a user setting ("dictionary tones" vs "spoken tones") and could switch per rule once its `sr:` lesson is complete.

## 5. `itemKey(entry)` = `<simplified>:<reading>` over CC-CEDICT

The data is the CC-CEDICT release of 2026-11-02: 125,356 entries.

| Finding | Count | Notes |
|---|---|---|
| Entries with no valid key | 757 (0.6%) | 600 have punctuation in the reading (two-clause idioms), 140 have Latin letters (3D打印), 3 have digits, 14 others. None are learner words; skipping them is fine. |
| Distinct keys | 122,213 | Unique by construction |
| Keys shared by 2+ entries | 2,110 keys / 4,496 entries | — |
| … proper noun vs common word (lowercasing merges them) | 1,053 | 三 `San1` (surname) and `san1` (three). Harmless for learners: the surname becomes one more gloss. |
| … different traditional forms | 1,057 | Mostly old variants. **289 merge two real words**: 干 (乾 dry / 干 concern), 系 (係/系/繫), 准 (准/準), 制 (制/製), 了 (了/瞭), 云 (云/雲). Fine for a simplified-only learner, but Traditional support (README open decision 1) would need a sense discriminator. |
| Surfaces with 2+ keys (the analyzer must choose) | 1,251 | Every S1 polyphone: 得 4, 着 4, 的 4, 和 5, 了 3, 行 3, 长/好/都/地/为/觉/重/只/便/还 2. 不 and 一 have **1 key each**, so storing citation tones gives them stable ids. |
| … keys that differ only by neutral vs full tone | 143 | 不是 `bu4shi4`/`bu4shi5`, 东西, 地方, 人家, 下场. **The main stability risk:** a neutral-tone call can split one word into two items. The analyzer snaps a guess to the CC-CEDICT key when only the neutral tone differs. |
| Readings CC-CEDICT may split later | 186 "also pr." entries | Each could become its own key in a future release |
| Variant and see-also entries | 7,954 | Candidates for redirects rather than items |
| Erhua keys ending in `r5` | 635 | 一下儿 `yi1xia4r5` is a different key from 一下. Readings must use CC-CEDICT's `r5`, never pinyin-pro's `er2`. |

**Verdict:** keep `simplified:reading`, lowercased, ü as `v`, tone 5 for neutral. Put four things in the contract:
- **It's many-to-one.** A word item bundles every CC-CEDICT entry with that key (merged glosses, every traditional form).
- **Key churn is untested.** Only one MDBG release was fetched, so this spike couldn't measure churn between releases. Have `content:import cedict` print a key-churn diff, and let ID003 (ids.lock) force a redirect for every vanished key.
- **Neutral tones snap to CC-CEDICT.** The analyzer snaps neutral-tone variants to an existing key, and never mints a key CC-CEDICT doesn't have.
- **Analyzer-only words are not items.** A lemma missing from CC-CEDICT (such as 小明) gets no item id. Promoting one to an item requires an `items/overrides/words.yaml` entry.

## 6. Recommendations for the TDD and the architecture

**TDD §6 (authoring format)**
1. Replace `:k[…]` with `:k{#id}` and `:w[…]{id=…}` with `:w[…]{#id}`. Add "unknown directive" to the parse errors, and state the colon hazard in prose.
2. Drop `lesson:` from the frontmatter.
3. Add `:m[…]` mentions, and make the zh lint accept short unmarked Han runs (≤ 4 characters, no sentence punctuation) as mentions. Fix §6.3's example lesson, which fails the current rule.
4. Make `{clip=…}` optional on `:ex`, resolving by transcript match as activity lines already do. Matching ignores punctuation and whitespace, and part of a line is enough.
5. Consider short ids in language folders and lemma-only word ids (§2 change 5).
6. Derive answers from line tags in sorting widgets (§2 change 6).
7. Say how contrast lessons model `teaches` (a contrast item with prereqs on both members).
8. Add a CI rule: the reference lessons Claude drafts from must pass the check.

**TDD §7 / architecture §6 (widget contract)**
9. Add two accessors next to `refs(c)`:
   - `lines(c)`: target-language lines that need a native clip;
   - `copy(c)`: user-facing strings.

   With them, MED001 and COPY001 need no widget knowledge. The spike's rules read only `refs`, `slotRefs`, `lines` and `copy`.
10. Keep instance fields (`key`, `optional`, `reason`) out of `config`. The parser splits them off before validation; say so in the contract.

**TDD §8.2 (check rules)**
11. Rule ids in the spike, for reuse: ID001 (grammar and NFC), REF001/REF002 (resolution and retired ids), MED001, ORD001, COPY001, OUT001 (the stage's output policy: `{ required, optional }` levels per stage, which implements architecture's "keyed on stage"), STR002, ZH001 (pack lint) and PARSE.
12. Suppress cascading errors; point unknown-key errors at the key's line; show code points in NFC errors.
13. Add a warn-level `ZH002` for "uncertain analysis" lines (§4 verdict). It is the cheapest way to keep reading errors away from the learner.

**Architecture §4 / §6 (content toolchain, language pack)**
14. **Run `analyze()` at build time for catalog lines, and ship tokens in the media files.** Each token is `{ s, r, id }` (see `dist/files/media.*.json`).

    The browser-side `analyze()` is then needed only for mined sentences. It needs a dictionary (a 9 MB raw CC-CEDICT, sharded) plus pinyin-pro's own dictionary in the bundle. Measure that cost before promising `analyze()` in the browser; the alternative is to analyze mined sentences when they sync.
15. **The `LanguagePack` contract should say what the readings promise:**
    - readings are citation forms;
    - `displayTones()` (or `Ruby`) applies sandhi keyed by `sr:` ids;
    - `itemKey` is many-to-one over dictionary entries;
    - the analyzer never mints an item id that isn't a lexicon key.
16. **Hash-named files and the per-build manifest work as described.** `dist/files/<name>.<sha256-16>.json` is written only if absent. `dist/manifests/<build>.json` lists the lessons with their hashes, curriculum order, redirects and widget versions. Rebuilding unchanged content reproduced the same build id (`6f79b259e75d`).

**Not covered by this spike:** MED002–MED007, STR001 budgets, STR003 (`evidenceTargets` ⊆ `teaches ∪ assumes`), ID003 (`ids.lock`), widget `expand()`, and any runtime. The gold set is one author's judgment and small. Its error counts are directional, not precise.