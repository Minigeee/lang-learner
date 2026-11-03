# Spike: can S1 and S2 be filled with lesson-eligible native examples?

Throwaway research spike, run 2026-11-02. It answers the project's top risk (docs/research/README.md, "Biggest risks"): can each S1 and S2 lesson idea in doc 03 §1.8 get **at least 5 example sentences in at least 4 distinct native voices**, using only media whose transcript we can obtain automatically and legitimately?

The subagent wrote this report. The orchestrator saved it, because subagents can't write report files in this harness.

> **Update (2026-11-02): the full Common Voice zh-CN 27.0 dataset is now available locally.** The user created the Mozilla Data Collective account. `python sandbox/data/fetch_common_voice.py` downloads it into `sandbox/data/common-voice-zh-CN/` and deletes the archive afterward. The "yellow" figures below are projections from the GitHub sentence text.
>
> **Measured rerun (2026-11-03, `status_measured` in `out/lessons.csv`):** distinct voices are now counted as distinct `client_id`s on validated clips of the matched sentences.
> - **The projection held.** 114 of 158 ideas are green on validated clips: S1 44/53, S2 70/105. Two more (S1) are green only if unvalidated clips are admitted after an automatic check. **42 are red**, nearly the same set as before, clustered in S2: 2.5, 2.18, 2.22, 2.24, 2.26 and 2.28 (3 each).
> - **Without Wikipedia-origin sentences:** 104 green plus 6 green-after-check.
> - **Voices are not the bottleneck.** The median idea has 32 distinct validated voices. The limit is learner-level sentences: only 3,784 validated-clip sentences pass the S2 learner-fit rule, and 1,474 pass S1.
> - The dataset has 51,172 sentences with a validated clip, from 5,828 distinct validated voices.
> - The ~70% match precision caveat below still applies, so the true green count is lower. The recommendations in §1 for the red ideas are unchanged.

## TL;DR

- **Nothing is fully coverable today: 0 of 158 lesson ideas (0%) are green.**
  - The audio we can legitimately hold without an account has at most **3 voices**: 2 licensed Tatoeba recorders plus the single Global Storybooks narrator.
  - So the 4-voice target can't be met from it, whatever the sentence.
- **Text is not the bottleneck; licensed audio from several voices is.**
  - 157 of 158 ideas have at least 5 learner-level Tatoeba sentences (median 285).
  - Almost none of those sentences have usable audio.
- **Tatoeba audio is effectively unusable.**
  - Of 5,825 cmn recordings, only **84 are licensed** (GlossaMatik 69, zhoucantd 15), and **both are CC BY-NC 4.0**.
  - LeviHighway (4,066) and fucongcong (1,675) have no license.
- **Common Voice is the only source of sentences in many voices.**
  - **With it, 115 of 158 ideas (73%) are yellow:** S1 46/53 (87%), S2 69/105 (66%).
  - That falls to 108 (68%) without Wikipedia-origin sentences, and to about 95 (60%) after discounting for the ~70% match precision I measured.
  - CV zh-CN 27.0 has 59,170 validated sentences and 852,410 clips (190,406 validated) from 7,601 speakers. That is **about 14 recordings and about 3.2 validated recordings per sentence** on average, so each sentence comes in several voices.
  - The sentence pool is small and **93% Wikipedia text**. Only about 3,700 sentences are conversational.
- **43 ideas are red (27%): 7 in S1, 36 in S2.** They cluster in the second half of S2:
  - 得 complements (2.22, all three red; 2.20-b)
  - 把 (2.24)
  - comparison (2.4-b/c, 2.18-b/c/d)
  - conditionals (2.28)
  - existential and appearance sentences (2.5)
  - 从/离 (2.17)
  - durations and split verbs (2.12)
  - real-speed speech (2.26), which no text corpus can supply
- **Merging thin ideas fixes most reds.**
  - 18 of 23 proposed merges come out yellow, though several land exactly at the threshold.
  - Five clusters stay red: 一边/着 + verb, existential and appearance sentences, 从/离, 只要/只有, and 或者/还是.
- **The most valuable permission requests:**
  - **Tatoeba recorders LeviHighway and fucongcong:** ask them to put a CC license on their recordings. That alone turns 42 ideas green.
  - **Lazy Chinese:** its free transcripts already exist, and it is the best beginner CI catalog.
- **Scope:**
  - Keep S1 and the HSK 1–3 grammar scope.
  - Restructure S2 into fewer, broader lessons.
  - Let the red points fall back to "mined", or relax the voice rule from per lesson to per unit (activity-brainstorm §4 already checks voices per unit).

