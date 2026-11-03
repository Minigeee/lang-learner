# S1 dependency review

Scope: `docs/design/lesson-plans/S1.md` (units 1.1–1.18), against doc 03 §1.8 (unit Prereqs), the S0 stage summary and lesson table, the vocab TSVs, and `deps-report/`. The coordinator's mid-task guidance overrides the brief where they differ: units are the graph's only nodes (no lesson- or skill-level edges are proposed), a missing skill gets a new unit, and existing units aren't restructured or reordered.

Prereq closures used here are computed from doc 03 §1.8 (transitive). The ones that matter:
- 1.3: {1.1} + S0. It doesn't include 1.2.
- 1.4: {1.1, 1.2}. It doesn't include 1.3.
- 1.6: {1.1, 1.3}. It doesn't include 1.2, 1.4 or 1.5.
- 1.7: {1.1, 1.2, 1.3}.
- 1.9: {1.1, 1.2, 1.4}.
- 1.10: {1.1–1.6, 1.8, 1.9}. It doesn't include 1.7.
- 1.12 and 1.13: {1.1–1.6, 1.8–1.11}. Neither includes 1.7.
- 1.14: {1.1–1.6, 1.8–1.10}. It doesn't include 1.7, 1.11 or 1.12.
- 1.16: {1.1–1.6, 1.8–1.11, 1.15}. It doesn't include 1.14.
- 1.17: {1.1–1.6, 1.8–1.11, 1.15}. It doesn't include 1.7 or 1.13.
- Every S1 unit's S0 closure (through 1.1 ← 0.9, 0.13) is 0.1–0.5 and 0.7–0.13. It never includes 0.6.

## Summary

- **Blocker: digits 0–10 are never taught.** 1.4a says "The learner already knows 1–10". S0 emits no word cards ("S1 owns the words"), and no S1 lesson teaches the digits. Fix: a new two-lesson unit, **Counting 0–10** (1–5, then 6–10 plus 0), slotted before 1.4 and listed as a prereq of 1.4.
- **The digits are scattered and misuse the prep tier.** 一三四五 are `prep:1.2`, 六七八九 are `prep:1.3`, and 二/十/零 are 1.4a lesson words. Prep is being used for 1.4's own content, and 1.3 isn't even on 1.4's prereq path. The fix moves all eleven into the new unit's two lessons.
- **Unit 1.7 is a hidden prereq of 1.10, 1.12, 1.14 and 1.17.** Three prep words fed during 1.7 are due by 1.10. 说 (1.7a) is needed by 1.12a and 1.14c, and 做 (1.7b) by 1.17c. Fix: add 1.7 to 1.10's Prereqs.
- **Unit 1.5 is a hidden prereq of 1.7.** The 1.7a and 1.7b openers use 这个 + noun (这个怎么说?, 这个菜怎么做?), which is 1.5a's skill. Fix: add 1.5 to 1.7's Prereqs.
- **去 is placed too late.** It's a 1.10b word, but 1.3b's examples (不去) and 1.7a's opener (怎么去?) use it. An edge can't fix 1.7, because 1.10 will depend on 1.7, so 去 moves to 1.3b.
- **Three more existing units are missing edges:**
  - 1.3 ← 1.2: 她 and 好 are in 1.3a's opener.
  - 1.14 ← 1.12: 会 and 要 are in 1.14c and 1.14d.
  - 1.17 ← 1.13: 1.17a interleaves 太…了, and the 了 word card sits in 1.13b.
- **1.4c and 1.5c lean on units that depend on them, so no edge can fix them.**
  - 1.4c uses 两本书 (本 is 1.5c) and 二号 (号 is 1.9a).
  - 1.5c's 一只猫 needs 猫, which is placed in 1.8a.
  - 杯, one of 1.5c's own target measure words, has no row in any vocab file.
  - These need wording changes and vocab moves.
