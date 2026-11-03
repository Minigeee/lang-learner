# S2a dependency review

Scope: `docs/design/lesson-plans/S2a.md`, units 2.1–2.15 (2.15 is the midpoint checkpoint). Upstream: all of S1 (doc 03 S2 header: "every S2 unit also assumes S1"). So "off-path" here means one of two things: a dependency inside S2 that the unit's prereq closure doesn't cover, or an S1 dependency that S1 doesn't actually teach. I applied the coordinator's revised guidance. I propose only unit-level edges. Fixes are additive: a new unit where a set is missing or split, and vocab row moves or plan wording elsewhere. No existing unit is reordered.

S2a prereq closures used below (doc 03 §1.8 plus `deps-report/lessons.tsv`): 2.1→1.15, 1.17 · 2.2→2.1 · 2.3→2.1 · 2.4→1.17 · 2.5→2.1 · 2.6→1.12 · 2.7→1.15, 2.2 (so 2.1) · 2.8→1.14 · 2.9→1.5 · 2.10→1.6 · 2.11→2.10, 2.2 (so 2.1) · 2.12→2.11 (so 2.10, 2.2, 2.1) · 2.13→1.8, 2.1, 2.4 · 2.14→2.13 (so 2.1, 2.4) · 2.15→all above, not gated.

## Summary
- **Colors are split across two units that share no S2 path, and the base form 红 isn't placed at all.** 红色/黑色/白色 sit in unit 2.4, while 绿色/蓝/黄色 sit in unit 2.10 and 颜色 in lesson 2.10b. 2.10 (prereq 1.6 only) relies on 红的 and 红色的车, but 2.4 isn't on its path. 红 is in no vocab file, and it isn't an HSK 2025 L1–3 entry (only 红色 is). Fix: add a new two-lesson **Colors** unit that 2.4 and 2.10 both list as a prereq.
- **Core verbs and lesson targets sit only in the S1 frequency queue**, which never guarantees a word before a lesson. Lesson targets: 一下 (2.7a), 请 (2.7c), 有的/一些 (2.9b), 时候 (2.11b's 的时候). Core contrast words: 找, 听, 到 (2.5b), 穿, 开 (2.4a/b), 住 (2.13a), and 到 again (2.11b/d, 2.14a/b). Fix: vocab row moves, including a `prep:2.1` feed for 到/找/听.
- **2.5b's and 2.11b's lesson tiers hold words their plans don't use, while their real targets were pushed out.** 2.5b's targets 找到 and 看到 went to 2.5c ("lesson full"), and 听到 went to unit 2.5. 2.5b's lesson tier holds 错 声音 遇到 收到 遇见 instead. 2.11b's tier holds 时 小时候 从小 过去 后来, while 时候 waits in the queue.
- **Four S2-internal off-path uses**, each with a wording fix or an edge:
  - 2.1a's habit marker 每天 (每 is 2.9c's target);
  - 2.8a interleaves 让 (2.7c, not on 2.8's path);
  - 2.11d's opener line 刚吃完 (完 is 2.5a's, not on 2.11's path);
  - 2.13b's core example 墙上挂着一张画 (张 is 2.9a's and off-path; 墙 is off-list).
- **Prep misuse at the checkpoint:** 爷爷, 奶奶 and 照顾 are `prep:2.15` with `needed_by 2.15`. The feed unit is the same as the deadline unit, and it's a checkpoint, where new words never go. 爷爷/奶奶 also belong with S1's family set (1.6).
- **Several C2 practices reduce to "which word did you hear"** (2.6b, 2.8b, 2.9b, 2.11d, 2.13c). Each contrast is between two different words, so the meaning the skill names isn't tested, and the skill card duplicates the word cards.
- **2.1a's skill id claims the amount point, but practice never tests it.** The practice is done vs plan vs habit, which is close to 1.17b's done vs wanted/didn't. 2.1b's new point (了 drops under 没) can't be tested receptively either, so its card reviews 1.15a's did/didn't.
- **2.4c's C6 tiles 遍, 变 and 者 are characters the learner hasn't met by 2.4c** (2.21a, 2.17c, and the S2 queue), and pinyin is off. If the tiles show hanzi only, the item is solved by recognizing the one known character, not by ear.
- **The format schedule over-claims.** "No S2a lesson shows an introduction card" holds only if the learner has done S1's lessons. A learner who passes 1.18's test-out can skip S1 lessons and meet C1, C2 and C4–C7 first in S2a.
- **Minutes likely undercount `main` videos.** 2.4a, 2.9a, 2.12b, 2.14a and 2.14c say ~6 min but play an unspecified "span" of a 5:40–8:06 `main` video.