## Method

**Sources.** All text or metadata; no audio was downloaded. Data lives in `data/`, which is git-ignored.

| Code | What was fetched | License | Used for |
|---|---|---|---|
| TB | Tatoeba `per_language/cmn/cmn_sentences.tsv.bz2` and `sentences_with_audio.tar.bz2` (export dated 2026-10-31) | Text CC BY 2.0 FR; audio licensed per recording | Text matches; licensed vs unlicensed audio; recorder names |
| CV | `common-voice/common-voice` `server/data/zh-CN/*.txt` (last export commit 2023-01-25), and `cv-dataset` metadata `cv-corpus-27.0-2026-09-11.json` | CC0 | Candidate sentence text; estimate of how many sentences are recorded |
| GS | `global-asp/storybooks-minnesota` `stories/zh/*/index.html` (40 stories) | Text CC BY; audio CC BY or CC BY-NC per story (gasp-audio README) | Sentences with narration for each page |
| AC | `hugolpz/audio-cmn` file tree | CC BY-SA | Word audio coverage |
| HSK | `krmanik/HSK-3.0` "New HSK (2025)" L1–3 word lists | — | Character inventory for the learner-fit filter |

The Tatoeba `links` export wasn't needed. It only maps translations.

**Matching.**
- Each S1 and S2 lesson idea has a reviewable regex in `patterns.yaml`: 158 ideas in all. The checkpoint units 1.15, 2.30 and 2.15 are excluded.
- Sentences are converted to simplified characters (OpenCC t2s) before matching.
- A contrast lesson (e.g. 不 vs 没) matches a sentence containing either member.
- Eleven "heard in a story or scene" ideas are tagged `clip`. For those, matching sentences are only a proxy, because the lesson really needs a continuous clip.

**Learner-fit filter**, applied to every count below unless a column says "raw":

| Stage | Max length | Allowed outside the HSK 2025 character inventory |
|---|---|---|
| S1 | 20 hanzi | at most 1 hanzi outside L1–2 |
| S2 | 25 hanzi | at most 1 hanzi outside L1–3 |

- Common Tatoeba names (汤姆, 玛丽 …) count as known.
- Sentences containing Latin letters are dropped.

**Status per lesson idea.** The target is at least 5 sentences in at least 4 voices.

| Status | Meaning |
|---|---|
| **Green** | Met today from audio we can already legitimately hold: Tatoeba rows with a license field, plus Global Storybooks pages. |
| **Yellow** | Met only once Common Voice clips are pulled, assuming each candidate sentence gives at least one validated, distinct voice. That needs the full dataset, which needs a Mozilla Data Collective account. |
| **Red** | Not met even with the Common Voice candidates. |

**Common Voice recording rate.** The GitHub repo has sentence text but not clips, so per-sentence recording counts are unknown. The CV 27.0 metadata gives these zh-CN totals:

| Metric | Count |
|---|---|
| Validated sentences | 59,170 |
| Unvalidated sentences | 1,021 |
| Clips | 852,410 |
| Validated clips | 190,406 |
| "Other" clips (not yet validated) | 602,622 |
| Speakers | 7,601 |
| Validated hours | 240 |

- On average that is **about 14.4 clips per sentence, and about 3.2 validated clips per sentence**.
- The repo text has 51,365 unique sentences, about 87% of the dataset's sentence pool, so it is a good proxy for what CV can offer.
- **Estimate, not verified per sentence:** nearly every sentence is recorded, usually by several speakers. How recordings spread across sentences is unknown, and a few prolific speakers may dominate.
- Once the dataset is pulled, count distinct voices by `client_id`.

**Precision spot check.** I hand-checked 30 random (lesson, sentence) matches per source.
- **Common Voice: about 20/30 correct (~65–75%).** Misses include 睡着了 matched as the "holding state" 着, 第一次世界大战 matched as a count of times, and Wikipedia fragments (他是阿努什的斤的儿子).
- **Tatoeba: about 25/30 correct (~80–85%).** Misses include 左右 meaning "left and right", and 你能看到远吗.
- So the CV counts are upper bounds, and the sample is small.
- The patterns favor precision, so some reds may partly be missed matches. For example, most CV sentences have no final punctuation, and I loosened the question patterns for that.

**Reproduce:**
```
python -m venv .venv && .venv/Scripts/python -m pip install jieba pyyaml opencc-python-reimplemented
.venv/Scripts/python -I coverage.py           # writes out/*.csv, out/samples.txt
.venv/Scripts/python -I merges.py > out/merges.md
```
I fetched the data with curl into `data/<source>/`, from the paths in the Sources table above.