- **Format first appearances are fixed to table order.** On valid paths C7 first shows up in 1.3b, C2 in 1.4c, C3 in 1.6b or 1.9a, and C6 in 1.9b, all before their scheduled introductions. The one-line intro must be computed per path (brainstorm §4.1 already says "the first time a format appears on the path"). The plan should say this.
- **Smaller issues:**
  - Off-list or later words in examples: 北京, 厨房, 日文, 碗, 喜欢, 今天.
  - 0.6 (pinyin spelling) is on no S1 path, even though every S1 unit shows pinyin.
  - Some practice formats don't test their skill: 1.13a, 1.9b, 1.12b.
  - 1.18c tests two pairs no lesson drills: 几/多少 and 哪/哪儿.

## Findings

| # | Severity | Category | Lessons | Finding (with evidence) | Fix | Confidence |
|---|---|---|---|---|---|---|
| 1 | blocker | missing-skill | 1.4a (and 1.4b–d, 1.9a–c, 1.13a, 1.18b downstream) | **Counting 0–10 is assumed and never taught.** 1.4a: "The learner already knows 1–10, so this is about hearing the order fast." Its C0 digit faces (14 / 40 / 44 / 4) and the opener 十一, 十二, 二十… need every digit. S0 doesn't supply them. S0's stage summary says "S0 emits no word cards; S1 owns the words", and 0.13 says "Words are taught in S1; here they're heard." Doc 03's 1.4 row lists only "Structure of numbers (十一 … 九十九)", and no S1 lesson owns 0–10. 1.4a's contexts also say "phone numbers, prices". Phone numbers are digit strings, which is a 0–10 skill, not 11–99. Prices need 块 (1.13a), which isn't on 1.4's path. | Add the new unit **Counting 0–10** (spec under Proposed new unit) and list it in 1.4's Prereqs. Reword 1.4a's teacher's summary: "The learner already knows 1–10" → "Builds on the digits from Counting 0–10, so this is about hearing the order fast." Change 1.4a's contexts from "phone numbers, prices" to "ages, class and room counts", since digit strings move to the new unit's lesson b. Add a Decomposition-notes row to S1.md ("Added unit Counting 0–10: no unit owned the digits; 1.4a assumed them") and a matching row to doc 03 §1.8. | verified |
| 2 | major | closed-set, tier-misuse | 1.2, 1.3, 1.4a | **The digits are scattered across three places, and prep is used for a unit's own content.** vocab-S1.tsv has 一/三/四/五 as `prep  prep:1.2  1.4 1.9 1.13` ("fed during 1.2, due by 1.4"), 六/七/八/九 as `prep:1.3`, and 二/十/零 as `lesson 1.4a`. Prep is for "words a later unit needs that fit neither tier" (README, Vocabulary placement), but these are the numbers unit's own content. `prep:1.3` isn't even on 1.4's path: 1.4's Prereqs are 1.2, 0.10 and 0.13, so a learner going 1.1 → 1.2 → 1.4 meets 六–九 only by chance. The prep tier also never teaches the set as a set. It's eleven loose word cards. | Move the rows into the new unit's two lessons. Lesson a (1–5): 一, 三, 四, 五 (from `prep:1.2`) and 二 (from lesson 1.4a), five words. Lesson b (6–10 and 0): 六, 七, 八, 九 (from `prep:1.3`) and 十, 零 (from lesson 1.4a). That's six words, one over the ~5 cap, kept on purpose because the closed set ends at 十 and 零 belongs with the digit strings. Set each row's `needed_by` to `1.4 1.9 1.13`. 1.4a then has no lesson-tier words, which is fine for a structure lesson. | verified |
| 3 | major | missing-edge | 1.10a, 1.12a, 1.14c, 1.17c, 1.13b | **1.7 is relied on but isn't on the path of 1.10 or any unit built on it.** (a) vocab-S1.tsv has 午饭/早饭/晚饭 as `prep  prep:1.7  1.10` ("fed during 1.7, due by 1.10"), but 1.10's Prereqs are 1.8 and 1.9, so the feed is off-path. (b) 说 is `lesson 1.7a`, yet 1.12a needs it ("会说中文"), and so does 1.14c ("我会说中文，还会说日文"). (c) 做 is `lesson 1.7b`, yet 1.17c's examples need it ("你在做什么呢?"). (d) 好吃 (1.7b) appears in 1.13b's summary ("太好吃了"). 1.7 isn't on the path of 1.12, 1.13, 1.14 or 1.17. | Doc 03 §1.8, 1.10's Prereqs: `1.8, 1.9` → `1.7, 1.8, 1.9`. That puts 1.7 on the path of 1.11–1.17 transitively. There's no cycle (1.7 ← 1.3, 1.5), and table order already has 1.7 first. | verified |
| 4 | major | vocab | 1.3b, 1.7a, 1.15b | **去 is placed in a later unit than its first uses.** vocab-S1.tsv: `去  lesson  1.10b`. 1.3b's examples list "不是, 不高, 不忙, 不去". 1.7a's opener is "这个怎么说? 怎么去? 怎么写?", and its contexts include "travel". 1.10 comes later and isn't on either unit's path. An edge from 1.7 to 1.10 would create a cycle with finding 3, so this needs a vocab move. | Move 去 from `lesson 1.10b` to `lesson 1.3b` (1.3b goes from 4 words to 5). 1.10b keeps its 去 + place grammar, and 1.3 is on 1.10's path. Update needed_by to `1.3 1.7 1.10 1.11 1.15 1.16`. | verified |
| 5 | major | missing-edge | 1.7a, 1.7b | **1.7 uses 这 + measure word + noun, which is 1.5a's skill.** 1.7a's opener has "这个怎么说?", and 1.7b's Showdown is "这个菜怎么做? / 这个菜怎么样?". 这个 is `lesson 1.5a`. 1.7's Prereqs (1.2, 1.3) don't include 1.4 or 1.5. 这 alone (1.2b) can't carry 这个菜. | Doc 03, 1.7's Prereqs: `1.2, 1.3` → `1.3, 1.5`. 1.5 implies 1.4 and 1.2. There's no cycle, and table order is unchanged. | verified |
| 6 | major | missing-edge | 1.14c, 1.14d | **1.14 leans on 1.11 and 1.12, which aren't on its path.** 1.14c's Variety lists "会 (1.12a)" as an interleaved confusable, and its example is "我会说中文，还会说日文". 1.14d's practice is "hear '我要苹果和茶'", and its opener has "茶和咖啡". 要 and 咖啡 are both `lesson 1.11b`. 1.14's only Prereq is 1.10. | Doc 03, 1.14's Prereqs: `1.10` → `1.10, 1.12` (1.12 implies 1.11). Table order is unchanged. | verified |
| 7 | major | missing-edge, tier-misuse | 1.17a–c | **1.17 relies on 1.13.** 1.17a's Variety interleaves "太…了 (1.13b)", and its practice says "太…了 lines stay out too", so the lesson assumes the learner already knows 太…了. The 了 word card is `lesson 1.13b` ("first met in 太…了; targets in 1.17a/b"), but 1.17's Prereqs are 1.10 and 1.15, which don't include 1.13. On the path 1.15 → 1.17, the target word of 1.17a and 1.17b has no placement at or before it. | Doc 03, 1.17's Prereqs: `1.10, 1.15` → `1.10, 1.13, 1.15`. With the edge, `了  lesson 1.13b` is always met first, and no vocab move is needed. | verified |
| 8 | major | missing-edge | 1.3a, 1.3b, 1.6a | **1.3 uses 1.2's words and format.** 1.3a's opener is "她很高, 我很好, 天很冷". 她 is `lesson 1.2a`, and 好 is `lesson 1.2c` ("我很好 in 1.2c exchanges"). 1.3b's C7 practice is the format introduced in 1.2c. 1.3's Prereqs are 1.1 and 0.10, so 1.2 isn't on its path. Downstream, 1.6 (Prereqs 1.1, 1.3) uses 朋友 (`lesson 1.2b`) in 1.6a's opener and faces ("他的朋友", "*the teacher's friend*"), so it lacks 1.2 too. | Doc 03, 1.3's Prereqs: `1.1, 0.10` → `1.2, 0.10` (1.2 implies 1.1). This fixes 1.3a and, transitively, 1.6a's 朋友. Table order is unchanged. | verified |
| 9 | major | vocab, order | 1.4c | **1.4c uses words from units that depend on 1.4, so an edge would create a cycle.** Its Examples are "两个人, 两本书, 十二, 二十二", but 本 is `lesson 1.5c` (and 1.5 ← 1.4). Its C2 items include "二号", but 号 is `lesson 1.9a` (and 1.9 ← 1.4). 书 is placed in `lesson 1.4c` only for 两本书. | Reword 1.4c to stay inside 个. Examples: "两个人, 两个苹果, 十二, 二十二". C2 odd item: "十二个, 二十个, 第二" (drop 二号). Keep 二号 as a Go deeper that points to 1.9a. Move 书 from `lesson 1.4c` to `prep  prep:1.4  needed_by 1.5` (1.5c's 三本书). For 1.6a see finding 12. | verified |
| 10 | major | vocab, tier-misuse | 1.5c, 1.11b | **1.5c's own target word is unplaced, and its partner noun comes later.** 1.5c's skill is "本, 杯, 口, 件, 只 with their nouns", but 杯 has no row in vocab-S1, vocab-S2, vocab-extra or vocab-post-S2. The 茶 row's note admits it: "一杯茶 needs 杯, which is not an HSK L1–3 word". 1.11b's opener also uses "我要一杯咖啡". 1.5c's opener has "一只猫", but 猫 is `lesson 1.8a` (and 1.8 ← 1.5). | Add `杯  S1  lesson  1.5c  1.5 1.11 1.13` to vocab-extra.tsv (hsk2025_level blank; note "measure word, 1.5c target"). Move 茶 from `lesson 1.5c` to `prep  prep:1.4  needed_by 1.5 1.11 1.13 1.14`, which keeps 1.5c at five words (本 杯 口 件 只). Move 猫 from `lesson 1.8a` to `prep  prep:1.4  needed_by 1.5 1.8 1.14`. | verified |
| 11 | minor | missing-edge | all S1 (pinyin display) | **0.6 Pinyin spelling rules is on no S1 prereq path, yet every S1 unit "starts with pinyin on".** 1.1 ← 0.9, 0.13 reaches 0.1–0.5 and 0.7–0.13, but never 0.6. 0.6 owns the spellings S1's pinyin relies on: qù (去), liù/jiǔ (六/九, iu = iou), duì (对, ui = uei). The practical risk for this learner is low, since they know pinyin and 0.14a certifies 0.6 on the test-out path, but the graph is wrong. | Doc 03, 1.1's Prereqs: `0.9, 0.13` → `0.6, 0.9, 0.13`. The new Counting 0–10 unit lists 0.6 too. | verified |
| 12 | minor | vocab | 1.6a | 1.6a's opener uses "我的书". 书 is placed in 1.4c (and in prep:1.4 after finding 9), neither of which is on 1.6's path (1.1, 1.3). | Change the opener line "我的书" → "我的名字" (名字 is `lesson 1.1b`). Keep 1.6 parallel to 1.4 and 1.5. If authoring wants 几口人 or counted siblings in 1.6c's family talk, add 1.5 to 1.6's Prereqs instead (inferred need, not stated in the plan). | verified (书); inferred (几口人) |
| 13 | minor | vocab | 1.9b | 1.9b's opener is the Little Fox song "今天星期几?", but 今天 is `lesson 1.10c`, a later unit. Weekday lines naturally take the 今天星期几 frame (inferred for the Examples). | Move 今天 from `lesson 1.10c` to `lesson 1.9b` (1.9b goes from 3 words to 4, and 1.10c from 5 to 4). 1.9 is on the path of 1.10 and 1.12. | verified (opener); inferred (examples) |
| 14 | minor | vocab | 1.10d | 1.10d's practice is "hear '他在厨房做饭', tap the room in a house scene". 厨房 is in no vocab file, and neither are any other room words (客厅, 卧室). The C4 scene needs named rooms the learner has met. | Reword the practice around places that are already placed: "hear 他在公司工作 / 他在家做饭 / 他在学校…, tap the place in a town scene". 公司 is 1.10d, 家 is 1.6c, 学校 is 1.6a and 商店 is 1.10b. Alternatively add 厨房 to vocab-extra as `lesson 1.10d`. | verified |
| 15 | minor | vocab | 1.10b, 1.10c, 1.11a | 北京 appears in 1.10b's opener ("去北京"), 1.10c's I do ("我明天去北京") and 1.11a's opener ("我想去北京"). No vocab file has a 北京 row (the mechanical report splits it into 北 `queue:S2` and 京 off-list). | Add `北京  S1  lesson  1.10b  1.10 1.11` to vocab-extra.tsv (proper noun, very frequent; 1.10b has room once 去 leaves, per finding 4). Or swap each line to 中国 (`lesson 1.10b`). | verified |
| 16 | minor | vocab | 1.12b, 1.12d | 1.12b's opener is "他能吃三碗饭", but 碗 is `lesson 2.1a` (S2). 1.12d's summary has "这儿不能停车", but 停 is `queue:post-S2` and 停车 has no row. | 1.12b: change it to "他能吃很多" or "我今天不能去". 1.12d: keep 停车 out of the examples and use "这儿不能坐" (坐 is 1.12c). | verified |
| 17 | minor | vocab | 1.14c | 1.14c's example "…还会说日文": 日文 has no row (neither does 英文). | Change it to "我会说中文，还会做饭" (做饭 is 1.10d, on the path) or "我有哥哥，还有姐姐". | verified |
| 18 | minor | vocab | 1.16a | 1.16a's notes say "the examples show both" 有没有 and "the clipped form (喜不喜欢)". 喜欢 is `lesson 1.14a`, which isn't on 1.16's path (1.15 ← 1.3, 1.6, 1.11). | Replace 喜不喜欢 with 认不认识 or 高不高兴 (both 1.1c words). Or add 1.14 to 1.16's Prereqs. | verified |
| 19 | minor | format | 1.3b, 1.4c, 1.6b, 1.9a, 1.9b | **The format introduction schedule is fixed to table order, but valid paths reach formats earlier.** C7 is introduced in 1.2c but is used in 1.3b, whose path lacks 1.2 until finding 8 is applied. C2 is introduced in 1.3c but used in 1.4c, and 1.3 isn't on 1.4's path. C3 is introduced in 1.5b but used in 1.6b (path 1.1, 1.3) and 1.9a (path 1.1, 1.2, 1.4). C6 is introduced in 1.8a but used in 1.9b. Brainstorm §4.1 already says the intro appears "the first time a format appears on the path". The plan's "(new; one-line intro)" tags and the schedule table read as fixed lessons. | Add one line under S1's Format introduction schedule: "The schedule is the default path. The runtime shows a format's one-line intro on its first appearance on the learner's actual path, as brainstorm §4.1 and the §4.5 matrix check require (cf. S0 concern 3)." No lesson change is needed. | verified |
| 20 | minor | skill-sanity | 1.13a | 1.13a's skill is "多少钱?, 块, prices", but its C6 practice uses "sound-alike number tiles (四/十, 一/七). Cue: the number's sound." That tests digit discrimination, which belongs to Counting 0–10 and 0.13, not price structure ("a digit after 块 is tenths"). | Change the practice to C0 Pick with price faces that differ in structure: ¥3.50 / ¥5.30 / ¥35 / ¥3.05 for 三块五. The cue becomes 块 + tenths. | verified |
| 21 | minor | checkpoint | 1.18c, 1.13a, 1.8a | 1.18c drills "几/多少" and "哪/哪儿", but no lesson's practice tests either pair. 1.13a folds 多少 vs 几 into "one line, not a lesson", and its practice is number tiles. 1.8a's C6 tiles are 哪儿 / 那儿 / 这儿, so 哪 vs 哪儿 is listed as a confusable but never drilled. Evidence from those items would land on skills that never practiced them. | Either drop 几/多少 and 哪/哪儿 from 1.18c's pair list, or add a 几 vs 多少 face to 1.13a's practice and a 哪个 tile to 1.8a's C6 items. | verified |
| 22 | minor | skill-sanity | 1.9b | 1.9b's skill is "星期一 … 星期天 (zh:v:weekdays)", but its C6 tiles are "二 / 日 / 四". Those three tiles can only ever drill Tuesday, Sunday and Thursday, so the skill card can't review the whole set. | Let authoring rotate sound-alike tile sets drawn only from real day names (for example 二/日/四 and 一/七-free sets such as 三/四/六), so every day appears across the pool. Or switch the practice to C0 Pick with a week-strip face (tap the day), which covers all seven. | verified |
| 23 | minor | skill-sanity | 1.12b | 1.12b's skill is "能 says able or possible", but its C2 practice is "three voices use 能, one uses 会. Cue: néng vs huì". That's word identification, not the meaning the skill names. The meaning contrast is left to 1.12d. | Change the practice to C0 Pick with faces *able, given the situation* / *knows how* / *wants to*, interleaving 1.12a and 1.11. Or rename the skill to what C2 tests. | verified |
| 24 | minor | skill-sanity | 1.4b, 1.10a | Some skills bundle two things, and the practice tests one. 1.4b is "number + 个 + noun, 几个?", but C4 only taps counts and never tests 几个? (1.4d's C7 covers questions). 1.10a is "daily verbs in a routine story, subject + verb + object", but C5 tests event order, and SVO order isn't tested. | Rename 1.4b's skill to "number + 个 + noun". Treat 几个? as part of the examples, or add a C4 item that answers 几个?. Rename 1.10a's skill to "daily verbs in a routine (zh:v:daily-verbs)" and drop "subject + verb + object" from the skill text. | verified |
| 25 | minor | skill-sanity | 1.5a, 1.12c | Some ids don't read cleanly. `zh:g:zhe-na-na-mw` repeats "na" for 那 and 哪. Slug `les:keyi-permission` doesn't match skill `zh:g:keyi-allowed`. | Rename to `zh:g:zhe-na-nei-mw` or `zh:g:demonstrative-mw`, and align the slug and skill id (`zh:g:keyi-permission`). | verified |
| 26 | minor | schedule | 1.10 | 1.10 is S1's heaviest unit. It has 25 placed HSK words (18 lesson-tier and 7 unit-tier), plus 3 prep words due, across 4 lessons of about 28 min (7 + 6 + 6 + 9). Next come 1.6 (20 placed plus 3 extra) and 1.1 (18). Placements are preliminary, but the unit tier adds 7 words with no lesson to meet them. | Move unit-tier 回 and 看 to the S1 queue, or attach them to 1.10a's routine story as lesson words if they're in the story. Recount when authoring. | verified (counts) |

## Proposed new unit

**Counting 0–10.** Proposed display id **1.4**: inserted in table order between 1.3 and the current 1.4. Doc 03 renumbers by table order, so current 1.4–1.18 become 1.5–1.19 and the stable `les:` slugs are unchanged. If renumbering is unwanted, use a working id like `1.3x` until authoring. Findings above use current numbers.

- **Theme:** the digits as one ordered closed set, heard fast, and digit strings (phone and room numbers, years read digit by digit).
- **Prereqs:** `0.6, 0.10, 0.13`.
  - 0.6: the pinyin liù and jiǔ (iu = iou).
  - 0.10: 一 stays yī as a digit.
  - 0.13: 四/十/是.
  - No S1 prereq is needed. The unit may run before 1.1 on some path, which is fine. Its first lesson then carries the C0 intro.
- **Listed as a prereq by:** 1.4 (`1.2, 0.10, 0.13` → `1.2, 1.4-new, 0.10, 0.13`), and by 1.18 (all S1 units). 1.5, 1.8, 1.9, 1.13 and everything later get it transitively through 1.4.
- **Lessons:**

| Id | Slug | Title | Skill | Shape · opener · practice | Words (lesson tier) |
|---|---|---|---|---|---|
| a | `les:digits-one-to-five` | 一 to 五 | digits 1–5 (zh:v:digits-1-5) | Pattern · Discover (count-up lines, *what comes next?*) · C0 Pick, digit keypad face | 一, 二, 三, 四, 五 (5) |
| b | `les:digits-six-to-ten-zero` | 六 to 十, and 零 | digits 6–10 and 0, in digit strings (zh:v:digits-6-10-0) | Pattern · Showdown (一 vs 七, 四 vs 十) · C0 Pick, digit-string face (a 3–4 digit phone or room number, pick the string), interleaving a's digits | 六, 七, 八, 九, 十, 零 (6, one over the cap: keeps the closed set whole) |

- **Notes:**
  - Both lessons use C0 and differ in opener, which the neighbor check allows. Like 1.1, 1.2, 1.7, 1.11 and 1.16, the unit fails "≥3 formats" honestly.
  - Go deeper in b: 幺 *yāo* for 1 in phone and room numbers (0.10b keeps *yāo* out of its pool). Don't put *yāo* in the practice pool, since no word row exists for it.
  - 两 waits for 1.4c.
  - Audio: audio-cmn or the word set for single digits, and AISHELL digit strings, which are plentiful.
  - Minutes: about 6 each, which adds about 12 min to S1.
- **Doc 03 §1.8 row:** "Counting 0–10 | Digits 1–5 as a set; 6–10 and 零, heard in digit strings (phone and room numbers, years) | 0.6, 0.10, 0.13 | AC number words; AISHELL (digit strings); YT `to find` (a counting song or story whose title says it counts)". Update the stage header from ≈56 to ≈59 lessons.

The same check found no other missing skill that needs a unit. The other closed sets are each taught in one place, on a valid path:
- Weekdays: 1.9b, built on the digits through 1.4.
- Months: 1.9a ("numbers + 月").
- Clock time: 1.9c.
- Family: 1.6a–c, in lesson order within one unit.
- Measure words: 个 in 1.4b, the rest in 1.5c.

Pronouns are split across lessons (我/他 in 1.1a, 你 in 1.1b, 她 in 1.2a, 我们 in 1.6a, 他们/你们 in 1.14b), but each is placed before its first use once findings 6 and 8 are applied.

## Proposed prereq edges

| Unit | Prereqs now | Proposed Prereqs | Reason |
|---|---|---|---|
| Counting 0–10 (new) | — | 0.6, 0.10, 0.13 | Finding 1. Pinyin liù/jiǔ, 一 as a digit, 四/十/是 |
| 1.1 | 0.9, 0.13 | 0.6, 0.9, 0.13 | Finding 11. Pinyin spelling rules, shown from 1.1 on |
| 1.3 | 1.1, 0.10 | 1.2, 0.10 | Finding 8. 她 and 好 in 1.3a, C7 in 1.3b, 朋友 in 1.6a (transitive) |
| 1.4 | 1.2, 0.10, 0.13 | 1.2, Counting 0–10, 0.10, 0.13 | Finding 1. Digits |
| 1.7 | 1.2, 1.3 | 1.3, 1.5 | Finding 5. 这个 + noun in the 1.7a and 1.7b openers |
| 1.10 | 1.8, 1.9 | 1.7, 1.8, 1.9 | Finding 3. Prep fed during 1.7; 说, 做 and 好吃 for 1.12–1.17 |
| 1.14 | 1.10 | 1.10, 1.12 | Finding 6. 会 (1.14c), 要 and 咖啡 (1.14d) |
| 1.17 | 1.10, 1.15 | 1.10, 1.13, 1.15 | Finding 7. 太…了 interleave, the 了 word card |
| 1.18 | 1.1–1.17 (all) | all S1 units, including Counting 0–10 | Finding 1 |
| *(optional)* 1.16 | 1.15, 0.10, 0.11 | 1.14, 1.15, 0.10, 0.11 | Only if 喜不喜欢 stays (finding 18) |

Checked:
- No edge creates a cycle. In particular 1.7 ← 1.5 ← 1.4, and 1.10 ← 1.7 doesn't feed back into 1.5 or 1.7.
- Every new prereq comes earlier in table order, with Counting 0–10 inserted before 1.4, so the default path is unchanged.
- Edges that would have been cycles were rejected and replaced by vocab or wording fixes: 1.4 ← 1.5 or 1.9 (finding 9), 1.5 ← 1.8 (finding 10), and 1.7 ← 1.10 (finding 4).

## Triage of the mechanical report

S1 has 114 rows in `word-deps.tsv`: **38 real and 76 noise**.

Real rows, all folded into findings:
- 1.3a 她, 好 (8)
- 1.3b 去 (4)
- 1.4c 本, 号 (9)
- 1.5c 杯, 猫 (10)
- 1.6a 书 (12), 朋友 (8)
- 1.7a 去 (4), 这个 (5)
- 1.7b 这个 (5)
- 1.9b 今天 (13)
- 1.10b 北, 京; 1.10c 北, 京; 1.11a 北, 京 (15; one word split six ways)
- 1.10d 厨, 房 (14)
- 1.11b 杯 (10)
- 1.12a 说 (3)
- 1.12b 碗 (16)
- 1.12d 停 (16)
- 1.13b 好吃 (3)
- 1.14c 会, 说, 中文 (6, 3), 文 (17)
- 1.14d 咖啡, 要 (6)
- 1.16a 喜, 喜欢 (18)
- 1.17a, 1.17b, 1.17c 了 (7)
- 1.17c 做 (3)

Noise, by cause:
- **Tool artifact (10 rows).** All 1.18c rows. `lessons.tsv` parsed 1.18's Prereqs "1.1–1.17 (all)" as the two units `1.1 1.17`, so it reported 多少, 怎么, 怎么样, 会, 能, 可以, 还是, 也, 都 and 了 as off-path. 1.18 depends on every S1 unit. Worth fixing in the script before other stages are triaged.
- **Asides, Go deeper and notes about other lessons:**
  - 1.1a 不, 她
  - 1.2b 哪儿, 几
  - 1.3a 吗, 不, 忙
  - 1.3b 太, 没
  - 1.3c 太, 了, 一点儿, 有, 点
  - 1.4c 百, 千, 万
  - 1.4d 年, 纪
  - 1.5a 哪儿
  - 1.6a 她
  - 1.6b 没
  - 1.7a 没, 哪儿
  - 1.8a 哪里, 那里, 这里
  - 1.8b 中国
  - 1.9b 周, 礼, 拜
  - 1.10b 到
  - 1.11b 不要
  - 1.12a 下雨
  - 1.12c 还
  - 1.13c 或者, 还
  - 1.14a 还
  - 1.15b 以前, 还
  - 1.17a 太
- **Video titles and summaries:**
  - 1.1a 的, 朋友 (我的朋友)
  - 1.8a 和 (猫和狗)
  - 1.15a 都, 猜, 中 (都没猜中, from a plot summary)
- **Chunks:** 1.1b 什么 (你叫什么名字, per its vocab note) and 1.1c 很 (认识你很高兴).
- **Names:** 1.1b 王, 明; 1.2b 王; 1.6a 王; 1.12a 胡, 安. 1.1b 姓 is excluded by the plan itself.
- **Bad segmentation:**
  - 1.4b, 1.4c 个人 (should be 个 + 人)
  - 1.10d 在家, 吃饭
  - 1.15c 吃饭
  - 1.17c 吃饭
  - 1.13b 太好了
  - 1.12d 开 (should be 开车)