## Findings
| # | Severity | Category | Lessons | Finding (with evidence) | Fix | Confidence |
|---|---|---|---|---|---|---|
| 1 | major | closed-set | 2.4a, 2.4b, 2.10a, 2.10b | Colors are split, partly off-path, and 红 is missing. vocab-S2: `红色/黑色/白色 unit 2.4`, `绿色/蓝/黄色 unit 2.10`, `颜色 lesson 2.10b`. 红 is in no vocab file and not in `sandbox/data/hsk2025/words-l1-3.tsv` (which has 红色 L2). 2.10a opener "from 红色的车 up to…"; 2.10b "我要红的. Red what?" and "a row of colored cups"; 2.4a summary "他穿着红衣服". 2.10's closure is 1.6 + S1, so 红色 (unit 2.4) isn't on its path. | Add a new **Colors** unit (see Proposed prereq edges). Move 红色 黑色 白色 (unit 2.4) and 颜色 (lesson 2.10b) to lesson Colors-a. Move 绿色 黄色 蓝 (unit 2.10) to lesson Colors-b. Add 红 to vocab-extra (`S2, lesson, Colors-b`, note "bare form before 的: 红的; 红衣服"). Add the Colors unit to the prereqs of 2.4 and 2.10. | verified |
| 2 | major | tier-misuse | 2.5b | 2.5b's targets aren't in its lesson tier. Plan: "看 vs 看见, 找 vs 找到, 听 vs 听到"; opener "我找了 / 我找到了". vocab-extra: `找到 lesson 2.5c`, `看到 lesson 2.5c`, note "2.5b teaches 看 vs 看到 (lesson full)"; `听到 unit 2.5`. 2.5b's lesson tier is `错 声音 遇到 收到 遇见`, and none of those appear in the 2.5b plan. | Move 找到 and 看到 (vocab-extra, lesson 2.5c) to lesson 2.5b, and 听到 (unit 2.5) to lesson 2.5b. Move 错 声音 遇到 收到 遇见 (lesson 2.5b) to unit 2.5. 2.5c keeps 懂 清楚 明白, and its 没找到/没看到 examples now come after 2.5b. | verified |
| 3 | major | vocab | 2.5b, 2.5c, 2.5d, 2.11b, 2.11d, 2.14a, 2.14b | Base verbs and 到 are only in the S1 queue. vocab-S1: `到 queue:S1 (rank 1)`, `找 queue:S1 (13)`, `听 queue:S1 (17)`. They're needed for 2.5b's "找 vs 找到, 听 vs 听到", 2.5c "他听了, 但是没听懂", 2.11b "我到家的时候", 2.11d "刚到", 2.14a's frame "从 A 到 B" and 2.14b "从我家到学校". A queue word is never guaranteed before a lesson. | Move 到, 找 and 听 from queue:S1 to `prep, prep:2.1`. Needed_by: 到 `2.5 2.11 2.14`; 找 and 听 `2.5`. 2.1 is on the closure of 2.5, 2.11 (via 2.2) and 2.14 (via 2.13), and these words aren't 2.1's own content. | verified |
| 4 | major | tier-misuse | 2.7a, 2.7c, 2.9b, 2.9c, 2.11b | Lesson targets wait in the S1 queue. vocab-S1 `queue:S1`: 一下 (rank 20), 请 (40), 有的 (38), 一些 (9), 时候 (8). Skills: "verb + 一下 / doubled verb" (2.7a), "请/叫/让 + person + verb" (2.7c), "有的 / 有些 … vs 一些" (2.9b), "clause + 的时候" (2.11b). Lesson tiers: 2.7a `一会儿 试 尝`; 2.7c `让 办公室 经理 同事`; 2.9b `其他 有些 别人`; 2.11b `时 小时候 从小 过去 后来`, none of which the 2.11b plan uses. | Move 一下 → lesson 2.7a (4 words). Move 请 → lesson 2.7c (5). Move 有的 and 一些 → lesson 2.9b (5 with 其他 有些 别人). Move 时候 → lesson 2.11b, and move 从小 过去 后来 → unit 2.11, so 2.11b = 时候 时 小时候. | verified |
| 5 | major | vocab | 2.4a, 2.4b, 2.13a | Core verbs only in the S1 queue: `穿 queue:S1 (31)`, `开 queue:S1 (14)`, `住 queue:S1 (21)`. 2.4b's whole contrast is "他在穿衣服 / 他穿着衣服"; 2.4a "门开着, 他穿着红衣服"; 2.13a "住在, 坐在, 放在", "我住在北京". | Move 穿 → lesson 2.4a (着 站 关 灯 穿 = 5). Move 开 → unit 2.4 (which keeps 拿 after the color move in #1). Move 住 → lesson 2.13a, and move 冰箱 → unit 2.13 so 2.13a stays at 5. | verified |
| 6 | major | skill-sanity | 2.6b, 2.8b, 2.9b, 2.11d, 2.13c | In these lessons C2 sorts two different words, so the odd one is found by word identity, not by the meaning the skill names. 2.6b "three say 得 *děi*, one says 应该" (skill: advice vs no choice); 2.8b "three … (跟), one … (给)"; 2.9b "the cue is the word itself"; 2.11d "three say 刚, one says 已经"; 2.13c "three move toward the speaker, one away" (that is, 来 vs 去 heard as words, though the skill is about where the speaker is). The skill cards then review what the word cards already review. C2 stays valid where the cue is a form inside the same frame (2.2a's final 了, 2.2d's slot, 2.5b's result ending). | Switch to a meaning face that keeps the plan's own glosses: 2.6b C3 (flip *should* ↔ *has to*); 2.9b C0 (*some of them, others not* · *an amount*); 2.11d C0 timeline (*a moment ago* · *done, earlier*); 2.13c C0 (*speaker is there* · *speaker is elsewhere*); 2.8b: drop it as a separate card (see #13). Then re-run the "neighbors differ" checks. | verified (quotes); inferred (that the card adds no evidence beyond word cards) |
| 7 | major | skill-sanity | 2.1a, 2.1b | 2.1a's id `zh:g:le-verb-amount` claims the amount point, but practice "tells 买了三本 from 要买三本 and 每天买三本: the verb and amount stay the same, and only the marker … differs". That is done vs not-done, close to 1.17b's practice ("Three happened (verb + 了) and one was only wanted or didn't happen"). 2.1b's new point (了 drops) can't be tested receptively, since the Chinese is always right, so its C3 *did* ↔ *didn't* flip reviews 1.15a's `zh:g:mei-verb`. | 2.1a: rename the skill to what is tested (`zh:g:le-done-vs-plan`, "了 reports it done; 要 plans it"), or keep the amount by adding an open-ended face (我买了书… with no amount, "is more coming?"). The first is simpler. 2.1b: make the exchange rung the core, with C3 on Q&A pairs (你吃了吗? → 没有 / 吃了), and rename the skill to `zh:g:le-question-answer`. | verified |
| 8 | major | format | 2.4c (also 2.15c) | The C6 distractor tiles are unmet characters, with pinyin off. 2.4c: "sound-alike tiles (边/遍/变; 着/这/者)", "pinyin off". Placement: 遍 lesson 2.21a, 变 lesson 2.17c, 者 queue:S2. If tiles show hanzi only, the learner picks the one familiar character (边 from 一边, 着), so the choice isn't by ear, which is what the plan claims. Brainstorm X19 shows pinyin on tiles ("去 qù / 七 qī / 气 qì"), but the plan doesn't say whether tiles keep pinyin when support is off. | Plan wording for 2.4c and 2.15c: "C6 tiles always show pinyin under the hanzi, whatever the support stage", or else use only met characters as tiles (for 着: 这 is met; replace 者 with 遮 only if pinyin shows). | verified (placements, pinyin off); inferred (tile rendering) |
| 9 | major | missing-edge | 2.8a | 2.8a "interleaves 让 (2.7c, also 'who acts')". 2.8's closure is 1.14 + S1, and 2.7 isn't in it. | Drop the interleave from 2.8a's Variety line (the "who acts" link isn't the 给 cue), or add 2.7 to 2.8's Prereqs. Prefer the drop: 2.8 doesn't otherwise need 2.7. | verified |
| 10 | minor | missing-edge | 2.1a | The habit marker 每天 ("每天买三本", face "⟳ habit") uses 每, which is 2.9c's target (`每 lesson 2.9c`). 2.9 isn't on 2.1's path, and 每天 is in no file. | Wording: 每天买三本 → 常常买三本. Move 常常 from unit 2.21 to lesson 2.1a (5 words). 2.21's closure (2.3, 2.2) includes 2.1, so 2.21 keeps it. | verified |
| 11 | minor | missing-edge | 2.11d | Opener "five 刚 lines (刚到, 刚吃完, 刚起床)". 完 is 2.5a's result complement, and 2.5 isn't in 2.11's closure. | Wording: 刚吃完 → 刚走 (走, 1.15c). Alternative: add 2.5 to 2.11's Prereqs (no cycle), which isn't needed for anything else. | verified |
| 12 | minor | missing-edge / vocab | 2.13b | Core example and opener "墙上挂着一张画". 张 is lesson 2.9a, and 2.9 isn't on 2.13's path. 墙 is in no vocab file. 挂 is unit 2.13 (vocab-extra). Doc 03's 2.13 row uses the same example. | Wording: lead with 桌子上放着一本书 (桌子 1.8b, 本 1.5c, 放 2.13a), and keep 挂着 for a second line with 个 (门上挂着一个…). Alternative: add 2.9 to 2.13's Prereqs and add 墙 to vocab-extra (unit 2.13). | verified |
| 13 | minor | skill-sanity | 2.8b, 2.8c | 2.8b's practice is "跟 … one does it for someone (给)", and 2.8c sorts 对/跟/给 three ways. 2.8b's card tests a subset of 2.8c's. | With #6: make 2.8b's practice about the slot meaning (C3 flip *with her* ↔ *for her* on the same verb), or accept the overlap and note it. | verified |
| 14 | minor | skill-sanity | 2.3c, 2.5d | Both Clip skills (`zh:l:travel-story-guo`, `zh:l:results-story`) review as "C7 on unplayed stories". 2.3c's own note: "C7 trains following the story more than the 过 cue". 2.5d pauses "right after a result line", so its result decides the continuation; 2.3c's pauses aren't tied to 过. | 2.3c: place the pauses after a 过 or 了 line whose reading decides the next line (has she been before, or is she there now). Otherwise the two cards review the same general story-following skill. | verified |
| 15 | minor | schedule | 2.15a | vocab-S2 `爷爷, 奶奶 prep:2.15, needed_by 2.15 2.32` and `照顾 prep:2.15, needed_by 2.15`. The feed unit doesn't come before needed_by, and 2.15 is a checkpoint ("New words never go inside checkpoints", README Vocabulary row). The family set is otherwise S1 1.6. | Move 爷爷 and 奶奶 to `unit, 1.6` (the family set, on every S2 path). Move 照顾 to `prep:2.14, needed_by 2.15`. Note: 2.15 is ungated, so no feed guarantees a word for a test-out taker, and gist questions mustn't hinge on 照顾. | verified |
| 16 | minor | format | stage summary | "S1 introduces all nine formats … so no S2a lesson shows an introduction card." 1.18's items write `checkpoint` evidence onto S1 lesson skills and recommend only weak lessons. So a learner who passes 1.18 may skip S1 lessons and first meet C1, C2 and C4–C7 in S2a. Brainstorm §4.1 shows the intro "the first time a format appears on the path". | Wording: "S1 normally introduces all nine formats. A learner who tested out of S1 sees each one's intro card at its first S2a appearance (brainstorm §4.1); the table below lists those lessons." | inferred (depends on how 1.18 test-out skips lessons) |
| 17 | minor | schedule | 2.4a, 2.9a, 2.12b, 2.14a, 2.14c | Each is ~6 min while its I do plays a `main` video as an unnamed span. Video lengths: Sisi 着 6:45, Everyday Chinese 8:06, Sisi 就/才 6:25, Chinese In Minutes 5:40, Sisi transport 7:22. The README Video row says "the lesson's minutes count the video". Where spans are named (2.9b 0:53–2:45, 2.13a 0:00–1:56), the minutes fit. | Name each span (from chapters or description), or raise the minutes to include the video. The stage total (~4.7 h) then grows. | verified (lengths, minutes); inferred (actual span lengths) |
| 18 | minor | vocab | 2.11c | "还没 is first met here … 还没 is 没 (1.15a) plus 'still'." 还没 has no row; 还 has rows at 1.14c ("also") and 2.30c. Sense-split rows already exist (`给 … sense: preposition`, `点 … sense: 'to order'`). | Add `还没` to vocab-extra (`S2, lesson, 2.11c`, note "not yet; partner of 已经"). Move 起飞 (lesson 2.11c) to unit 2.11. | verified |
| 19 | minor | vocab | 2.8c | 2.8c's target 对 "toward" has no row. 对 is only `lesson 1.16b`, note "对不对 tag; also 'right'", so its card's definition won't carry "toward". | Add a sense row `对` to vocab-S2 (`lesson 2.8c`, note "sense: preposition 对 + person, toward"). Move 热情 to unit 2.8. | verified |
| 20 | minor | vocab | 2.3b | vocab-extra puts `从来 lesson 2.3b` ("从来没…过 'never' sharpens 过"). The 2.3b plan never mentions 从来, and doc 03 lists 从来 among the points "removed as beyond L3 … now mined only". | Move 从来 from lesson 2.3b to unit 2.3 (next to 曾经), or to the S2 queue. | verified |
| 21 | minor | missing-edge | 2.5c, 2.3b, 2.2a, 2.11a | Small off-path words in a lesson's own lines. 2.5c opener "他听了, 但是没听懂" (但是 is lesson 2.19b). 2.3b I do "过 … can take one (以前, 去年)" (以前 is lesson 2.11a). 2.2a summary "大学生了" (大学生 is queue:S1). 2.11a ✗/✓ "吃饭以前洗手" (手 is lesson 2.24a). | 2.5c: "他听了, 没听懂". 2.3b: keep 去年 only. 2.2a: "三年级了" (年级 is 2.2a's own word). 2.11a: "睡觉以前刷牙" (睡觉 unit 1.10; 刷 牙 unit 2.1, on 2.11's path via 2.2). | verified |
| 22 | minor | missing-edge | 2.6b | 2.6b's `main` BLCU pair "明天要考试了，我得…" uses 要…了 "about to" (2.2c). 2.6's closure is 1.12 + S1, and 2.2 isn't in it. | Add 2.2 to 2.6's Prereqs (no cycle; 2.2 already comes earlier in table order), or add a one-line gloss of 要…了 to 2.6b's I do. | inferred (the line is from the video description as the plan quotes it; the audio wasn't checked) |
| 23 | minor | missing-edge | 2.10a | Variety "interleaves … verb-了 (2.1a)". 2.1 isn't on 2.10's path. The contrast 我买的书 / 我买了书 needs only S1's verb-了 (1.17b). | Wording: "verb-了 (1.17b)". | verified |
| 24 | minor | closed-set | 2.14c | Vehicles are split: 地铁 打车 公交车 自行车 in lesson 2.14c, but 飞机 火车 出租车 only in queue:S1 and 船 in queue:S2. 2.14c's map has "the vehicles at each" place. | Move 飞机 火车 出租车 from queue:S1 to unit 2.14 (a vehicle word-set step with 2.14c). | verified |
| 25 | minor | vocab | 2.2c | The skill is "快/要/就要 + verb + 了", but 就要 has no row, and 就 is first placed at 2.12a (not on 2.2's path). 快要 is placed (lesson 2.2c). | Add `就要` to vocab-extra (`S2, lesson, 2.2c`). Move 放假 to unit 2.2 so 2.2c stays at 5. | verified |
| 26 | minor | missing-skill (upstream) | 2.1a, 2.2a, 2.9a–c, 2.12b, 2.14a | S2a leans on digits and numbers throughout: "买了三本书", "十点了, 我二十岁了", "他七点就来了", "从九点到五点". This is the S1 gap from the brief (1.4a assumes 1–10). | No S2 edge is needed. Once S1 gains its Numbers unit, "every S2 unit assumes S1" covers it. Listed so the S1 fix is known to unblock these. | verified |

## Proposed prereq edges

| Unit | Add prereqs | Reason |
|---|---|---|
| **New unit: Colors** (stable unit slug `unit:colors`; slot it in table order right after 2.3, so it takes display id 2.4 and later units renumber, which is display-only per doc 03) | Prereqs: none in S2 (assumes all of S1, like every S2 unit). Direct S1 prereq: 1.3 (很 + adjective). | One coherent color set, needed by 2.4 (穿着红衣服) and 2.10 (红的, 红色的车), which share no S2 ancestor. Lessons: **(a)** `les:colors-basic`, "红色, 白色, 黑色: what color is it?". Words 红色 白色 黑色 颜色 (4). Pattern · Discover · C0 Pick (swatch face) · skill `zh:v:colors-basic` · ~5 min. **(b)** `les:colors-more`, "绿色, 蓝, 黄色, and 红 before a noun". Words 绿色 蓝 黄色 红 (4). Pattern · Showdown · C4 Listen and do (tap the object of that color in a parts-library scene; interleaves a) · skill `zh:v:colors-more` · ~5 min. Both stay within the ~5-word cap. Videos: to find. |
| 2.4 At once and ongoing | + Colors | 2.4a/2.4b's clothes examples (他穿着红衣服). |
| 2.10 Describing with 的 | + Colors | 2.10a opener 红色的车; 2.10b 我要红的 and the colored-cups figure. |
| 2.8 To, for, with someone | + 2.7 (*alternative* to dropping the 让 interleave; #9 prefers the drop) | 2.8a interleaves 让 (2.7c). |
| 2.6 Should, must, want, will | + 2.2 | The 2.6b `main` video's 要考试了 uses 2.2c's 要…了 (#22, inferred). |
| 2.11 Time order | + 2.5 (*alternative* to the wording fix in #11) | 2.11d's 刚吃完. |
| 2.13 Where and which way | + 2.9 (*alternative* to the wording fix in #12) | 2.13b's 一张画. |

None of these edges creates a cycle. Every added prereq already precedes its dependent in table order, so the default path is unchanged.

## Triage of the mechanical report

Against the regenerated `word-deps.tsv` (S1 folded into S2 closures; ranges expanded), S2a has **92 rows: 39 later-or-off-path, 45 queue, 8 off-list. Real: 41. Noise: 51.** The first pass ran against the old file, which had 172 S2a rows. Every row that disappeared was an S1-placed word, and so noise. All 40 rows triaged as real then are still present, and one more is real now (2.2c 就).

Noise, by cause:
- **2.15b and 2.15c checkpoint rows (25).** "All units above" isn't expanded into a closure. Every flagged word is taught in 2.1–2.14.
- **Asides and exclusions (8):**
  - 好久 and 见 (2.1b, Go deeper);
  - 到 (2.6b, Go deeper "他应该到了");
  - 坐下 (2.4b, excluded);
  - 又 (2.4c, S2b interleave note);
  - 只有 (2.12b note);
  - 把 (2.13a, excluded);
  - 马上 (2.13c, Go deeper).
- **Segmentation splits of 北京 and 上海 (9):** 北, 京 in 2.3a, 2.3b, 2.13a and 2.14a, plus 海 in 2.14a.
- **Compositional words or ones already covered (9):**
  - 吃饭 ×3 (吃 and 饭 are lesson 1.10a);
  - 开门 (covered by 开, #5);
  - 见 in 2.5b and 2.5d (看见 is lesson 1.15a);
  - 有些 (also placed at lesson 2.9b);
  - 开 in 2.14c (开车 is lesson 1.12d).
- **Titles (1):** 男朋友 (2.12a video title).

Real rows, all folded into findings:
- 2.1a 每 (#10)
- 2.2a 大学生 (#21)
- 2.2c 就 (#25: 就要 is in 2.2c's skill, and 就 is first placed at 2.12a, which isn't on 2.2's path)
- 2.3b 以前 (#21)
- 2.4a 红, 开, 穿; 2.4b 红, 开, 穿 (#1, #5)
- 2.4c 遍, 变, 者 (#8)
- 2.5b 到, 找, 找到, 听 (#2, #3)
- 2.5c 听, 但是 (#3, #21)
- 2.5d 听, 到, 找 (#3)
- 2.7a 一下; 2.7c 请 (#4)
- 2.8a 让 (#9)
- 2.9b 有的, 一些; 2.9c 有的 (#4)
- 2.10a 红色; 2.10b 红 (#1)
- 2.11a 手 (#21)
- 2.11b 时候, 到 (#3, #4)
- 2.11d 到, 完 (#3, #11)
- 2.13a 住 (#5)
- 2.13b 墙, 张 (#12)
- 2.14a 到; 2.14b 到; 2.14c 到 (#3)

Real issues the pre-pass couldn't see, because the words appear placed:
- tier contents that don't match the plan (2.5b, 2.11b, 2.3b's 从来);
- missing sense rows (对 "toward", 还没, 就要);
- the prep:2.15 feed;
- the 2.8a, 2.10a and 2.6b grammar interleaves.