## Source inventory

From `out/sources.csv`.

**Tatoeba**

| Item | Count |
|---|---|
| cmn sentences (unique text) | 88,540 |
| Learner-fit (S2 rule) | 51,011 |
| Recordings by LeviHighway (no license) | 4,066 |
| Recordings by fucongcong (no license) | 1,675 |
| Recordings by GlossaMatik (CC BY-NC 4.0) | 69 |
| Recordings by zhoucantd (CC BY-NC 4.0) | 15 |

**Common Voice** (repo text)

| Item | Count |
|---|---|
| Sentences (unique) | 51,365 |
| Wikipedia origin | 47,642 |
| Conversational (`cn.txt`) | 3,182 |
| Sentence Collector | 541 |
| Learner-fit, S1 rule | 1,668 |
| Learner-fit, S2 rule | 4,151 |

**Global Storybooks**

| Item | Count |
|---|---|
| Stories | 40 |
| Sentences | 851 |
| Learner-fit (S2 rule) | 281 |

- Every story has the same narrator (Zhuo Sun), so GS adds one voice.
- The audio comes pre-split by page, which gives sentence alignment almost for free.

**audio-cmn word coverage of HSK 2025**

| HSK 2025 level | Words with audio |
|---|---|
| L1 | 278/301 (92%) |
| L2 | 182/203 (90%) |
| L3 | 462/506 (91%) |

- Only 2 voices.
- Missing words are listed in `out/words_missing_ac.txt` (e.g. 你好, 手机, 打车, 外卖).
- Target words of the vocabulary lesson ideas: 51/63 have audio.

## Per-unit coverage

- **G / Y / R** counts the unit's lesson ideas that are green, yellow and red. **Status** is the worst of them.
- **Audio now** is licensed Tatoeba plus GS.
- **CV candidates** are learner-fit Common Voice text matches.
- **Tatoeba text** is learner-fit matches whose audio is missing or unlicensed.
- Per-idea numbers are in `out/lessons.csv`, per-unit numbers in `out/units.csv`.

