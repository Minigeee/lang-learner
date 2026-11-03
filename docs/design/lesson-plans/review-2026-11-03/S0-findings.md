# S0 dependency review

Scope: `docs/design/lesson-plans/S0.md`, units 0.1–0.14 (33 lessons), plus the S1/S2 plans wherever they lean on S0. Graph: doc 03 §1.8 Prereqs (unit nodes, transitive). The fixes follow the coordinator's override: they are additive, use no lesson-level or skill-level edges, and don't reorder existing units.

Prereq closures used below (from doc 03 §1.8):
- 0.13 → {0.1, 0.2, 0.3, 0.4, 0.5, 0.7, 0.8, 0.9, 0.10, 0.11, 0.12}. **0.6 is missing from it.**
- 1.1 (Prereqs "0.9, 0.13") → the same set. Every S1 and S2 unit inherits it through 1.1, so **no S1 or S2 unit has 0.6 on its path**. No unit anywhere lists 0.6 as a prereq (checked against every Prereqs cell in the S1 and S2 tables).

## Summary

- **0.6 Pinyin spelling rules is off every S1 and S2 path.** S1 runs "pinyin on" from 1.1a, whose target word is 学生 (*xué* is written u but sounds ü, 0.6a), and 对不起 is a 1.1 unit word (*duì* hides the e of *duei*, 0.6b). Fix: add 0.6 to 1.1's Prereqs.
- **No lesson teaches reading tone marks**, yet 0.7b, 0.11a, 0.11b, 0.12a and all of S1 grade or display tone-marked pinyin, including unmarked neutral syllables. Fix: wording in 0.1a and 0.11a, so the marks become the face of 0.1a's own C0 buttons.
- **The format introduction schedule assumes table order, but the two S0 tracks are independent.** On a segment-first path, C0, C2 and C3 all arrive new in the first three lessons (the exact spike the 0.1 unit check avoided). On a tone-first path, C3 first appears in 0.7b and C6 in 0.8b, and neither is marked to carry an intro.
- **The test-out leaves gaps in skills that S1 leans on.** 0.14c's content list has no question-intonation items (0.12b, which 1.2 builds on). 0.14a stops at the word rung, though 0.4c's skill is family identification *in speech* (S1 1.9b's 二/日/四 tiles rely on it). A thin-pool unit "reports 'not enough items'" with no next step, and 0.11 (thin in 0.11b/c) is on every S1 path.
- **0.10b's rule depends on knowing which words are digits or ordinals** ("stays level as a digit or ordinal"; opener 第一, 十一). Digits are taught nowhere, and the S1 Numbers fix can't become an S0 prereq without creating a cycle (1.4 → 0.10). Fix: give glosses inside 0.10b.
- **Phone-number *yāo* is excluded from S0 and taught nowhere**, yet S1 1.4a uses "phone numbers" as a context, and vocab-S1 notes 零 as "phone numbers". This belongs to the new Numbers unit.
- **Two missing unit edges inside S0:** 0.10a interleaves "3+3 rise (0.9a)", but 0.10 lists only 0.8. 0.11c's 一点儿 labels show 一's sandhi tone (0.10), but 0.11 lists only 0.5 and 0.8.
- **The bare *er* final is never taught in S0** (no *èr*/*ér* anywhere in the plan). S1 1.4c (二 vs 两) and 1.9b (二/日/四 tiles) lean on it. Fix: an additive lesson 0.2d.
- The mechanical report has 128 S0 rows; 5 are real (0.10b ×4, 0.12b ×1). S0 words are sound carriers by design ("S0 emits no word cards; S1 owns the words").

## Findings

| # | Severity | Category | Lessons | Finding (with evidence) | Fix | Confidence |
|---|---|---|---|---|---|---|
| 1 | major | missing-edge | 0.6a–c → 1.1a, all S1 | 0.6 isn't in any S1/S2 unit's prereq closure: 1.1 lists "0.9, 0.13", 0.13 lists "0.4, 0.12", and nothing lists 0.6. S1 relies on it: "Each unit starts with pinyin on" (S1 stage notes). 1.1a's target 学生 (vocab-S1 `学生 lesson 1.1a`) is spelled *xué* (0.6a, "Right after j q x and y, u spells ü"). 对不起 (vocab-S1 `unit 1.1`) has *duì* = *duei* (0.6b). Later examples follow: 去 *qù*, 六 *liù*, 九 *jiǔ*, 贵 *guì*. | doc 03 §1.8, row 1.1: Prereqs "0.9, 0.13" → "0.6, 0.9, 0.13". This creates no cycle: 0.6's own prereqs (0.2, 0.4, 0.5) are already in 1.1's closure. | verified |
| 2 | major | missing-skill | 0.1a → 0.7b, 0.11a, 0.11b, 0.12a; all S1 | No lesson maps tone marks (ā á ǎ à, and no mark for neutral) to the tones. In S0.md, "tone-marked" appears only in the support-stage line ("examples labeled with tone-marked pinyin") and in 0.7b ("C3, tone-marked pinyin labels; one label is wrong on either syllable"). 0.1a's practice is "C0 Pick, tone buttons", and the button face is never specified. 0.11a's wrong label "椅子 labeled *yǐzī*" and 0.11b's "tiles are the full and neutral forms in pinyin" both need the learner to know that an unmarked syllable is neutral, which no lesson states. | Wording in 0.1a. Practice: "C0 Pick, tone buttons, each showing the tone mark and its number (ā 1 · á 2 · ǎ 3 · à 4)". I do figure: "each contour labeled with its mark". Wording in 0.11a's I do: add "A neutral syllable is written with no tone mark (*zhuōzi*)." Not a new unit: the marks are the face of 0.1a's own practice, and a separate unit would have to sit before 0.7 in table order (renumbering). | verified (absence); inferred (that the buttons might not show marks) |
| 3 | major | format | 0.1a, 0.1c, 0.2a–c, 0.4c, 0.7b, 0.8b | The schedule is "First planned appearance in table order", but "The tone track … and the segment track (0.2–0.6) are independent". On a valid segment-first path (0.2 has no prereqs), 0.2a (C0, marked only "new face"), 0.2b (C2) and 0.2c (C3) bring three new formats in lessons 1–3, which the 0.1 unit check rejects ("would put three new formats in lessons 1–3"). On a tone-first path (0.1 → 0.7 → 0.8), C3 is first met in 0.7b and C6 in 0.8b, and neither lesson's Variety marks an intro. | Replace the schedule's "First lesson" column with every lesson that can be a format's first appearance on a valid path: C0 {0.1a, 0.2a, 0.14a, 0.14b}; C2 {0.1c, 0.2b}; C3 {0.2c, 0.7b}; C6 {0.4c, 0.8b, 0.14c}. Mark each "(intro if first on path)", per brainstorm §4.1's first-appearance rule. Add to *Path and outcome*: "Start the tone track first. A segment-first start meets C0, C2 and C3 in its first three lessons." | verified |
| 4 | major | checkpoint | 0.12b, 0.14c → 1.2 | 0.14c's content omits question intonation. Teacher's summary: "Sandhi, 一/不, neutral tone, erhua, running speech and near-homophones". Practice: "C6 Fill the gap for neutral pairs, running speech and 四/十/是". 0.12b (zh:sr:intonation-over-tone) is not named. S1 builds on it: 1.2a "Links back to 0.12 (a 吗 question needn't rise)", and 1.2 lists 0.12. A test-out learner can't get checkpoint evidence on 0.12b, so 0.12 can't pass. | 0.14c Practice: add "C6 Fill the gap for 吗 questions, with the gap at the last full syllable (tagged 0.12b)". Add "question intonation" to its teacher's summary. | verified (omission); inferred (that "running speech" doesn't already mean to include it) |
| 5 | major | checkpoint | 0.4c, 0.14a → 0.13b, 1.9b | 0.14a runs "Syllable → word" and tags items to "0.2–0.6". 0.4c's skill is "three-way family identification in speech (zh:sc:sibilant-3way)", at "Rung: sentence". So a 0.14a pass certifies 0.4c without any item at its rung. Later lessons need the in-speech skill: 1.9b uses "tiles 二 / 日 / 四 (èr, rì, sì)" in weekday lines (curled *r* vs flat *s*), and 0.13b's confusables include "families (0.4c)". | 0.14a Practice: "Syllable → word → sentence; 0.4c items are C0 pinyin buttons on a lit syllable in an AISHELL sentence (northern speakers)". Also confirm that 0.4c's pool includes *r* (the unit title is "+ r", and 1.9b relies on *rì*). | verified |
| 6 | major | checkpoint | 0.6c, 0.11b, 0.11c, 0.14 | "a unit with too few items for an 85% call reports 'not enough items' instead of passing." Nothing says what happens next. Doc 03's test-out map gives units below 85% one outcome (the unit is recommended); this third outcome has none. 0.11b and 0.11c are named thin pools, and 0.11 is in every S1 unit's closure (1.1 → 0.13 → 0.12 → 0.11), so a test-out-first learner may be left with a permanent S0 recommendation. | 0.14 test-out map: "…reports 'not enough items' for that unit and offers its lessons' *I already know this* (Practice as test-out) or self-report (README synthesis, Completion & test-out)." | verified (text); inferred (frontier effect) |
| 7 | major | missing-skill | 0.10b → 1.4a | 0.10b: "Keep out the neutral 一 in reduplicated verbs (看一看) and phone-number *yāo*". 0.14c also excludes "*yāo* cases". No plan or doc 03 row teaches *yāo* (searched S0/S1/S2a/S2b and doc 03). Yet 1.4a's contexts are "phone numbers, prices", and vocab-S1 has `零 … lesson 1.4a … phone numbers`. In mainland phone numbers, 1 is commonly read *yāo*. (The neutral 一 of 看一看 is covered later, in S2 2.7a.) | Put it in the new Numbers unit: its 6–10 + 0 lesson adds "1 is often *yāo* when reading out digit strings (phone, room, bus numbers)" as a Go deeper line plus a few items in a phone-number context. If that unit doesn't take it, remove "phone numbers" from 1.4a's contexts. | verified (absence); the *yāo* usage is "commonly", not always |
| 8 | major | missing-skill | 0.10b | The rule's condition requires number knowledge. Idea: "It stays level as a digit or ordinal, and at the end of a word". Opener: "一个, 一起, 一天, 第一, 十一. 'When does 一 stay level?'". Examples: "X14 predict". Digits, 第 and 月 are taught nowhere before S1 (the review's root bug), and the S1 Numbers fix can't be made an S0 prereq. 1.4 already lists 0.10, and a digits unit needs 0.13 (四/十), which closes over 0.10. So 0.10 → Numbers → 0.13 → 0.12 → 0.10 would be a cycle. Practice itself ("level / rises / falls") works by ear. | Wording in 0.10b. Examples: "every example carries its gloss (一 'one', 第一 'first', 十一 'eleven', 一月 'January')". X14 items name the case ("a digit", "an ordinal"). Record in doc 03 that no S0 unit may list the new Numbers unit. | verified |
| 9 | major | missing-edge | 0.10a | 0.10a Variety: "interleaved … 3+3 rise (0.9a)". The 0.10 unit check: "Confusables: pass (3+3 rise in 0.10a…)". 0.10's Prereqs are "0.8" only, and doc 03 draws the track as "0.8 → 0.9, 0.10, 0.11" (siblings). On the valid path 0.8 → 0.10 → 0.9, 0.10a's practice interleaves 3+3 items before 3rd-tone sandhi is taught. | doc 03 §1.8, row 0.10: Prereqs "0.8" → "0.8, 0.9". No cycle, and table order already has 0.9 first. | verified |
| 10 | minor | missing-edge | 0.11c | Examples: "X8 哪/哪儿, 这/这儿, 一点/一点儿". Stage concern 5 says "一/不 shown with surface tones", so 一点儿 is labeled *yìdiǎnr*, which is 0.10b's sandhi. 0.11's Prereqs are "0.5, 0.8", without 0.10. The practice (-r vs no -r) doesn't depend on it; only the label does. | doc 03 §1.8, row 0.11: Prereqs "0.5, 0.8" → "0.5, 0.8, 0.10". No cycle. | verified |
| 11 | minor | order | stage summary | "The tone track (0.1, 0.7–0.10, 0.11a–b) and the segment track (0.2–0.6) are independent until 0.11c". Units are the graph's nodes, and 0.11 lists 0.5, so 0.11a–b can't run before 0.5. | Reword: "…are independent until unit 0.11 (its 0.5 prereq is for erhua in 0.11c); they merge in 0.12…". | verified |
| 12 | minor | missing-skill | 0.2 → 1.4c, 1.9b | The bare *er* final is never taught: no *èr*/*ér*/二 appears in S0.md outside erhua. Yet S0's outcome claims the learner can "map what they hear to pinyin". 1.9b calls 二/日/四 "the sound-alike days", and 1.4c needs "liǎng vs èr". (S0 also narrows 0.2c to confusable pairs and drops *h*, so the outcome line overstates full-inventory decoding. This matters little for this learner.) | Additive lesson in unit 0.2 (no reorder): **0.2d · *er* is one r-colored vowel** (`les:er-final`, skill `zh:sc:er-final`). Sound shape, Discover opener (二, 儿, 耳 vs 日, 饿). C0 pinyin buttons (*èr / rì / è*), syllable → word. Tag its items in 0.14a. Alternative if no lesson is wanted: reword the S0 outcome to "S0's contrasts" and leave *er* to 1.9b. | verified (absence); inferred (how confusable it is) |
| 13 | minor | missing-skill | 0.9a, 0.10a → S1 pinyin | Stage concern 5: "一/不 shown with surface tones…, 3rd-tone sandhi in citation tones. The app should state this once." No lesson owns that statement, so a test-out learner never sees it, then meets 你好 labeled *nǐ hǎo* (heard *ní*) and 不是 labeled *bú shì* in S1 with pinyin on. | Wording. 0.9a's I do adds "Labels keep the dictionary tone: 你好 is written *nǐ hǎo*." 0.10a's I do adds "Labels show the spoken tone of 不: *bú shì*." The same line goes on the first pinyin-label hint on any path. | verified |
| 14 | minor | missing-skill | 0.12b | The lesson assumes the learner knows that 吗 marks a yes/no question (taught in 1.2a). Opener: "an AISHELL 吗 question that ends falling. 'Is this a question?'". Idea: "*A 吗 question needn't rise at the end…*". | Idea: "*吗 at the end makes a yes/no question. It needn't rise, and a final 4th still falls.*" | verified |
| 15 | minor | checkpoint | 0.14 | Doc 03 gives 0.14's Prereqs as "0.1–0.13 (all; not gated)", which the pre-pass parsed as "0.1 0.13" (lessons.tsv row 31–33). Under that reading the closure lacks 0.6, though 0.14a tests 0.6. | Write the cell as an explicit list (0.1, 0.2, …, 0.13), or have the curriculum parser expand ranges and add a check for it. | verified |
| 16 | minor | skill-sanity | 0.13a | "The pinyin on each tile keeps the item answerable from the tone alone." So the C0 meaning-tile item is tone identification at the word rung with glosses attached, a near-duplicate of zh:sc:tone-1234 (0.1a) and the 0.1b/c contrasts. The distinct skill (tone → meaning without pinyin) needs known words, which S0 can't have. | Keep the lesson, as the meaning-tile face S1 reuses. Give it no separate card: its practice evidence goes to zh:sc:tone-1234, the way checkpoint items go to tagged skills. Or accept the duplicate and say so in Notes. | inferred |
| 17 | minor | skill-sanity | 0.13b | Skill "四 / 十 / 是 (zh:sc:si-shi-shi)" names three words and combines two existing cues: family (0.4a/0.4c) and tone (0.1). It's vocabulary-like and thin, but doc 03 asks for it, and S1 1.4a/1.9a interleave it ("四/十 (0.13)"). | Keep. Rename the id to the cue, e.g. `zh:sc:s-sh-tone-homophones`, with 四/十/是 as its anchor set, so the card's pool can draw on other s/sh + tone near-homophones. | inferred |
| 18 | minor | skill-sanity | 0.6a, 0.6b | The architecture defines "'sc' sound contrast, 'sr' sound rule". Other rules use `sr` (half-third, sandhi, 一/不, erhua), but the spelling rules use `sc`: zh:sc:u-spelled-u-umlaut, zh:sc:hidden-vowels. Spelling conventions are neither a sound contrast nor a sound rule. | Decide once and record it with the `v`/`l` registration (lesson-plans README conventions): either `sc` covers sound-to-spelling maps, or 0.6a/b become `sr`. | inferred; low stakes |

## Proposed prereq edges

| Unit | Current Prereqs | Proposed | Reason |
|---|---|---|---|
| 1.1 | 0.9, 0.13 | **0.6**, 0.9, 0.13 | Finding 1: S1 shows pinyin from 1.1a (学生 *xué*, 对不起 *duì*), and 0.6 is on no S1/S2 path. Every later unit inherits it through 1.1. |
| 0.10 | 0.8 | 0.8, **0.9** | Finding 9: 0.10a interleaves the 3+3 rise. |
| 0.11 | 0.5, 0.8 | 0.5, 0.8, **0.10** | Finding 10: 0.11c labels 一点儿 with 一's sandhi tone. |
| 0.14 | 0.1–0.13 (range) | 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.10, 0.11, 0.12, 0.13 | Finding 15: the range is parsed as two ids, which drops 0.6. |
| new Numbers unit (S1; id set by the S1 review) | — | **0.6, 0.13** | 六 *liù* and 九 *jiǔ* need 0.6b. 四/十 need 0.13, which brings in 0.10 (一 stays *yī* in counting) and 0.4. Constraint: no S0 unit may list it (finding 8, cycle via 1.4 → 0.10). |

I checked every row for cycles: 0.6 → {0.2, 0.4, 0.5}, 0.9 → 0.8 and 0.10 → 0.8 add no back edges. With 0.10 → 0.9 and 0.11 → 0.10, the tone track becomes linear (0.8 → 0.9 → 0.10 → 0.11). That matches table order, so it costs only scheduling freedom that no plan uses.

### New units and lessons

- **No new S0 unit is needed.** S0's missing skills are tone marks (finding 2), the label convention (13) and digit glosses (8). Each is the face or example set of an existing lesson, so wording fits better. A separate tone-marks unit would have to precede 0.7 in table order, which would mean renumbering.
- **One additive lesson:** 0.2d · *er* is one r-colored vowel (`les:er-final`, `zh:sc:er-final`), in unit 0.2 (no prereqs; doesn't reorder). Its items are tagged in 0.14a (finding 12).
- **For the S1 Numbers unit** (the coordinator's 1–5 / 6–10 + 0 example): S0 prereqs are 0.6 and 0.13. Its 6–10 + 0 lesson should carry phone-number *yāo* (finding 7). Point 1.4a's "already knows 1–10" at it, never at an S0 unit.

### S0 skills that later stages lean on, and whether test-out certifies them

| S0 skill | Leaned on by (evidence) | On the user's path? | Certified by 0.14? |
|---|---|---|---|
| Pinyin spelling rules (0.6) | All S1 "pinyin on"; 1.1a 学生 | **No** (finding 1) | Yes, 0.14a |
| Tone marks, neutral unmarked | 0.7b, 0.11a/b, 0.12a; all S1 labels | Not taught (finding 2) | Only implicitly, if C0 buttons show marks |
| 3rd-tone sandhi (0.9) | 1.1 你好; 1.8a note "哪里 usually sounds *nálǐ*" | Yes | Yes, 0.14c |
| 不 sandhi (0.10a) | 1.3b "Reminder: bú before a 4th tone (0.10)" | Yes | Yes, 0.14c |
| 一 sandhi (0.10b) | 1.4b 一个, 1.9b 星期一 | Yes | Yes, 0.14c |
| Neutral tone (0.11a/b) | 1.6 family words; 1.16a "a light neutral 不" | Yes | Yes, 0.14c; 0.11b is thin (finding 6) |
| Erhua (0.11c) | 1.8a C6 tiles 哪儿/那儿/这儿; 1.3c 有点儿 | Yes | Thin pool, so maybe "not enough items" (finding 6) |
| Question intonation (0.12b) | 1.2a "Links back to 0.12" | Yes | **No** (finding 4) |
| Tone reduction (0.12a) | 2.31 real-speed speech | Yes | Yes, 0.14c |
| Sibilant families in speech (0.4c) | 1.9b 二/日/四 tiles; 0.13b | Yes | Only at syllable/word rung (finding 5) |
| 四/十/是 (0.13b) | 1.4a, 1.9a "四/十 (0.13)" | Yes | Yes, 0.14c |
| *er* final | 1.4c, 1.9b | Not taught (finding 12) | No |
| Phone-number *yāo* | 1.4a "phone numbers" | Not taught (finding 7) | Excluded |

### Ordering and load (no findings)

- Within-unit order builds well in every unit: shapes → contrasts (0.1), solo → glide (0.5), curled/flat → j q x → three-way (0.4), pitch rule → minimal pairs → erhua (0.11), 不 → 一 with 不 mixed in (0.10).
- Minutes per unit are 6–21, with no spikes. The ≤8 min check holds for all 33 lessons, `main` spans included.
- No vocab file places any word for S0 (no `prep:0.x`, no `0.x` places). S0 introduces no words, and checkpoints add none. Prep tiers and closed-set scattering therefore don't apply to S0 itself. The only closed-set problem is the digits S0 assumes in 0.10b (finding 8).

## Triage of the mechanical report

S0 has 128 rows: 87 `later-or-off-path`, 14 `queue`, 27 `off-list`. That includes 5 rows from 0.14c.

- **Real: 5.**
  - 0.10b 一, 第一, 月, 十: the rule's "digit or ordinal" condition needs the learner to know these are numbers, ordinals and months (finding 8).
  - 0.12b 吗: the lesson assumes 吗 marks a question (finding 14).
- **Noise: 123.**
  - Sound carriers. "S0 emits no word cards; S1 owns the words", and items are answerable by ear, often with pinyin on the tiles. Examples: 汤/烫, 绿/路, 来/雷, 猪/租, 西/师, 饭/放, 先, 去/鱼/句/学, 六, 老师, 大学/大雪, 你好/很好/可以/我也, 椅子/桌子/朋友/爸爸, 哪儿/这儿, 四/十/是 (0.4c, 0.13b).
  - Meaning supplied in the lesson. 0.11b's idea glosses 东西 and 0.13a's tiles carry glosses (东西, 买/卖, 汤/糖).
  - Exclusion lists. 0.10a's 是不是, 看不见, 对不起, 差不多; 0.10b's 一百, 一千, 看; 0.8a's and 0.11a's 椅子, 小姐, 想.
  - Segmentation splits. 皮袄, 饥饿, 展览馆, 小老虎, 档案, 大意 were split into single characters, which then showed up as off-list.
  - Checkpoint rows. 0.14c (一, 不, 四, 十, 是) tests sound, not words.
- **Out of scope here, but worth noting:** off-list carriers still need audio in the `audio-cmn` word set or AISHELL. Examples: 皮袄, 饥饿, 展览馆, 琴声, 失误. That is an authoring and sourcing check, not a learner dependency.