| Unit | Lesson ideas | G / Y / R | Status | Audio now: sentences (min–max), voices (max) | CV candidates (min–max) | Tatoeba text, no usable audio (min) | Red lessons |
|---|---|---|---|---|---|---|---|
| 1.1 Greetings and names | 2 | 0 / 1 / 1 | **red** | 0–3, 3 | 3–39 | 98 | 1.1-b names with 叫 (3 CV) |
| 1.2 Asking questions | 3 | 0 / 2 / 1 | **red** | 0–12, 3 | 0–22 | 20 | 1.2-b 你呢? asks back (0 CV) |
| 1.3 Describing | 3 | 0 / 3 / 0 | **yellow** | 2–10, 3 | 2–92 | 534 | — |
| 1.4 Numbers and age | 4 | 0 / 4 / 0 | **yellow** | 0–3, 1 | 17–103 | 212 | — |
| 1.4a This, that, which | 3 | 0 / 2 / 1 | **red** | 0–8, 2 | 4–24 | 214 | 1.4a-b 这些 / 那些 (4 CV) |
| 1.5 Family | 3 | 0 / 3 / 0 | **yellow** | 6–16, 3 | 3–149 | 758 | — |
| 1.6 Asking how | 2 | 0 / 2 / 0 | **yellow** | 2–2, 2 | 3–19 | 129 | — |
| 1.7 Where things are | 3 | 0 / 3 / 0 | **yellow** | 0–8, 2 | 6–31 | 230 | — |
| 1.8 Dates and times | 3 | 0 / 3 / 0 | **yellow** | 0–0, 0 | 5–31 | 132 | — |
| 1.9 Daily verbs, word order | 4 | 0 / 4 / 0 | **yellow** | 1–5, 3 | 3–12 | 228 | — |
| 1.10 Wanting | 2 | 0 / 2 / 0 | **yellow** | 2–3, 2 | 8–54 | 779 | — |
| 1.10a Can | 4 | 0 / 3 / 1 | **red** | 3–19, 1 | 2–59 | 325 | 1.10a-a 会: learned skill (2 CV) |
| 1.11 Food and shopping | 4 | 0 / 2 / 2 | **red** | 0–9, 2 | 1–5 | 73 | 1.11-c A 还是 B? (no 吗) (1 CV); 1.11-d ordering scene at a market (2 CV) |
| 1.12 Also, all, and | 4 | 0 / 4 / 0 | **yellow** | 0–7, 2 | 23–60 | 140 | — |
| 1.13 Didn't, don't, let's | 4 | 0 / 4 / 0 | **yellow** | 0–11, 2 | 10–102 | 301 | — |
| 1.14 Asking whether | 2 | 0 / 1 / 1 | **red** | 0–3, 1 | 2–10 | 273 | 1.14-b tag questions (2 CV) |
| 1.14a Now and changed (first pass) | 3 | 0 / 3 / 0 | **yellow** | 6–28, 3 | 10–99 | 729 | — |
| 2.1 What happened (了 second pass) | 2 | 0 / 2 / 0 | **yellow** | 8–12, 2 | 16–40 | 909 | — |
| 2.16 Things changed | 4 | 0 / 4 / 0 | **yellow** | 1–35, 3 | 3–126 | 200 | — |
| 2.2 Experiences | 4 | 0 / 4 / 0 | **yellow** | 0–12, 1 | 7–57 | 210 | — |
| 2.3 At once and ongoing | 4 | 0 / 2 / 2 | **red** | 0–11, 3 | 0–14 | 11 | 2.3-a 一边…一边 (2 CV); 2.3-c verb + 着 + verb (0 CV) |
| 2.8 Results | 4 | 0 / 4 / 0 | **yellow** | 2–10, 1 | 4–57 | 136 | — |
| 2.7 Should, must, want, will | 4 | 0 / 3 / 1 | **red** | 0–5, 2 | 0–62 | 36 | 2.7-c 得 děi: have to (0 CV) |
| 2.11 Asking and telling | 4 | 0 / 4 / 0 | **yellow** | 2–14, 3 | 17–28 | 526 | — |
| 2.27 To, for, with someone | 4 | 0 / 2 / 2 | **red** | 0–4, 2 | 0–14 | 157 | 2.27-b 给 + person + thing (two objects) (3 CV); 2.27-c 给 + person + verb (0 CV) |
| 2.9 Counting things | 3 | 0 / 3 / 0 | **yellow** | 0–6, 2 | 8–36 | 254 | — |
| 2.13 Describing with 的 | 4 | 0 / 2 / 2 | **red** | 1–2, 1 | 1–30 | 109 | 2.13-b phrase + 的 + noun (我买的书) (2 CV); 2.13-c 的 with the noun dropped (1 CV) |
| 2.6 Time order | 4 | 0 / 4 / 0 | **yellow** | 1–8, 2 | 6–26 | 154 | — |
| 2.19 Early, late | 3 | 0 / 3 / 0 | **yellow** | 0–1, 1 | 7–38 | 95 | — |
| 2.5 Where and which way | 4 | 0 / 1 / 3 | **red** | 0–7, 1 | 0–34 | 13 | 2.5-a place + verb + 着 + thing (0 CV); 2.5-b 来 vs 去 by speaker (3 CV); 2.5-d place + 来了/走了 + someone (1 CV) |
| 2.17 Getting around | 3 | 0 / 1 / 2 | **red** | 0–2, 1 | 0–7 | 72 | 2.17-a 从 A 到 B (2 CV); 2.17-b A 离 B + 远/近 (0 CV) |
| 2.4 Comparing | 4 | 0 / 2 / 2 | **red** | 0–1, 1 | 1–20 | 35 | 2.4-b A 没有 B (那么) + adj (1 CV); 2.4-c 比 + by how much (2 CV) |
| 2.18 More and more, a bit too | 4 | 0 / 1 / 3 | **red** | 0–1, 1 | 1–19 | 12 | 2.18-b 又…又 (1 CV); 2.18-c 越来越 (3 CV); 2.18-d 越…越 (2 CV) |
| 2.14 Big and rough numbers | 3 | 0 / 3 / 0 | **yellow** | 0–0, 0 | 7–16 | 39 | — |
| 2.10 Linking clauses | 4 | 0 / 3 / 1 | **red** | 0–12, 1 | 1–32 | 15 | 2.10-d 或者 vs 还是 (1 CV) |
| 2.12 How long | 3 | 0 / 1 / 2 | **red** | 0–2, 1 | 0–12 | 27 | 2.12-b double 了: still going (0 CV); 2.12-c split verbs (见过面, 睡了…觉) (1 CV) |
| 2.31 How often, again | 4 | 0 / 4 / 0 | **yellow** | 3–17, 2 | 30–76 | 153 | — |
| 2.21 Direction after the verb | 4 | 0 / 4 / 0 | **yellow** | 1–16, 2 | 12–99 | 236 | — |
| 2.22 How well with 得 | 3 | 0 / 0 / 3 | **red** | 0–1, 1 | 0–3 | 32 | 2.22-a verb + 得 + adj (1 CV); 2.22-b verb repeats / object first (0 CV); 2.22-c comparing how well (3 CV) |
| 2.32 地 and doubled adjectives | 3 | 0 / 2 / 1 | **red** | 1–3, 1 | 3–31 | 87 | 2.32-b adj + 地 + verb (3 CV) |
| 2.20 Can or can't | 2 | 0 / 1 / 1 | **red** | 0–1, 1 | 0–17 | 69 | 2.20-b verb + 得 + result: can (0 CV) |
| 2.23 When, where, how it happened | 2 | 0 / 2 / 0 | **yellow** | 4–16, 1 | 12–52 | 351 | — |
| 2.28 If and only if | 4 | 0 / 1 / 3 | **red** | 0–4, 1 | 0–11 | 17 | 2.28-b 只要…就 (3 CV); 2.28-c 只有…才 (0 CV); 2.28-d 只要 vs 只有 (3 CV) |
| 2.29 Everything and nothing | 4 | 0 / 2 / 2 | **red** | 1–3, 2 | 1–4 | 70 | 2.29-c question words meaning some- (2 CV); 2.29-d 除了…以外 (1 CV) |
| 2.24 Doing it to something with 把 | 4 | 0 / 1 / 3 | **red** | 0–1, 1 | 0–6 | 16 | 2.24-a 把 + thing + verb + 在/到 + place (2 CV); 2.24-b 把 + thing + verb + result/direction (1 CV); 2.24-d thing first without 把 (0 CV) |
| 2.25 Happening to you with 被 | 2 | 0 / 2 / 0 | **yellow** | 5–20, 2 | 49–69 | 350 | — |
| 2.26 Real-speed speech | 4 | 0 / 1 / 3 | **red** | 0–9, 2 | 0–63 | 0 | 2.26-a fillers 那个, 就是, 然后 (1 CV); 2.26-c 不是…吗? reminder question (0 CV); 2.26-d first real-speed interview clip (0 CV) |

**Overall** (158 lesson ideas)

| Status | S1 (53) | S2 (105) | All |
|---|---|---|---|
| Green: fully coverable today | 0 | 0 | **0 (0%)** |
| Yellow: coverable once CV clips are pulled | 46 (87%) | 69 (66%) | **115 (73%)** |
| Yellow, with Wikipedia-origin CV excluded | 41 | 67 | 108 (68%) |
| Yellow after the ~70% CV precision discount | 39 | 56 | ~95 (60%) |
| Red | 7 | 36 | **43 (27%)** |
| Green if LeviHighway and fucongcong licensed their recordings | 21 | 21 | 42 (27%) |

- Units with no red idea: 11 of 17 in S1, 13 of 30 in S2.
- Only 48 ideas have at least 5 sentences with audio today.
- The **median idea has 1 GS sentence, 11 CV candidates (8 without Wikipedia) and 285 text-only Tatoeba sentences**.

## Biggest gaps

1. **Voices, everywhere.**
   - Today's ceiling is 3 voices. Even if every Tatoeba recorder relicensed, it would be 5: four cmn recorders plus the GS narrator.
   - Without Common Voice, the rule of at least 4 voices per idea fails for every lesson. CV is the only source whose voice count grows with the sentence pool.
2. **The second half of S2: core grammar.** CV candidates per idea:

   | Area | Ideas | CV candidates |
   |---|---|---|
   | 得 "how well" | 2.22-a/b/c | 1 / 0 / 3 |
   | 得 "can" (verb 得 result) | 2.20-b | 0 |
   | 把 | 2.24-a/b/d | 2 / 1 / 0 |
   | A 没有 B 那么 | 2.4-b | 1 |
   | 比 + amount | 2.4-c | 2 |
   | 又…又 / 越来越 / 越…越 | 2.18-b/c/d | 1 / 3 / 2 |
   | 只要 / 只有…才 | 2.28-b/c | 3 / 0 |

   - These are exactly the forms doc 03 planned to source from "CV transcript search". **The CV sentence pool is too small and too encyclopedic to carry them.**
   - Tatoeba has 12–250 text-only sentences for each of them, but no usable audio.
3. **Spatial and existential sentences.**
   - 2.5-a (墙上挂着一张画): 0 CV candidates. 2.5-d (家里来了一个客人): 1.
   - 2.17-a/b (从…到, 离…远): 2 and 0.
   - 2.3-a/c (一边…一边, 笑着说): 2 and 0.
   - Even Tatoeba text is thin for these (11–35 sentences).
4. **Forms that only conversation has.**
   - The S1 reds are textbook-dialogue forms that Wikipedia and film subtitles rarely contain: 叫 names, 你呢, 这些/那些, 会 for a skill, A 还是 B?, tag questions, and the ordering scene.
   - 2.26 (fillers, 不是…吗?, the real-speed interview clip) needs spontaneous speech. No text corpus supplies that; only a permitted YouTube creator does.
5. **Clip-shaped ideas.**
   - Eleven ideas are "heard in a story or scene": the family-photo talk, "where's the cat", market ordering, a travel story with 过, 把 in a cooking scene, and so on.
   - The only legitimate continuous narration today is GS: 40 stories, one narrator, mostly levels 1–2.
   - Until a YouTube creator grants permission to use their transcripts, these ideas fall back to GS stories or sentence sets.

## CI channel survey

This is web research only, as of 2026-11-02. **No one was contacted.**

**Limits of the survey:**
- YouTube pages did not render, so for every channel these are **unverified**: whether captions are manual or auto-generated, and whether any video carries YouTube's "Creative Commons Attribution" license.
- No channel on the list publishes transcripts under an open license.

**Labels:** (V) = seen on the creator's own page; (R) = reported by a third party.

| Rank | Channel | Transcripts | License | Contact and reuse policy | Business model |
|---|---|---|---|---|---|
| 1 | **Lazy Chinese** (Suqing; formerly Bumpy / Comprehensible Chinese) | Podcast show notes promise "free transcripts, pinyin and English translation" at lazychinese.com (R). Format and time-coding aren't visible without login (V) | No notice seen (V) | Email in the show notes (R); site's "Report issues" page says to email (V); no reuse policy | Membership with 8–10 premium videos a month (V); Udemy course (R) |
| 2 | **Diane Neubauer** (杜雁子) | None published (V) | Not stated | Public email on her site (V); academic and CI teacher-trainer | Book (*Comprehension-Based Chinese*), online classes (V) |
| 3 | **BlaBla Chinese** (Amber) | Not mentioned (V) | No notice on the homepage (V) | hello@ address and FAQ (V); no reuse policy | Patreon premium tier, 3 member videos a week (V) |
| 4 | **Story Learning Chinese with Annie** | No transcript program; one podcast episode is marked "transcript available" (V) | Not stated | Only via her italki profile (V) | italki tutor |
| 5 | **Tingting** (Comprehensible Chinese with Tingting) | Sold: hanzi PDFs per story on Patreon, $5 HSK packs (V) | Not stated | Patreon only (V) | Text materials are the product |
| 6 | **Mandarin Click** | No official transcripts. Hanzi and pinyin shown on screen (R); transcript packs on Ko-fi, seller unknown (R) | Unknown | No contact found | Possibly paid PDFs |
| 7 | **Xiaogua Chinese** (fluencyinchinese.com) | None found | Unknown | None found | Commercial coaching and courses (R) |
| 8 | **Chloe Chinese Class** | None found | Unknown | None found | Some videos are members-only (R) |
| 9 | **Slow & Clear Chinese** | None | Unknown | Creator is anonymous | Inactive (R) |
| 10 | **Alison Mandarin** | Creator not identified | Unknown | None found | Unknown |
| 11 | **Mandarin Corner** | Supporter-only "audio with transcript" (V) | "All Rights Reserved" (V) | Contact page only | Supporter membership, courses (V) |
| 12 | **Peppa Pig (Mandarin)** | No official channel confirmed (R) | Corporate IP | Corporate licensing only | Commercial franchise |

**Why they rank this way.** The request assumed is private, non-commercial, single-user use, with attribution and links back.

1. **Lazy Chinese** is the strongest candidate.
   - The transcripts already exist and are free, so the request only adds display in a private app.
   - There's a direct email, and it has the best A0–B1 catalog (six levels).
   - Ask about the free tier only; the premium videos are revenue.
2. **Diane Neubauer** would very likely agree, but she may have little text to give.
3. **BlaBla Chinese** is a small solo creator who earns from premium videos, not text.
4. **Annie** would likely be friendly, but she'd have to make the transcripts herself.
5. **Tingting** sells text, so a request for free reuse competes with her income.
6. **Mandarin Click, Xiaogua and Chloe** have no contact route, and the latter two have commercial incentives.
7. **Slow & Clear and Alison** have no reachable creator.
8. **Mandarin Corner** sells its transcripts as a paid perk and says "All Rights Reserved".
9. **Peppa Pig** is corporate IP.

**Adjacent finds:**
- **Storybooks Canada (UBC):** CC BY 4.0 per its footer, with Mandarin text and audio.
  - The Mandarin text may be Traditional, and the narrators are unchecked.
  - It could add voices beyond GS's single narrator.
- **Cozy Mandarin podcast:** free transcripts, but "All Right Reserved", and intermediate level, so a weak fit.

## Recommendations

### 1. Restructure lessons

**Merge thin ideas.** Coverage after merging is in `out/merges.md`:

| Merge | Audio now (sentences, voices) | CV candidates | Result |
|---|---|---|---|
| 1.1-a + b (是 / 叫 self-intro) | 3, 3 | 42 | yellow |
| 1.2-a + b (吗 and 你呢) | 4, 3 | 22 | yellow |
| 1.4a-a + b (这个 / 这些) | 8, 2 | 28 | yellow |
| 1.10a-a + b (会 / 能) | 14, 1 | 30 | yellow |
| 1.11-a + c + d (shopping: prices, 还是, ordering) | 2, 2 | 7 | yellow |
| 1.14-a + b (A-not-A and tags) | 3, 1 | 12 | yellow |
| 2.4-a + b + c (one 比 lesson) | 0, 0 | 21 | yellow |
| 2.5-b + 2.21-a (来/去) | 12, 2 | 101 | yellow |
| 2.12-a + b + c (how long) | 2, 1 | 13 | yellow |
| 2.18-b + c + d (又…又, 越来越, 越…越) | 2, 1 | 6 | yellow (thin) |
| 2.20-a + b (potential complements) | 1, 1 | 17 | yellow |
| 2.7-b + c (应该 / 得 děi) | 1, 1 | 16 | yellow |
| 2.26-b + c (particles, 不是…吗) | 9, 2 | 63 | yellow |
| 2.22-a + b + c (得 how well) | 1, 1 | 4 | **at threshold** |
| 2.24-a + b + d (把) | 2, 1 | 3 | **at threshold** |
| 2.13-b + c (的 clauses) | 2, 1 | 3 | **at threshold** |
| 2.27-b + c (给) | 2, 2 | 3 | **at threshold** |
| 2.29-c + d | 4, 2 | 3 | yellow (thin) |
| 2.3-a + c (一边 / 着 + verb) | 1, 1 | 2 | red |
| 2.5-a + d (existential / appearance) | 0, 0 | 1 | red |
| 2.17-a + b (从…到 / 离) | 1, 1 | 2 | red |
| 2.28-b + c (只要 / 只有) | 0, 0 | 3 | red |
| 2.10-d + 1.11-c (或者 / 还是) | 0, 0 | 2 | red |

**Then:**
- **Move the remaining reds to "mined"**, unless a permitted YouTube clip or a GS story can carry them. Doc 03 §1.8 already has this mechanism, with a Grammar Wiki deep link. The candidates:
  - 一边…一边 and 着 + verb
  - appearance sentences
  - 离
  - 只有…才
  - 或者 vs 还是

  2.5-a's "墙上挂着" is the kind of sentence a picture story supplies, so re-run the search once more Storybooks sources are added.
- **Count voices per unit, not per idea**, as activity-brainstorm §4 already does ("≥4 per contrast across a unit").
  - The "Pattern you do" still needs a new speaker for each item.
  - With CV's ~3 validated voices per sentence, a unit can rotate voices even where one idea has few sentences.
- **2.26 Real-speed speech:**
  - Make it conditional on a creator's permission (the Lazy Chinese podcast).
  - Otherwise, make it a watch-only Clip unit whose steps don't depend on the video's content, or move it to S3.
- **Clip-shaped ideas** (family photo, "where's the cat", market, travel story, cooking scene):
  - Anchor them on GS stories until a creator grants transcript permission for YouTube.
  - Rewrite the idea text so it doesn't promise a specific scene.

### 2. Source priority for the media ingester

1. **Common Voice zh-CN, full dataset (CC0).**
   - It is the only source whose voice count grows with the sentence pool, and every yellow depends on it.
   - It needs a one-time Mozilla Data Collective account. The user has created one, and the dataset is fetched by `sandbox/data/fetch_common_voice.py`.
   - Ingest the validated clips, and use `client_id` for distinct voices and for exposure tracking.
   - Prefer sentences of conversational and Sentence Collector origin. Admit Wikipedia-origin sentences only through an automated quality gate: the learner-fit filter, segmentation sanity, and no list or heading fragments.
   - The 602,622 "other" clips are a second pool, usable only after automated checking (agreement with local ASR).
2. **Global Storybooks** (CC BY or CC BY-NC per story).
   - Audio pre-split by page gives free alignment, and it is the only legitimate source of continuous narration today.
   - It anchors Clip lessons and read-alongs.
   - Record each story's license: CC BY-NC stories require the app to stay non-commercial.
   - Next, check Storybooks Canada and the other Global Storybooks portals for more Mandarin narrators.
3. **audio-cmn** (CC BY-SA) for word audio: about 91% of HSK 2025 L1–3, with 2 voices.
4. **Tatoeba, as text only.**
   - Use it for reading-only items and as the pool for mined sentences.
   - Its 84 licensed recordings are CC BY-NC and add 2 voices. Ingest them only once non-commercial use is confirmed (open decision 12).
5. **YouTube transcripts by permission**, starting with Lazy Chinese. Each grant unlocks Clip lessons, real-speed speech and many more voices.

### 3. Permission requests worth sending

The user sends these; nothing has been sent.

1. **Tatoeba: LeviHighway (4,066 cmn recordings) and fucongcong (1,675).**
   - Ask them to set a CC license (CC BY, or at least CC BY-NC) on their audio. Tatoeba supports a license per recorder, and the request goes through a Tatoeba message.
   - This is the single highest-yield request: 42 ideas turn green.
   - Caveat: doc 03 reports most of fucongcong's audio as Shanghainese. The 1,675 counted here are recordings of cmn sentences, but someone needs to listen to confirm they're Mandarin.
2. **Lazy Chinese (Suqing):** permission to show the free transcripts in a private app, with links back.
3. **Diane Neubauer**, then **BlaBla Chinese:** ask whether scripts exist for their beginner videos.
4. **Tone Perfect (MSU):** already planned for S0. It doesn't help S1–S2.

Not worth sending: Mandarin Corner, Peppa Pig, Xiaogua, Chloe, Slow & Clear, and Tingting (text is her product).

### 4. Curriculum scope

- **Keep S1 as it is, apart from the six S1 merges above.** With CV, 87% of it is coverable, and the rest merges cleanly.
- **Keep the HSK 1–3 grammar scope, but not S2's 111-lesson shape.**
  - The red forms (把, 得, 比, conditionals) are core HSK 2–3 grammar, so dropping them would break the v1 goal.
  - Instead, merge S2 into fewer, broader lessons; the merges above cut about 20 S2 lesson ideas. Then mine the remaining reds.
  - This also eases the S2 time overrun noted in doc 03 §1.8.
- **Open decision for the user:** may the S2 "we do" use **text-only (Tatoeba) reading items** for the thin forms?
  - S2 is the "read alongside audio" stage, and the I do and you do would still use native audio.
  - Doc 06 currently requires a clip for every example, so this would change that rule.
- **Update the README's "Biggest risks."** It says "Common Voice transcript search is the fallback for grammar examples," which overstates CV.
  - CV is the source of voices, not a deep source of sentences.
  - Tatoeba text is deep, but it has no licensed audio.

## Limitations

- Patterns are heuristics. Recall was not tested, and precision was checked on only 30 samples per source.
- CV voice counts per sentence are estimated from dataset-wide ratios. Pulling the dataset will settle them.
- The CV repo text was last exported in 2023. The 27.0 sentence pool is about 15% larger, and those extra sentences weren't searched.
- The learner-fit filter works on characters, not words, so it admits some odd sentences, such as Wikipedia fragments made of common characters.
- The channel survey couldn't open YouTube pages, so licenses and caption types per channel remain unverified.

## Files

| Path | Contents |
|---|---|
| `patterns.yaml` | The 158 lesson-idea patterns (review these) |
| `coverage.py` | The counter |
| `merges.py` | Coverage for the proposed merges |
| `out/lessons.csv` | Raw counts and status for each idea |
| `out/units.csv` | Per-unit rollup |
| `out/sources.csv` | Source totals |
| `out/words.csv` | audio-cmn word coverage |
| `out/words_missing_ac.txt` | HSK L1–3 words with no audio-cmn file |
| `out/samples.txt` | The 4 shortest matches per idea and source, for spot checks |
| `out/merges.md` | Merge results |
| `data/` | Downloaded exports (git-ignored) |
