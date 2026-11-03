# 03 · Mandarin curriculum & materials

_Researched 2026-11-02. Question: what order should a Refold-style beginner learn Mandarin in, what should the app's own core curriculum for months 0–6 look like, and which free native-speaker video/audio/text sources and open datasets can the app legally use?_

**What this doc designs for (from the user):**

- **Split:** about 25% in-app core curriculum (months 0–6), 25% in-app SRS, and 50% immersion outside the app (Netflix etc.; the app only logs it).
- **Time:** about **2 h on a normal day, in 5, 30 or 60 min chunks**. A lazy day is **15–20 min in bed on the phone**, screen on.
- **Constraints:** background or screen-off audio is **not** required, and YouTube embeds are fine.
- **Netflix plan:** English subtitles for a long while, then Mandarin subtitles.
- **Scope:** at this pace the in-app curriculum covers **Refold Phase 1 → early Phase 2** (in Refold's older naming, Stage 1 → early 2A) over about 6 months.

## TL;DR

- **The core curriculum is 42 themed units, about 140 doc-06 lessons, in three stages:**
  - S0 Sounds: 12 units, weeks 1–3.
  - S1 Survival core: 15 units, to ~300 words, Grammar Wiki A1.
  - S2 Base vocabulary: 15 units, to ~1,000 words, Grammar Wiki A2 core.

  Each lesson has one idea and a 5–7 min core. Lesson and activity types are left open for a separate doc, and output stays light (shadowing, single-word recall). Each unit names where every example's **native audio** comes from: YouTube timestamps, audio-cmn, Common Voice or Global Storybooks. Lessons and 5-min review batches stack into 15–20 min (lazy day), 30 min or 60 min sessions. The scope is Refold Phase 1 → early Phase 2 (§1.8).
- **Train tones by ear first.** High-variability training (many native voices, real words, two weeks) raised tone identification from about 69% to 90%, and the gains carried over to new voices [7]. Build the trainer from **native recordings with permissive licenses**: `hugolpz/audio-cmn` (CC BY-SA; 1,707 tonal syllables plus HSK word audio) and Wikimedia Commons. No TTS [29][30].
- **Use the 2025 HSK 3.0 syllabus as the word scaffold, not the 2021 standard.** Its cumulative targets are 300 / 500 / 1,000 / 2,000 words for L1–4. About 41% of shared words changed level between the two versions [3][4]. The `hsk30` package (MIT, Sept 2026) ships both [4].
- **Learn characters in context, with components on demand.** Introduce a component when it appears in a mined word, using Make Me a Hanzi decompositions and phonetic/semantic hints. Skip a Heisig-style course up front [9][37].
- **Most beginner video is free on YouTube and can be embedded:** Mandarin Click, Lazy Chinese, Slow & Clear Chinese, BlaBla Chinese, then Annie, Xiaogua and Mandarin Corner [10][11]. Embedding is fine, but downloading, caption scraping, background players and overlays on the player are not allowed [45][46][48]. **Sentence-card audio can be a clip of the embedded player** using `start`/`end` parameters [47].
- **Short-episode sources (5–10 min)** include Peppa Pig Mandarin (~5 min episodes), many Lazy Chinese and Mandarin Click stories, Global Storybooks read-alongs (1–3 min), and Netflix's *Flavorful Origins* [13][55]. The app should read each video's real duration from the YouTube Data API (1 quota unit per call) and filter to 5–10 min [49].
- **The only rehostable graded reader with human narration found is Global Storybooks Mandarin** (40 levelled stories, CC BY) [22][23]. Everything else is link-only.
- **Licensing red flag: Tatoeba's Mandarin sentence text can be reused, but most of its Mandarin audio can't.** The text is CC BY, but the largest Mandarin recorders chose no license [25][26]. Also gone or paywalled: slow-chinese.com (parked domain), Shtooka.net (redirects elsewhere), Forvo's CC license (dropped in 2019), Mandarin Corner and Melnyks transcripts, and Refold's own Mandarin 1K deck [16][17][19][31][54].
- **App data is all free:** CC-CEDICT (CC BY-SA 4.0, 125k entries), Hanzi Writer (MIT, with Arphic data), Make Me a Hanzi (LGPL / Arphic), `pinyin-pro` (MIT), and `Intl.Segmenter` for segmentation in the browser [34][37][38][41][43].
- **Netflix immersion (outside the app):** start with animation and documentaries (*Word Party*, *The Monkey King*, *Flavorful Origins*), then youth romances (*Take My Brother Away*, *A Love So Beautiful*, *Go Go Squid!*), then *Nothing But Thirty*, *Day and Night*, *The Untamed*. Catalogs vary by region [55][56][57][58].
- **Mandarin audio with English subtitles helps beginners follow the story, but it does little for hearing the sounds.** Research finds that native-language subtitles boost content comprehension at low levels. Target-language subtitles beat them for learning words and adapting to the speech, and in one study native subtitles actually *hurt* perceptual learning [60][61][62]. Keep English-subtitle Netflix as enjoyable "time in the language". Bridge with dual subtitles (Language Reactor, desktop Chrome only), Chinese-only subtitles on kids' shows, and re-watches. Switch a show to Chinese subtitles once a re-watch with them reaches about 60–80% comprehension (§2.7).

## Findings

### 1. Curriculum and learning order

#### 1.1 Refold framing

Refold's Mandarin guide says to learn tones by listening to real Mandarin rather than drilling tone charts. Characters come from meeting them repeatedly in content, on top of a base of high-frequency vocabulary. Refold's own "Mandarin 1K" deck is **paid** [1][54] (verified). The current roadmap has **Phases 0–7**: 0 Immersion Learning, 1 Foundations, 2 Comprehension ("read alongside audio"), 3 Listening, 4 Speaking, 5 Accuracy, 6 Fluency, 7 Beyond. It gives no hour or word counts [2] (verified). Refold's older roadmap named these stages 1 (Foundations), 2A (Intensive Immersion) and 2B, and pages under the old names still exist [2a]. **Mapping used here:** the in-app curriculum covers Phase 1 → early Phase 2, which in the old naming is Stage 1 → early 2A. Netflix immersion runs in parallel from day 1. See doc 01 for the method itself.

#### 1.2 Pinyin and tones: train perception early

- Mandarin has about 410 base syllables. Tone Perfect records all 410 in all four tones from six native speakers (3 female, 3 male) [8] (verified).
- **High-variability phonetic training (HVPT).** Wang, Spence, Jongman & Sereno (1999, JASA) gave American learners eight sessions over two weeks with natural words from several native talkers. Tone identification rose from about 69% to 90%. The gains held for new words (+18%) and new voices (+25%), and lasted six months [7]. (Abstract verified; the exact percentages come from secondary citations, so reported.)
- **Drill order:** single-syllable tone identification → the 20 two-syllable tone pairs (where 3-3 sandhi and the half-third tone appear) → minimal pairs. Use **many voices**. Self-assessment of tones is unreliable, so measure perception in-app [1] (reported).
- This fits Refold. A 5-minute daily perception drill is still learning by listening, just with feedback.

#### 1.3 Vocabulary scaffold: which HSK 3.0

There are now two "HSK 3.0" documents (verified via [3], cross-checked with [4][5]):

| Level | 2021 standard (GF0025-2021), cum. words / chars | **2025 syllabus** (15 Nov 2025), cum. words / recognition chars / handwriting chars |
|---|---|---|
| 1 | 500 / 300 | **300 / 246 / 0** |
| 2 | 1,272 / 600 | **500 / 371 / 100** |
| 3 | 2,245 / 900 | **1,000 / 655 / 250** |
| 4 | 3,245 / 1,200 | **2,000 / 1,096 / 400** |
| 5 | 4,316 / 1,500 | **3,600 / 1,527 / 550** |
| 6 | 5,456 / 1,800 | **5,400 / 1,940 / 700** |
| 7–9 | 11,092 / 3,000 | **11,000 / 3,088 / 1,200** |

- The 2025 syllabus took effect on 18 Nov 2025, and trial exams ran on 31 Jan and 20 Sep 2026. The first regular HSK 3.0 L1–6 sitting is reported for **13 Dec 2026** [3][5] (reported; not checked with CTI).
- `drkameleon/complete-hsk-vocabulary` (MIT) labels the **2021** levels as "new-1…new-7" [6] (verified). `hsk30` v0.2.1 (6 Sep 2026) includes the 2021 standard, **the 2025 syllabus (its default)** and HSK 2.0. Its lists were extracted from the official 406-page PDF and are MIT-licensed [4] (verified).
- HSK 2025 **grammar** lists per level are not in `hsk30`. The S1/S2 coverage checks used a community transcription [64], which still needs checking against the official PDF.
- HSK is the **coverage scaffold** and the skill-tree vocabulary. Within a level, order words by frequency (SUBTLEX-CH, §3) and by what the lesson's video actually uses.

#### 1.4 Characters: components, Heisig, or in context

| Approach | Pros | Cons for this app |
|---|---|---|
| Heisig / RSH (learn about 1,500+ characters with keyword mnemonics before reading) | Systematic shape recognition | Months with no input; English keywords rather than sounds; paid; conflicts with Refold |
| Component-first courses (Outlier; Mandarin Blueprint's "Hanzi Movie Method") | Use phonetic-semantic structure | Paid. MB has free intro levels behind an account [14] |
| **Learn in context, components on demand** | Every character is immediately useful; matches Refold | Needs component hints to keep look-alike characters apart |

Hacking Chinese suggests looking up a component once it recurs in about three contexts, starting with the ~100 most common components, and learning words built from characters you already know. It notes that about 90% of characters partly reflect their pronunciation [9] (verified). Make Me a Hanzi's `dictionary.txt` gives each of ~9,000 characters an IDS decomposition, a radical and an etymology entry (`pictophonetic` with `phonetic` and `semantic` parts) [37] (verified). That lets every word card show something like "口 (meaning) + 马 (sound) → 吗".

#### 1.5 Simplified vs traditional

Use simplified: HSK, mainland media and nearly every CI channel use it. Taiwan content uses traditional, and many Netflix dramas are Taiwanese with a Taiwanese accent [59] (reported). CC-CEDICT stores both scripts [34], and Make Me a Hanzi and Hanzi Writer cover both [37][38] (verified). **Default to simplified, store traditional, and offer a toggle.**

#### 1.6 When to start reading

Refold Phase 2 is "read alongside audio" [2]. In practice:

- Show Chinese subtitles with optional pinyin on CI videos from lesson 1.1.
- Start read-along stories around 300 words (end of S1).
- Fade pinyin per word once the SRS marks a word as known. A common learner complaint is that pinyin left on permanently blocks hanzi reading [51] (reported).

#### 1.7 Time budget

At about 2 h on a normal day, the split is ~30 min core + 30 min SRS + 60 min immersion. Allowing about 1 lazy day in 4 (15–20 min, mostly SRS), 6 months comes to roughly:

| | Hours over 6 months |
|---|---|
| Core | ~70–80 h |
| SRS | ~80 h |
| Immersion | ~150–170 h |
| **Total** | **~300–330 h** |

That supports a **~1,000-word** target (HSK 2025 L3, ~650 characters). It means about 6–8 new words a day after S0, and new cards are capped on lazy days. These are estimates; FSI rates Mandarin at about 2,200 class hours to professional level (reported).

Most of the immersion time will be English-subtitle Netflix (§2.7), so the in-app curriculum has to carry most of the *comprehensible* input. That is why each lesson is anchored on a CI video.

#### 1.8 The in-app core curriculum (months 0–6): unit lists

Lessons follow **doc 06**:

- one idea per lesson, with a 5–7 min core;
- native clip first;
- I do → we do → you do;
- every lesson emits SRS cards.

This section supplies doc 06 with *what* to teach, in *what order*, and *where each example's native audio comes from*. It doesn't redefine the lesson format.

**Terms used here:**

- A **lesson** is doc 06's atomic lesson (5–7 min core).
- A **unit** is 2–4 lessons that share one theme and one set of native videos.
- A **review batch** is a ~5 min SRS session, not a lesson.

**Lesson and activity types are deliberately not assigned here.** The variety matrix stays open until a separate research doc defines the lesson and activity types. The lists below give only each lesson's *idea* and its *native audio source*.

**Input before output (Phases 0–2).** Each lesson idea is phrased as something to *hear and notice*. Allowed output is light and scaffolded: shadowing a native clip, or recalling a single word or tone. No free production and no "rewrite it natively" tasks before Phase 4 (Refold; doc 01).

**Where native example audio comes from:** doc 06 has no TTS, so every example needs a clip. The usable sources, in order of preference:

| Code | Source | Good for | Limits |
|---|---|---|---|
| **YT:channel** | Timestamp span in an embeddable CI video (`start`/`end`) [47] | Example sentences in context; the lesson's "Hear it" clip | Link/embed only. Line timings are hand-curated, because most subs are burned in |
| **AC** | `hugolpz/audio-cmn`: 1,707 tonal syllables (Chen Wang) + ~8,600 HSK-2.0 words (Yue Tan), CC BY-SA [29] | Tone and sound perception practice; word audio for nearly all of the first 1,000 words | Single words only; two voices, so add more for HVPT |
| **CV** | Common Voice zh-CN, CC0, ~849k clips with transcripts [32] | Extra voices for drills; **pattern search** (grep transcripts for 比, 了, 因为…所以) to find a native sentence for any grammar point | Read, often written-style sentences; quality varies (inference). Use validated clips only |
| **GS** | Global Storybooks Mandarin narration, CC BY [22] | Read-along sentences, L1–L3 | 40 stories; one narrator per story |
| **WM** | Wikimedia Commons / Lingua Libre cmn files, CC BY-SA per file [30] | Extra syllable and word voices | Per-file license check |
| **TB** | Tatoeba cmn audio, **only the rows whose license is filled in** [25][26] | Occasional short sentences | **Scarce**: most cmn audio is unlicensed, and the largest licensed set found is CC BY-NC. Don't plan lessons around it |
| **TP** | Tone Perfect (410 syllables × 4 tones × 6 speakers) [8] | The ideal set for HVPT tone drills | Needs permission from MSU first |

Mandarin Bean, Chinese Reading Practice and Du Chinese are **link-only**, so their audio can't become card audio [15][21][24].

**Session recipes for the user's chunks:**

| Available time | Recipe |
|---|---|
| **5 min** | One lesson core, or one review batch. The app picks whichever is most overdue |
| **15–20 min (lazy day, in bed)** | 2 review batches + 1 tone-perception or clip-based lesson. No new grammar; new cards capped |
| **30 min** | One unit (2–4 lessons), or 2 review batches + 2 lessons |
| **60 min** | A unit + 3 review batches + the unit's **full CI video** (re-watched), or a Netflix episode logged as immersion |

**Time check (after the 2026-11-02 stage reviews):** 64 units (S0 14 · S1 18 · S2 32), about 200 lessons × ~6 min ≈ 20 h of lesson cores. The rest of the core budget is the units' full CI videos and read-alongs, watched and re-watched. That keeps the curriculum input-heavy, as doc 06 asks. S2 alone fills the ~30 min/day core slot with no slack, so S2 may run 2–4 weeks past month 6. Testing out of most of S0 gives back about 2–3 weeks.

Grammar names are Chinese Grammar Wiki A1/A2 titles [28] (verified list). Picking specific videos, timestamps and CV clips is a build task (§4.1). §2.6 lists which sources cut up best.

**Stage S0: Sounds (weeks 1–3, 14 units ≈ 34 lessons; Refold Phase 1 / old Stage 1).** S0 trains *perception* only: hearing tones, sounds and tone changes, and matching them to the pinyin shown under clips. Production accuracy waits for Phase 4.
- **Test-out first.** This user already knows the tones and pinyin. The expected path is to take the three 0.12 checkpoint lessons first, then study only the units they flag. Each checkpoint item is tagged with one unit (note below the table).
- **Input balance.** S0 units are nearly all language-focused study (doc 07). So every S0 day also gets two things: (a) a scheduled 10–15 min Clip lesson of picture-supported CI (Mandarin Click, Lazy Chinese Complete Beginner, Slow & Clear), which counts as immersion even without full understanding; (b) the tone trainer as a 5–10 min HVPT drill outside lessons. Sound units never replace that day's CI.
- **Two tracks.** The **tone** track (0.1 → 0.7 → 0.8 → 0.9, 0.9a, 0.10) and the **segment** track (0.2 → 0.3 → 0.4 → 0.5 → 0.6) don't depend on each other. They meet at 0.10 (erhua) and 0.10a. Table order is the default path; Prereqs lists unit ids.

| Unit | Lesson ideas (one per lesson) | Prereqs | Native example audio |
|---|---|---|---|
| 0.1 Tones on one syllable | The four tone contours on one syllable, across several voices; 1st vs 4th (high level vs high falling); 2nd vs 3rd (a rise vs a low, often creaky 3rd, not a big dip) | — | AC syllables; WM "Zh-pinyin tones with ma.ogg"; CV for more voices; TP if permitted |
| 0.2 Simple and compound finals | a o e i u against their English look-alikes (*e* is not "eh"); ü vs u vs i; compound finals: glides and diphthongs (ai ei ao ou; ia ie ua uo üe …) | — | AC; WM Lingua Libre cmn |
| 0.3 Initials and aspiration | Hear the puff: b d g are unaspirated, not voiced (English ears hear *b* as *p*); b/p d/t g/k rounds, plus h (rougher than English *h*) | 0.2 | AC; WM |
| 0.4 Three "sh" families (+ r) | zh ch sh r vs z c s (curled vs flat; some accents merge them); j q x vs zh ch sh before *i*: "why isn't *xi* 'shee'?"; interleaved rounds across all nine | 0.2, 0.3 | AC; CV (more voices) |
| 0.5 Nasal finals | -n vs -ng: an/ang, en/eng, in/ing (some accents merge in/ing); with glides: ian ("yen") vs iang, uan vs üan, un vs ong | 0.2 | AC |
| 0.6 Pinyin spelling rules | Spellings that hide a vowel: ü written *u* after j q x y (去 is spelled *qu* but sounds *qü*), iu = iou, ui = uei, un = uen; the buzzing "-i" after z c s / zh ch sh r is not the *i* of *ji*; the apostrophe marks a syllable break you can hear (西安 *Xī'ān*, two tones, vs 先 *xiān*) | 0.2, 0.4, 0.5 | AC; WM |
| 0.7 Tone pairs I (1+x, 2+x) | 1st + each full tone (4 pairs); 2nd + each full tone (4 pairs) | 0.1 | AC 2-syllable HSK words (Yue Tan) |
| 0.8 Tone pairs II (3+1/2/4, 4+x) | The half-third: a 3rd before 1/2/4 stays low and doesn't rise (3 pairs); 4th + each full tone (4 pairs). 3+3 is in 0.9 | 0.7 | AC; CV |
| 0.9 Third-tone sandhi | Two 3rds in a row: the first rises (你好 sounds like *ní hǎo*); chains of three or more 3rds group by word (我也很好) | 0.8 | AC (你好 很好 可以); CV (sentences with 3rd-tone chains); YT:Lazy Chinese greeting clip |
| 0.9a 一 and 不 | 不 becomes *bú* before a 4th (不是, 不对); 一 becomes *yí* before a 4th and *yì* before 1/2/3, but stays *yī* in counting and ordinals (一个, 一起, 第一) | 0.8 | AC (不是 一个) |
| 0.10 Neutral tone and erhua | A neutral syllable takes its pitch from the tone before it (the 4 "tone + neutral" pairs: 爸爸, 你们, 吗); some words differ only by a neutral tone (东西 *dōngxī* "east-west" vs *dōngxi* "thing"); erhua: the -r merges into the syllable and can swallow -n (哪儿, 一点儿), and is heavier in Beijing speech | 0.5, 0.8 | AC; YT:Lazy Chinese / Mandarin Click |
| 0.10a Tones in running speech | At natural speed tones get shorter, flatter and blend with neighbors: the same words in citation form vs in a story; intonation rides on top of tones: a 吗 question doesn't need a rising end, and a final 4th still falls | 0.9, 0.9a, 0.10 | YT:Mandarin Click (story; moved from 0.7); CV (statement vs 吗 question) |
| 0.11 Sounds in first words | Hearing S0's contrasts inside real words (the words themselves are taught in S1 1.1/1.4); near-homophones told apart by tone and initial (四 *sì* vs 十 *shí* vs 是 *shì*) | 0.4, 0.10a | YT:Mandarin Click / Lazy Chinese Complete Beginner; AC |
| 0.12 Checkpoint | Three checkpoints, each takeable alone: **segments** (finals, initials, spelling); **tones** (single syllables + the 15 plain pairs); **tone changes and words** (sandhi, 一/不, neutral, erhua, running speech, near-homophones). Each ≥85% identification, unscaffolded, **new voices** | 0.1–0.11 (all; not gated) | CV (unseen speakers); TP if permitted |

**Test-out map (0.12 → units).** Each checkpoint item is tagged with exactly one unit: segments → 0.2–0.6; tones → 0.1 (single syllables), 0.7 or 0.8 (pairs, by first tone); tone changes and words → 0.9, 0.9a, 0.10, 0.10a, 0.11. A unit scoring below 85% is recommended, and passed units get `checkpoint` evidence on their knowledge items (doc 08 F1). The 20 tone pairs are each covered once: 8 in 0.7, 7 in 0.8, 3+3 in 0.9, and the 4 "tone + neutral" pairs in 0.10.

**Stage S1: Survival core (weeks 3–10, 18 units ≈ 56 lessons; → ~300 words = HSK 2025 L1, ~250 chars, first ~100 components; Phase 1 / old Stage 1).** S1 owns the *words* (greetings, numbers); 0.11 keeps only their sound contrasts. Table order is the default path; Prereqs lists direct prerequisite unit ids (transitive ones implied).

| Unit | Lesson ideas (Grammar Wiki A1 + HSK 2025 L1) | Prereqs | Native example audio |
|---|---|---|---|
| 1.1 Greetings and names | 是 links two nouns (我是学生), heard in self-introductions; names with 叫 (我叫…) | 0.9, 0.11 | YT:Lazy Chinese Complete Beginner, Slow & Clear; AC words |
| 1.2 Asking questions | 吗 turns a statement into a yes/no question; "你呢?" asks the same question back; the question word sits where the answer goes (你叫什么? 他是谁?) | 1.1, 0.10a | YT:Mandarin Click dialogues; CV (sentences ending in 吗; 什么/谁 questions are plentiful) |
| 1.3 Describing | Noun + 很 + adj, where 很 doesn't mean "very" (❌我是高 → ✅我很高); 不 before a verb or adjective negates it (不是, 不高); 非常 / 真 / 有点儿 set how strong the adjective is | 1.1, 0.9a | YT:BlaBla super-beginner; CV |
| 1.4 Numbers and age | Structure of numbers (十一 … 九十九); measure word 个 between number and noun (几个?); 两, not 二, before a measure word; age with 岁 (几岁? 多大?) | 1.2, 0.9a, 0.11 | YT:Mandarin Click; GS L1 counting story; AC number words |
| 1.4a This, that, which | 这 / 那 / 哪 + measure word + noun (这个, 那本书, 哪个?); 这些 / 那些 take no measure word; everyday measure words heard with their nouns (本 书, 杯 茶, 口 人, 件 衣服, 只 猫) | 1.4 | YT:Mandarin Click; GS L1; CV (这个/那个 sentences) |
| 1.5 Family | Possession with 的; 我妈妈 vs 我的妈妈 (close possession drops 的); 有 for "have", negated only as 没有 (❌不有), heard in a family-photo talk | 1.1, 1.3 | YT:Lazy Chinese family stories, Diane Neubauer; GS |
| 1.6 Asking how | 怎么 + verb asks how to do it (怎么说? 怎么去?); 怎么样 asks how something is, or "how about…?" | 1.2, 1.3 | YT:Slow & Clear; YT:Mandarin Click; CV |
| 1.7 Where things are | Thing + 在 + place says where it is, asked with 在哪儿? (哪儿 is "where", while 哪 needs a measure word; 这儿 / 那儿); place words after a noun (桌子上, 房间里, 前边, 后边, 外边); place + 有 + thing vs thing + 在 + place, heard in a "where's the cat?" picture story | 1.4a, 1.5 | YT:Mandarin Click; GS L1 |
| 1.8 Dates and times | Dates big to small (年 → 月 → 号; 四/十/是 stay review items from 0.11, interleaved here); days of the week (星期一 … 星期天); clock time (点, 分, 半; 现在几点?) | 1.4 | YT:BlaBla; AC; CV |
| 1.9 Daily verbs, word order | Basic order subject + verb + object, heard in a daily-life story; 去 + place (no "to"), and 去 + place + verb for a purpose (去商店买东西); time words come before the verb (我明天去北京); 在 + place comes before the verb too (我在家吃饭) | 1.7, 1.8 | YT:Lazy Chinese daily-life stories |
| 1.10 Wanting | 想 + verb: "would like to"; 要 + noun or verb: "want", and also "going to" | 1.9 | YT:Annie A1 picture talks; CV |
| 1.10a Can | 会: a learned skill (会说中文); 能: able, or possible; 可以: allowed, answered with 行 / 不行; 会 vs 能 vs 可以, once all three are met | 1.10 | YT:Annie A1 picture talks; CV (会/能/可以 sentences) |
| 1.11 Food and shopping | Prices: 多少钱? and amounts (三块五; 多少 for any amount vs 几 for a small count); 太…了 (太贵了!); A 还是 B? offers a choice and takes no 吗; an ordering scene at a market, heard as a clip | 1.3, 1.4a, 1.10 | YT:Mandarin Click food stories; YT:Peppa Pig (official channel, if confirmed) |
| 1.12 Also, all, and | 也 goes before the verb, never at the end; 都 sums up a plural subject (and 也都, not 都也); 还 adds one more thing ("…，还…"); 和 joins nouns, not clauses | 1.9 | YT:Slow & Clear; CV |
| 1.13 Didn't, don't, let's | 没(有) + verb: it didn't happen; 不 vs 没 (first pass, both now met); 吧 softens a suggestion (我们走吧); 不要 + verb: "don't!" | 1.3, 1.5, 1.10 | YT:Lazy Chinese; YT:Peppa; CV (不要 commands) |
| 1.14 Asking whether | A-not-A questions (是不是, 有没有, 好不好), with the neutral 不 in the middle; tag questions that check or propose (…好吗? …对不对? 你是老师吧?) | 1.13, 0.9a, 0.10 | YT:Mandarin Click |
| 1.14a Now and changed (first pass) | Sentence-final 了: something is new (下雨了, 我饿了); verb + 了: it's done, noticed in stories; 在 / 正在 + verb (…呢): it's happening now | 1.9, 1.13 | YT:Lazy Chinese daily-life stories; YT:Annie; CV (了 and 在…呢 sentences) |
| 1.15 Checkpoint | 3 unseen Mandarin Click stories with gist questions; new-voice tone and word rounds; GS L1–2 read-along | 1.1–1.14a (all; not gated) | YT:Mandarin Click; CV; GS |

**S1 coverage note.** S1 covers all 40 Grammar Wiki A1 points (行 sits in the 可以 lesson; 要 "going to" in 1.10) and most HSK 2025 L1 grammar. Left to mined sentences or S2: 再 "again", preposition 对, ordinal 第, double objects (给你一本书), verb + 一次 / 一下. Confusable pairs (二/两, 在/有, 不/没, 哪/哪儿, 几/多少, 怎么/怎么样, 会/能/可以) are contrasted only after both members are met. They are interleaved later per doc 07, with second passes in S2.

**Stage S2: Base vocabulary (months 3–6, 32 units ≈ 111 lessons; → ~1,000 words = HSK 2025 L3, ~650 chars; early Phase 2, "read alongside audio" / old early 2A).** S2 finishes v1's HSK 1–3 grammar. The first half, up to the 2.30 midpoint checkpoint, covers aspect, time and description. The second half covers comparison, complements, and 把/被. Table order is the default path. Prereqs lists direct prerequisite unit ids (transitive ones are implied), and every S2 unit also assumes S1. Ids are stable labels, not positions (doc 08 F3): new units are numbered 2.16–2.32 and placed where the dependency graph puts them.

| Unit | Lesson ideas (Grammar Wiki A2 + HSK 2025 L2–L3) | Prereqs | Native example audio |
|---|---|---|---|
| 2.1 What happened (了 second pass) | Verb + 了: a finished action, often with an amount (买了三本书); 没 + verb with 了 dropped, and 了吗? answered 没有 | 1.14a, 1.13 | YT:Lazy Chinese beginner, Annie; CV (了 sentences are plentiful) |
| 2.16 Things changed | Sentence-final 了, second pass: "now it's…" (我二十岁了, 天黑了); 不…了: not any more; 快/要/就要…了: about to happen (快…了 isn't "fast", moved from 2.12); verb-了 vs sentence-了, told apart in one story | 2.1 | YT:Lazy Chinese stories; CV (sentence-final 了, 快…了) |
| 2.2 Experiences | Verb + 过: have ever done it; 没 + verb + 过: have never done it; 了 vs 过; a travel story told with 过 | 2.1 | YT:Xiaogua travel; CV (过 sentences) |
| 2.3 At once and ongoing | 一边…一边: two actions at once; verb + 着: a state that holds (穿着, 开着, 坐着); verb + 着 + verb: doing one while doing another (笑着说, 走着去); 着 (state) vs 在 (action in progress, from 1.14a) | 1.14a | YT:Mandarin Click; CV (着 sentences) |
| 2.8 Results | Verb + 完: finished; verb + 到 / 见: reached or perceived (找到, 看见, 听到); 没 + verb + result: it didn't come off (没听懂, 没找到); result complements in a story | 2.1 | YT:Mandarin Click; CV |
| 2.7 Should, must, want, will | 要 vs 想 (both met in 1.10); 应该: should; 得 *děi*: have to; 会 "will" (a prediction) vs 会 "can" (1.10a) | 1.10a | YT:Annie; CV (得 *děi* sentences) |
| 2.11 Asking and telling | Verb + 一下 and doubled verbs (看看) make an action brief and soft; 请 + verb: polite asking; 别 + verb: don't (like 不要), and 别…了: stop it; 请 / 叫 / 让 + person + verb: ask, tell or let someone do it | 1.13, 2.16 | YT:Mandarin Click; YT:Peppa (别 commands); CV (让我… sentences) |
| 2.27 To, for, with someone | 跟 + person (+ 一起) + verb: with someone ("together", from 2.14); 给 + person + thing: two objects (送他一本书); 给 + person + verb: for or to someone (给我打电话); 对 + person: towards (他对我很好) | 1.12 | YT:Mandarin Click; CV (给/跟/对 sentences) |
| 2.9 Counting things | Measure words beyond S1's, grouped by shape (张 flat, 条 long, 双 pairs, 位 polite); 一些 vs 有的 / 有些: some; 每 + MW + 都: every | 1.4a | YT:Peppa; GS. Mandarin Bean is reading only (link), so it can't supply card audio |
| 2.13 Describing with 的 | Adjective + 的 + noun (好朋友 vs 很好的朋友); phrase + 的 + noun (我昨天买的书); 的 with the noun dropped (红的, 我买的, 卖菜的); spotting long 的 descriptions in narration | 1.5 | GS L3; CV |
| 2.6 Time order | Event + 以前 / 以后: before and after; clause + 的时候: when (its 的 is already met in 2.13); 已经…了: already; 刚 + verb: it only just happened | 2.13, 2.16 | YT:Lazy Chinese stories; CV |
| 2.19 Early, late | 一…就: as soon as; 才: later or harder than expected; 就 vs 才 | 2.6 | YT:Lazy Chinese stories; CV (一…就, 才 sentences) |
| 2.5 Where and which way | Place + verb + 着 + thing: what's there (墙上挂着一张画); 来 vs 去 depends on the speaker; 在 after a verb (住在, 放在, 坐在); place + 来了 / 走了 + someone: who arrived or left (家里来了一个客人) | 1.7, 2.1, 2.3 | GS L2–3; YT:Mandarin Click |
| 2.17 Getting around | 从 A 到 B: from…to; A 离 B + 远/近: distance; 坐/骑/开 + vehicle + verb: how you go ("in a row", from 2.14, purpose order is in 1.9) | 2.5 | YT:Mandarin Click; GS L2–3; CV |
| 2.30 Midpoint checkpoint | Unseen clips with gist questions (new voices); interleaved confusables: 了/过, 着/在, 就/才, 要/想, 会 "will"/"can" | all units above (not gated) | YT:Mandarin Click, Lazy Chinese (unseen); CV (unseen speakers) |
| 2.4 Comparing | A 比 B + adj, with 更 or 还 but never 很; A 没有 B (那么) + adj: the usual negative, not 不比; 比 + by how much (一点儿, 多了, 大三岁); A 跟 B 一样 (+ adj) | 1.3, 1.5 | YT:BlaBla intermediate; CV (比 sentences) |
| 2.18 More and more, a bit too | 有点儿 + adj (a bit too, from 1.3) vs adj + 一点儿 (a bit more, from 2.4); 又…又: both; 越来越: more and more; 越…越: the more…, the more… | 2.4, 2.16 | CV (越来越 is easy to search); YT:Annie |
| 2.14 Big and rough numbers | Counting in 万 (four-digit groups); roughly: 几 "several", 十多 / 十几, 两三, 左右; 半 before vs after the measure word (半个小时 vs 一个半小时) | 1.4, 1.8 | YT:Mandarin Click; AC number words; CV (万 sentences) |
| 2.10 Linking clauses | 因为…所以; 虽然…但是/可是 (但是 and 可是 both mean "but"); 不但…而且: not only…but also; 或者 for "or" in statements, where 还是 asks (1.11) | 1.11 | YT:Xiaogua; **CV** (CRP texts have no usable audio) |
| 2.12 How long | Duration after the verb (学了两年), asked with 多久 / 多长时间; double 了: it's still going (学了两年了); split verbs: 了, 过 and durations go inside (见过面, 睡了八个小时的觉) | 2.2, 2.16 | YT:Lazy Chinese; CV |
| 2.31 How often, again | Verb + 次 / 遍: how many times (去过三次); 再 + verb: again, still to come (再说一遍); 又: again, already happened (他又迟到了); 又 vs 再 | 2.2, 2.16 | YT:Lazy Chinese; CV (再/又 sentences) |
| 2.21 Direction after the verb | Verb + 来/去: toward or away from the speaker (拿来, 回去); verb + 上/下/进/出/回/过/起 (走进, 拿出, 坐下); compounds (进来, 出去, 回来, 站起来); non-spatial uses: 看起来 "seems", 想起来 "recall", 说下去 "keep going" | 2.5, 2.8 | YT:Peppa; YT:Mandarin Click; CV (起来/下去 sentences) |
| 2.22 How well: 得 | Verb + 得 + adj: how an action goes (跑得很快); with an object, the verb repeats or the object comes first (他说中文说得很好 / 他中文说得很好); comparing how well (他跑得比我快) | 2.4 | YT:BlaBla; CV (得 sentences) |
| 2.32 How: 地 and doubled adjectives | Doubled adjectives (高高的, 干干净净); adjective + 地 before a verb (慢慢地走); 的 vs 地 vs 得: one sound, told apart by position | 2.13, 2.22 | GS L3; CV |
| 2.20 Can or can't | Verb + 不 + result or direction: can't (听不懂, 看不见, 进不去, with 听不懂 moved from 2.8); verb + 得 + result: can (听得懂吗?), unlike 2.22's "how well" 得 | 2.8, 2.21, 2.22 | YT:Mandarin Click; CV (听不懂/看不见 sentences) |
| 2.23 When, where, how it happened | 是…的 picks out when, where or how a past event happened (你是怎么来的?); 是…的 vs 了 | 2.1, 2.6, 2.17 | YT:Lazy Chinese; CV (是…的 sentences) |
| 2.28 If and only if | 如果…就 and …的话: if; 只要…就: as long as; 只有…才: only if; 只要 vs 只有 | 2.10, 2.19 | YT:Xiaogua; CV (如果, 只要 sentences) |
| 2.29 Everything and nothing | 什么 / 谁 / 哪儿 + 都/也 (+ 不): everything, nothing, nobody (我什么都不知道); 一 + MW + 也/都 + 不/没, and 一点儿也不: not a single one; question words meaning "some-" (想吃点儿什么); 除了…以外: 还/也 "besides" vs 都 "except" | 1.2, 1.4a, 1.12 | YT:Lazy Chinese; CV (什么都, 除了 sentences) |
| 2.24 Doing it to something: 把 | 把 + thing + verb + 在/到 + place (把书放在桌上); 把 + thing + verb + result or direction (把门关上, 把饭吃完); 把 in instructions, heard in a cooking or tidying scene; the thing first without 把 (作业写完了) | 2.5, 2.8, 2.21 | YT:Peppa; YT:Mandarin Click; CV (把 sentences) |
| 2.25 Happening to you: 被 | 被 (+ doer) + verb + result, often bad news (钱包被偷了); 把 vs 被: who acts on whom | 2.24 | CV (被 sentences); YT:Lazy Chinese stories |
| 2.26 Real-speed speech | Fillers (那个, 就是, 然后) heard in natural speech; sentence-final 啊 / 呢 / 吧 and the tone they add; 不是…吗?: a question that's really a reminder; first real-speed interview clip (moved from 2.14) | 1.2, 1.13 | YT:Mandarin Corner beginner (one question = one clip) |
| 2.15 Checkpoint | Peppa episode with zh subs only and gist questions; GS L3 without pinyin; unseen Mandarin Corner clip; interleaved confusables: 的/地/得, the two 得s (how well vs can), 得 *de*/*děi*, 把/被, 是…的/了, 还是/或者, 有点儿/一点儿, 只要/只有 | all S2 units (not gated) | YT:Peppa, YT:Mandarin Corner; GS; CV |

**S2 coverage note.** Together with S1, the lessons cover about 75 of the 99 Grammar Wiki A2 points and nearly all HSK 2025 L2–L3 sentence patterns, complements and two-part frames. The grammar lists used are the 2025 syllabus's L1–L4 grammar outlines as transcribed in `krmanik/HSK-3.0` ("New HSK (2025)/HSK Grammar"; checked 2026-11-02, not yet against the official PDF).

- **Inclusion rule.** A point gets a lesson if it is in the L1–L3 grammar list and either (a) changes how a sentence parses (word order, a particle, a complement, a two-part frame) or (b) forms a confusable pair.
- **Mined points.** Points whose meaning a gloss carries are taught from mined sentences ("this card uses 一直") with a Grammar Wiki deep link [28]. These include single adverbs, conjunctions and prepositions (一直, 总是, 只, 最, 差不多, 往, 为了, 刚才, 第), plus small frames (先…再/然后, 该…了, 都…了, 还是…吧, 一会儿…一会儿, adj + 得很 / 极了, 不比, X什么 "why on earth X").
- **Removed as beyond L3.** The 2025 syllabus puts these at L4, so they were removed from lessons and are now mined only: 要是, verb + 不了 / 得了, 从来, 死了, 不如, and 让/叫 as passive markers.

**S2 size note.** S2 grew from 15 units ≈ 60 lessons to 32 units ≈ 111, so that v1 actually completes HSK 1–3. 2.14 was retitled, and 2.16–2.32 are new. Over ~13 weeks this works out to ~1.2 lessons a day (~11 h of lesson cores) plus each unit's full CI video (~30 h). That is ~28 min a day, which fills the 30 min core slot from §1.7 with no slack. If it overruns, S2 runs 2–4 weeks past month 6; time freed by testing out of S0 offsets part of that. The bigger cost is clip curation for 17 more units.

Every lesson emits cards (doc 06): its target words with AC audio, its 1–3 example sentences with their YT/CV/GS clip as the audio, and tone pairs for tone-perception lessons.

**Content-production risk:** grammar points that rarely come up in beginner CI videos (二 vs 两 contrasts, 把/被, 是…的, appearance sentences) will lean on **CV transcript search** for native examples. Budget curation time for finding and validating those clips.

The curriculum ends here (≈ early Phase 2). After S2, the app's role shifts to SRS, mining and immersion logging, plus optional "bridge" units.

**Stages after month 6 (for the skill tree only):** S3 Bridge (→ 2,000 words, A2 remainder + B1, Mandarin Corner / Shenglan / podcasts; ~500–800 h cumulative) and S4 Native (3,600+ words, dramas with Chinese subs; 1,000 h+).

### 2. Free native-speaker content

Legend: **E** = embed (YouTube IFrame), **L** = link out, **R** = may download and rehost behind login, with attribution. Subtitles: zh = hanzi, py = pinyin, en = English. **Burned-in** subtitles are part of the video image and can't be extracted. **5–10?** marks fit for a bedtime session: ✔ = many episodes in range; ~ = mixed or clip-able; ✖ = mostly longer.

#### 2.1 Video: CI and learner channels (YouTube, native-speaker teachers)

Both community lists [10][11] (Hacking Chinese, updated into 2026; Discover Discomfort) agree closely. Refold recommends Mandarin Click, Lazy Chinese and Tingting Comprehensible Chinese [1].

| Source | Level | Notes | Free / terms | Use | 5–10? |
|---|---|---|---|---|---|
| **Mandarin Click** (Slow Chinese Stories) | A0→B1 | Short slow picture stories, HSK playlists; zh/py/en support on many [11][12] (reported) | Free | E | ✔ short stories (reported) |
| **Lazy Chinese** (formerly Bumpy / Comprehensible Chinese) | A0→B1 | Chinese-only TPRS; levels from Complete Beginner to Advanced on lazychinese.com [10][13] | Free on YouTube/podcast; paid area on site [13] | E | ✔/~ videos logged at 2–11 min; podcast episodes 8–33 min [13] (reported) |
| **Slow & Clear Chinese** | A0 | No English; props and images [10] (reported) | Free | E | ~ |
| **BlaBla Chinese** | A0→B1 | Super-beginner, beginner and intermediate playlists [10][11] | Free | E | ~ |
| **Diane Neubauer 杜雁子** | A0→A1 | Comprehension-based lessons and early reading [10] | Free | E | ~ |
| Jun – Stickynote Chinese | A0 | **Embedding disabled** [10] | Free | L | — |
| **Story Learning Chinese with Annie** | A1→B1 | Stories, picture talks, games; suits 20–30 min sessions [11] | Free | E (clip) | ✖ (clip with start/end) |
| **Xiaogua Chinese** | A2→B1 | Large levelled library [11] | Free | E | ~ |
| Alison Mandarin | A1→A2 | Normal and slow versions, with characters + py [10] | Free | E | ~ |
| Chloe Chinese Class | A2→B1 | Slow version, then natural version; some videos members-only [11] | Freemium | E | ~ |
| **Mandarin Corner** | A2→C1 | Interviews and conversations; zh+py+en burned in [12] | Videos free. **Transcripts, downloads and "Language Reactor-ready" videos are supporter-only**; "All Rights Reserved" [16] (verified) | E | ✖ (clip) |
| Shenglan; Dashu Mandarin (Ben); 大鹏说中文 | B1+ | Video podcasts [10][11][20] | Free | E | ✖ |
| Mandarin Blueprint (free tier) | A0 | Pronunciation and free training in MB Lite; **account required** [14] (verified) | Free with signup | L | — |
| English-medium explainers (Grace Mandarin Chinese, Chinese Zero to Hero, Yoyo, Litao) | — | Grammar and pinyin explained in English [10][12] | Free | E (optional S0 support) | ✔ many short |

#### 2.2 Video: kids' shows and native TV on YouTube

- **小猪佩奇 Peppa Pig (Mandarin dub).** Episodes are about **5 min** [55] (reported). There is reportedly an official Chinese YouTube channel posting marathons **without CC** [18] (reported; couldn't verify by fetch). Strong visual context. Suits S1–S2. **E**, and a ✔ for bedtime sessions.
- **大耳朵图图 Big Ear Tutu** and **喜羊羊与灰太狼 Pleasant Goat**: originally Chinese cartoons, recommended for HSK 1–2 [55] (reported). Use official uploads only.
- **Bluey, 巧虎, BabyBus**: no official Mandarin YouTube source was confirmed.
- **Dramas.** iQIYI, MangoTV, WeTV and Croton post some full episodes with burned-in zh+en subs. Availability is patchy and region-locked [53][55] (reported). Level S4.
- **Bilibili** can be embedded via `player.bilibili.com/player.html?bvid=…`, but there are no official docs, quality is reportedly capped, and embeds are reportedly flaky [50]. Use as a fallback only.

#### 2.3 Audio: podcasts

Podcasts are optional, since screen-off audio isn't required. They are useful as immersion time outside the app.

| Podcast | Level | Status / terms | Use |
|---|---|---|---|
| **Lazy Chinese podcast** | A1→B1 | Active Jan–Feb 2026; 8–33 min episodes [13] (reported) | L (RSS) |
| Dashu Mandarin (李璨理查 BEN) | B1+ | EP193 on 21 Mar 2026 [20] (reported) | L |
| Learn Taiwanese Mandarin With Ben | B1 (Taiwan) | Recent feed [20] | L |
| Melnyks Chinese | A1→A2 (English-heavy lessons) | **Transcripts are premium** [19] | L |
| Slow Chinese (Mei) | A2→B1 | **Inactive since ~Aug 2023**; scripts for members only [17] | Skip |
| slow-chinese.com (original 慢速中文) | — | **Domain parked** (verified 2026-11-02) | Gone |

#### 2.4 Text: graded readers and reference

| Source | Level | Audio | Terms | Use | 5–10? |
|---|---|---|---|---|---|
| **Global Storybooks Mandarin** | 40 stories (L1 15, L2 11, L3 8, L4 4, L5 2) | **Human narration** ("Read by: Zhuo Sun") | **CC BY 3.0/4.0** text; audio CC BY or CC BY-NC per story [22][23] (verified) | **R** | ✔ (1–3 min stories, estimate) |
| **Mandarin Bean** | HSK 1–6+ | Teacher audio, pinyin, simplified/traditional | "All graded reading lessons are free" [24] (verified) | L | ✔ |
| **Chinese Reading Practice** | Newbie→Advanced | Not stated | Free, 245 lessons, new posts on weekdays (latest 18 Sep 2026); © reserved [21] (verified) | L | ✔ |
| Du Chinese | HSK 1–6 | Native audio | Limited free lessons; $14.99/mo [15] (verified) | L | ✔ |
| The Chairman's Bao | HSK news | Yes | Mostly paywalled (reported) | Skip | — |
| Mandarin Companion | Graded novels | Paid | Paid [54] | Skip | — |
| **Chinese Grammar Wiki** (AllSet) | A1 40, A2 99, B1 143, B2 154, C1 69 points | — | **CC BY-NC-SA 3.0**; link to the wiki on every page or view; no ad-revenue sites [27] (verified) | L + short NC excerpts | ✔ |

#### 2.5 Word and sentence audio

| Source | License | Verdict |
|---|---|---|
| **hugolpz/audio-cmn** (ex-Shtooka): 1,707 syllables (Chen Wang) + ~8,596 HSK-2.0 word files (Yue Tan) | **CC BY-SA** [29] (verified; nativeness not stated) | **R**. Backbone for S0 and word audio for most of the first 1,000 words |
| **Wikimedia Commons** (Mandarin pronunciation, Lingua Libre cmn, Shtooka cmn, Tones of Standard Chinese) | Per file, usually CC BY-SA [30] | **R** after a per-file check |
| **Tatoeba** sentences (89,361 cmn) | CC BY 2.0 FR (some CC0) [25][26] (verified) | **R** for text |
| Tatoeba **audio** (5,826 cmn recordings) | **Per recording.** LeviHighway (4,066) and fucongcong (4,165, mostly Shanghainese) have **no license** and can't be reused. GlossaMatik (69) is CC BY-NC 4.0 [26] (verified) | **Mostly unusable.** Filter the export by its `License` column |
| **Common Voice zh-CN 23.0**: ~1,090 h (238 h validated), 7,476 speakers | **CC0**; don't attempt to identify speakers; hosted on Mozilla Data Collective, account needed [32] (reported) | **R**. Use for "hear it in more voices" |
| AISHELL-1 / THCHS-30 | Apache 2.0, but AISHELL also says "free for academic use" [33] | Ambiguous; avoid |
| Tone Perfect (MSU): 410 syllables × 4 tones × 6 speakers | **No explicit license**; request form [8] | Ask permission; ideal for HVPT |
| Forvo | CC dropped in 2019; paid API [31] (reported) | Skip |
| Shtooka.net | Redirects to an unrelated site (verified 2026-11-02) | Gone; data survives in audio-cmn and Commons |

#### 2.6 Short sessions and how well each source cuts into lesson-sized clips

A source **chops well** when a 1–3 min segment makes sense on its own: a self-contained scene, a story beat, one interview question, or one book page. It chops badly when meaning builds up over a long monologue, or when there's no visual support.

| Source | Whole episode fits 5–10 min? | Cuts into 1–3 min clips? | Why |
|---|---|---|---|
| **Mandarin Click** (Slow Stories) | ✔ often | ✔✔ | Picture-driven story beats; each scene is self-explanatory [11] |
| **Lazy Chinese** | ✔ shorter videos (2–11 min logged) | ✔✔ | TPRS repetition; each repeated mini-story cycle is a natural clip [13] |
| **Slow & Clear / BlaBla / Diane Neubauer** | ~ | ✔ | Prop- and gesture-led segments, one item or action at a time [10] |
| **Peppa Pig (Mandarin)** | ✔ ~5 min [55] | ✔ | Short scenes with strong visuals; but no CC, so line timings must be hand-made [18] |
| **Global Storybooks** | ✔ (1–3 min stories) | ✔✔ (page = one clip) | Rehostable, so per-sentence timing is possible [22] |
| **Mandarin Bean / CRP** | ✔ | ✔ (paragraph) | Short texts; link out [21][24] |
| **Story Learning with Annie** | ✖ (20–30 min) | ✔ | Picture talks and games break at topic changes [11] |
| **Xiaogua / Chloe** | ~ | ~ | Topic videos; better at S2 |
| **Mandarin Corner** (interviews) | ✖ | ✔✔ (one question = one clip) | Street interviews are question-by-question; burned-in zh/py/en [12] |
| Podcasts (Lazy Chinese, Dashu) | ✖ (8–33 min+) | ✖ | No visuals, no transcripts. Use as whole 30–60 min immersion blocks |
| Netflix titles | ✖ | n/a (not embedded) | Logged only; *Flavorful Origins* (~12 min) and kids' titles suit short slots |

Clip mechanics: IFrame `start`/`end` play a span. `playsinline=1` keeps iOS from forcing fullscreen [47] (verified). Store per-clip line timings in the app's own data (§4.1).

#### 2.7 Immersion outside the app (Netflix and similar): suggestions list, ordered by difficulty

The app **only logs time** for these (title, minutes, subtitle mode) and doesn't embed them. Netflix catalogs **vary by region and change often**, so treat every title below as "check availability" [57][56]. Many Netflix Chinese titles are Taiwanese, with a Taiwanese accent and traditional subtitles [59] (reported).

| Order | Title | Service (reported) | Why / level | Episode length |
|---|---|---|---|---|
| 1 | **Peppa Pig (Mandarin dub)**, **Big Ear Tutu**, **Pleasant Goat** | YouTube official uploads / Chinese platforms [55] | Kids' speech with full visual support; HSK 1–2 | ~5–12 min ✔ |
| 2 | **Word Party** (Mandarin audio) | Netflix [57] | Children's animation, "simpler Chinese than adult programmes" | Short ✔ |
| 3 | **The Monkey King** (2023, animated) | Netflix [58] | Classic tale, straightforward language, strong visuals; check the Mandarin audio track | Film |
| 4 | **Flavorful Origins** (潮汕/云南 food documentary) | Netflix [57] | Narrated documentary, food vocabulary | ~12 min ✔ (reported) |
| 5 | **Take My Brother Away** (快把我哥带走) | Netflix [57][58] | Clear mainland Mandarin, everyday teen comedy; beginner-friendly | ~20–25 min |
| 6 | **A Love So Beautiful** (致我们单纯的小美好), **Put Your Head on My Shoulder**, **Go Go Squid!** | Netflix / Viki / WeTV (region) [56][58] | School and youth romances with clear speech; listed as beginner / HSK 1–3 | ~30–45 min |
| 7 | **Meteor Garden** (2018), **Find Yourself** | Netflix [57] | Long-running romances; lots of repeated vocabulary | ~45 min |
| 8 | **Home With Kids** (家有儿女), **iPartment** (爱情公寓), **My Own Swordsman** (武林外传) | YouTube official / iQIYI [55][56] | Sitcoms with casual dialogue; HSK 3–4 | ~25–45 min |
| 9 | **Nothing But Thirty** (三十而已), **Ode to Joy** | Netflix (region) / iQIYI [55][56] | Modern adult life in Shanghai; intermediate | ~45 min |
| 10 | **Day and Night** (白夜追凶), **Tientsin Mystic** | Netflix [57] | Crime/detective; Beijing accent in *Day and Night* | ~45 min |
| 11 | **The Untamed** (陈情令), **Once Upon a Time in Lingjian Mountain** | Netflix [56][57] | Xianxia/wuxia; semi-classical vocabulary; intermediate→advanced | ~45 min |
| 12 | **Nirvana in Fire** (琅琊榜), **The Long Night**, **Bad Kids** | Viki / YouTube / iQIYI (region) [1][56] | Formal, literary or legal language; advanced (Refold's example "engaging" show) | ~45 min |

Other services: **Viki** (community subtitles, freemium), **iQIYI international** (English subs, some premium), **WeTV** (free with ads), and **Bilibili** (best once you can read) [55] (reported). Note that Netflix's *3 Body Problem* is in English; the Chinese adaptation is Tencent's *三体* [55].

**Mandarin audio with English subtitles: what the evidence says**

The user's plan is a long period of Mandarin audio with English subtitles, then a switch to Mandarin subtitles.

- **Benefit: comprehension and engagement.** With beginners, native-language (L1) subtitles gave significantly better *content comprehension* than target-language captions. Prior vocabulary knowledge strongly predicted how much learners got from captions [62] (verified abstract, Pujadas & Muñoz). English subtitles keep a beginner watching real shows for an hour, which matters for habit and for absorbing prosody, rhythm and high-frequency chunks like 什么, 没事, 走吧.
- **Limit 1: weak for ear training.** Mitterer & McQueen (2009) had Dutch listeners watch unfamiliar English accents. *Target-language subtitles helped* them adapt to the accent. *Native-language subtitles harmed* it, compared with no subtitles. The authors' explanation is that L1 subtitles draw attention away from the speech and compete with it lexically, while L2 subtitles show which words are being said [60] (verified). For a Mandarin beginner, English subtitles mostly train reading English.
- **Limit 2: less word learning.** Montero Perez et al.'s meta-analysis found **large** effects of *captions* (same-language subtitles) on both listening comprehension and vocabulary, with no moderation by proficiency [61] (verified abstract). Comparisons with L1 subtitles generally favor captions for learning forms (reported).
- **Mandarin-specific caveat.** Hanzi captions only help once the viewer can read fast enough. Before ~300–500 known words, Chinese subtitles on adult dramas are mostly unreadable noise. Kids' shows and CI videos are where Chinese subtitles pay off first (inference).
- **CI community view.** Refold-style advice treats English-subtitle watching as low-value but harmless "free-flow" time: fine for motivation, not a substitute for comprehensible input. Its guidance for beginners is to prefer subtitles that *match* the audio [63] (reported). The in-app curriculum (Chinese subtitles on CI) covers what English-subtitle Netflix doesn't.

**Intermediate steps (from easiest to most demanding)**

1. **English subtitles, but listen actively for known words.** In the 2–3 min after each episode, note 3 words you *heard* (not read) and log them.
2. **Chinese-only subtitles on kids' shows and CI** (Peppa, the app's CI clips) while adult dramas stay on English. This keeps reading Chinese subtitles easy enough to succeed.
3. **Dual subtitles (zh + en) with Language Reactor.** It adds dual subtitles, pinyin, click-to-look-up and auto-pause on Netflix and YouTube. Pro (~$5/mo) adds full machine translation and Anki export [51] (reported). It is a **desktop Chrome extension, so it doesn't work in the Netflix phone app**; use it for laptop sessions (reported). Migaku is similar [52][56].
4. **Re-watch with Chinese subtitles.** Watch an episode first with English, then again with Chinese subtitles, or with Chinese first and English second. The first viewing supplies the meaning, so the second becomes comprehensible input [55] (reported).
5. **Chinese-only subtitles on the easiest adult show** (*Take My Brother Away*, *A Love So Beautiful*), with English kept for harder ones.

**Practical signal for switching a show to Chinese subtitles.** Treat this as a heuristic, not a research threshold. Switch when **two of these three** hold:

- (a) S1 is complete (~300 words) and the tone checkpoint is passed.
- (b) On a **re-watch with Chinese subtitles only**, you can follow the plot and get about **60–80%** of lines. This matches one guide's target for Chinese-only subtitles [55] (reported).
- (c) With English subtitles on, you regularly understand short lines (好的, 怎么了, 我不知道) **before** your eyes reach the English.

Switch per show, starting with the easiest. Expect it around months 3–5 for the youth romances at this time budget (estimate).

**Other tips**

- Set **audio to Mandarin** first, then subtitles [59].
- Watch twice (once for fun, once for language), and don't look up every word [55].

### 3. Open data for building the app

| Dataset | What | License | Notes |
|---|---|---|---|
| **CC-CEDICT** | 125,356 entries (release 2026-11-02), trad + simp + pinyin + English | **CC BY-SA 4.0** [34] (verified) | Credit it. Share alike only if we publish changes to the data |
| **hsk30** | HSK 2.0 / 2021 / 2025 lists | MIT (+ CC BY 4.0 corpus) [4] | Default to 2025 |
| complete-hsk-vocabulary | 2.0 + **2021** levels, glosses, radicals | MIT (glosses come from CC-CEDICT, so BY-SA) [6] | — |
| **SUBTLEX-CH** | Word/character frequency from film subtitles (33.5M words) | "Freely available for research purposes" [35] | Internal ranking only; don't redistribute |
| BCC (BLCU) | 15-billion-character corpus frequency | No notice found [36] (reported) | Secondary signal |
| **Make Me a Hanzi** | ~9,000 chars: strokes, IDS, etymology, radical | dictionary LGPL-3.0+; graphics **Arphic PL** [37] (verified) | Ship the license texts |
| **Hanzi Writer** v3.5 | Stroke animation + quiz | MIT; data Arphic PL [38] (verified) | Can self-host the data |
| CJKVI IDS | Decompositions for all of CJK | CHISE terms / **GPLv2** [39] | Copyleft; isolate it |
| cjk-decomp | ~75k decompositions | Choice of Apache-2.0 / MIT / CC BY-SA … [40] | Archived 2018 |

### 4. Tooling ideas

#### 4.1 YouTube: embed, durations, subtitles

- **Embed:** IFrame player with `cc_load_policy=1&cc_lang_pref=zh` shows YouTube's own Chinese track. `start`/`end` cut clip lessons and card audio. `playsinline=1` keeps iOS playback inline [47] (verified).
- **Policy limits:** don't download, cache, separate audio, run background or hidden players, or modify or obscure the player [45][46] (verified). Render the app's subtitles and word pop-ups **below** the player.
- **Durations and metadata:** `videos.list` costs **1 quota unit** [49] (verified). The duration field (`contentDetails.duration`) is reported, not checked. Use it to tag each catalog video and filter to 5–10 min.
- **Captions:** `captions.download` and `captions.list` need OAuth **and edit rights on the video** [48] (verified). Scraping timed text breaks the ToS [45]. Transcript options:
  1. creator permission (ask the CI channels; Mandarin Corner sells transcripts [16]);
  2. user-pasted SRT, kept per user;
  3. hand-curated line timings for the clips in the 42 lessons (feasible at this scale);
  4. ASR or forced alignment on audio we're allowed to hold (Global Storybooks).

#### 4.2 Segmentation and pinyin

- `Intl.Segmenter` with word granularity: Baseline since April 2024, runs client-side [41] (verified availability; Chinese quality reported).
- jieba (MIT) for batch or server-side segmentation [42].
- **pinyin-pro** (MIT): handles polyphones (睡着了 → shuì zháo le), has a `segment` API, ~135 KB gzipped [43] (verified).
- pypinyin (MIT) [44].
- Let users correct polyphone readings (了, 长, 行).

#### 4.3 Feature inspiration (not integrations)

- **Language Reactor:** auto-pause per subtitle line, a line list beside the video, one-key replay [51].
- **Migaku:** a comprehension "% known" score on each item; one-tap card creation [52].
- **Du Chinese:** karaoke-style sentence highlighting and a pinyin toggle [15] (reported). Fits the Global Storybooks read-alongs.
- **Pleco:** a decomposition tree on the lookup pop-up (reported).
- **Hack Chinese:** "next N words of HSK level X by frequency" (reported).

## Implications for the app

**MUST**

- MUST implement the S0 → S1 → S2 unit lists (§1.8) as doc-06 lessons (one idea, 5–7 min core, emits cards; lesson and activity types come from the separate types doc) that work on a phone with the screen on. Progress saves at every lesson boundary and mid-lesson (doc 06).
- MUST record a **native audio source for every example** (YT span, AC, CV, GS, WM, or licensed TB) as lesson data, and block a lesson from shipping while any example lacks one (doc 06). Common Voice transcript search is the fallback for grammar examples.
- MUST offer a **"what can I do in N minutes?"** entry point (5 / 15–20 / 30 / 60) that assembles lessons and review batches by the recipes in §1.8. A lazy-day mode is review-first and caps new cards.
- MUST scope the in-app curriculum to **Refold Phase 1 → early Phase 2** (≈1,000 words). After that, the app runs on SRS, mining and immersion logging.
- MUST keep YouTube content as **IFrame embeds**: no downloads, caching, audio extraction, background or hidden players, or caption scraping. Draw subtitles and word pop-ups outside the player frame [45][46][48].
- MUST use native-speaker recordings (audio-cmn, Commons, Common Voice; Tone Perfect if permitted) for S0 and word audio. No TTS.
- MUST tag vocabulary with **HSK 2025 levels** (from `hsk30`), with the 2021 level as an optional secondary field [4].
- MUST keep a **license record per media item and per data file** (license, attribution, source URL, rehost y/n, NC flag), and show attribution where the item appears. This covers CC BY, CC BY-SA and the Grammar Wiki's link-on-every-view rule [27][34].
- MUST exclude Tatoeba audio with an empty license, and must not present Tatoeba audio as reusable by default [25].
- MUST ship the CC-CEDICT, LGPL and Arphic license texts with the bundled data [34][37][38].

**SHOULD**

- SHOULD include an **HVPT tone trainer** (identification → tone pairs → minimal pairs, ≥4 voices, accuracy per tone pair) as a daily 5 min drill and the S0 gate [7].
- SHOULD support **clip lessons and clip-audio sentence cards** via `start`/`end`, with `playsinline=1` on iOS [47].
- SHOULD store each catalog video's **duration** (from `videos.list`) and offer a "5–10 min" filter for bedtime sessions [49].
- SHOULD show components and phonetic/semantic hints on every word card, introducing each component on its first appearance [9][37].
- SHOULD rehost Global Storybooks Mandarin as the first read-along reader, with sentence highlighting [22].
- SHOULD include an **immersion log** for outside watching: title (from the §2.7 list or free text), minutes, and **subtitle mode (en / dual / zh / none)**, plus an optional "3 words I heard" field. It counts toward the 50% immersion share and the skill-tree hours, and lets the app show the en → zh subtitle shift over time.
- SHOULD prompt a **subtitle-switch check** once S1 is complete. Suggest a Chinese-subtitle re-watch of one logged episode, and ask "did you follow ~60–80%?" (§2.7).
- SHOULD store per-clip line timings and transcripts as app data (hand-curated for the ~42 lessons), since most CI videos have burned-in or missing soft subtitles.
- SHOULD segment with `Intl.Segmenter` plus CC-CEDICT, and generate pinyin with `pinyin-pro` [41][43].
- SHOULD fade pinyin per word as the SRS marks it known.
- SHOULD default to simplified, with a traditional toggle.

**COULD**

- COULD request Tone Perfect from MSU [8].
- COULD accept user-pasted SRT files for personal sentence mining from YouTube.
- COULD ask Lazy Chinese, Mandarin Click and Slow & Clear for permission to use their transcripts.
- COULD add Common Voice clips for "more voices" on a word [32].
- COULD add Hanzi Writer stroke quizzes (HSK 2025 requires 0 handwritten characters at L1 and 100 at L2) [3][38].
- COULD show a "% known words" badge per video and story [52].

## Open questions

1. **Commercial use, ever?** If yes, drop the non-commercial sources: Grammar Wiki excerpts, any CC BY-NC stories or audio, and SUBTLEX-CH's "research purposes" data. *User decision.*
2. **Pace check.** §1.7 assumes about 2 h on normal days and about 1 lazy day in 4. If lazy days dominate, the 1,000-word target for month 6 should drop to about 500 (HSK 2025 L2). This is worth re-checking after month 2. *User input.*
3. **Simplified only, or traditional too?** This depends on whether the user is aiming at the mainland or Taiwan, and the Netflix catalog skews Taiwanese. *User decision.*
4. **Who picks the specific videos and clip timestamps for each lesson?** It's a one-off curation task of about 42 videos and ~150 clips. Do it during the build or as a separate session?
5. **Netflix titles by region.** None of the listed titles were checked against the user's country catalog.
6. **Official Peppa Pig / Bluey / 巧虎 Mandarin YouTube channels.** These need checking in a browser.
7. **Tone Perfect permission**, and the **exact HSK 3.0 exam date** (reported as 13 Dec 2026).
8. **How many Tatoeba cmn recordings are actually CC BY?** That needs the `sentences_with_audio` export to be downloaded and filtered, which wasn't done.
9. **Doc 06 lists Tatoeba as an example-audio source.** Given §2.5, plan on YouTube spans, Common Voice and audio-cmn instead, and treat Tatoeba audio as a bonus only. Someone should update doc 06 to match (this doc doesn't edit it).
10. **Lesson and activity types.** The user has left these to a separate research doc. When they are defined, map them onto the §1.8 lesson ideas, keeping Phases 0–2 input-first (shadowing and single-word recall only).

## Recommended starter pack (first 3 months, in order)

| # | When | Source | Why |
|---|---|---|---|
| 1 | Week 1 → | **In-app tone trainer** on audio-cmn syllables + Commons cmn files | Best-evidenced early intervention; rehostable native audio [7][29][30] |
| 2 | Week 1 | **Mandarin Click: Slow Chinese Stories** (embed) | Short picture stories understandable from zero [11][12] |
| 3 | Week 1 | **Lazy Chinese: Complete Beginner** (embed) | Chinese-only TPRS; many short videos; Refold-recommended [1][13] |
| 4 | Week 2 | **Slow & Clear Chinese** + **BlaBla Chinese** (embed) | More A0 voices, so learners don't overfit to one teacher [10] |
| 5 | Week 3 | **Hanzi layer**: CC-CEDICT + Make Me a Hanzi + audio-cmn word audio | Lookups, component hints and native audio for every S1 word [29][34][37] |
| 6 | Week 3 | **Chinese Grammar Wiki A1** (deep links per lesson) | The grammar spine of S1 [27][28] |
| 7 | Week 5 | **Global Storybooks Mandarin L1–L2** (rehosted read-along) | First reading-while-listening; CC BY with human narration [22] |
| 8 | Week 6 | **Peppa Pig Mandarin** (embed, if the official channel checks out) | ~5 min native episodes; ideal lazy-day clip lesson [18][55] |
| 9 | Week 7 | **Mandarin Bean HSK 1–2** (link) | Free graded texts with teacher audio [24] |
| 10 | Week 8 | **Story Learning Chinese with Annie** + **Xiaogua Chinese** (clip lessons) | Longer A1–A2 input [10][11] |
| 11 | Week 9 | **Netflix: Word Party → Flavorful Origins** (logged, outside the app) | First native-production immersion with short episodes [57] |
| 12 | Week 10 | **Chinese Reading Practice: Newbie** (link) | 245 free short texts [21] |
| 13 | Week 12 | **Mandarin Corner: beginner playlists** (clip lessons) + Grammar Wiki A2 | Natural-speed, multi-speaker input with zh/py/en subs; starts S2 [16][28] |

## Sources

1. Refold, "How to Learn Mandarin" – https://refold.la/how-to-learn-mandarin/ – tone and character stance; recommended CI channels; Nirvana in Fire example.
2. Refold Roadmap – https://refold.la/roadmap/ – Phase 0–7 structure.
2a. Refold, "2A: Intensive Immersion" (older roadmap naming) – https://refold.la/?p=53358
3. Wikipedia, "Hanyu Shuiping Kaoshi" – https://en.wikipedia.org/wiki/Hanyu_Shuiping_Kaoshi – 2021 vs 2025 HSK 3.0 tables and dates.
4. `hsk30` (PyPI) – https://pypi.org/project/hsk30/ – 2021/2025/2.0 lists; MIT + CC BY 4.0; v0.2.1 (Sep 2026).
5. HSK Lord, "HSK 3.0 changes 2026" – https://hsklord.com/blog/hsk-3-0-changes-2026 – reported first sitting on 13 Dec 2026.
6. drkameleon/complete-hsk-vocabulary – https://github.com/drkameleon/complete-hsk-vocabulary – MIT; 2021-based "new" levels.
7. Wang, Spence, Jongman & Sereno (1999), JASA 106:3649 – https://kuscholarworks.ku.edu/entities/publication/499786a0-dec8-4422-aaf9-68909b608369 – HVPT tone training.
8. Tone Perfect (MSU) – https://tone.lib.msu.edu/ , https://tone.lib.msu.edu/cite – dataset scope; request form; no explicit license.
9. Hacking Chinese, "How to learn Chinese characters" – https://www.hackingchinese.com/how-to-learn-chinese-characters/ – components, learning in context.
10. Hacking Chinese, "The best YouTube channels for learning Chinese" – https://www.hackingchinese.com/the-best-youtube-channels-for-learning-chinese/ – levelled channel list; embed-disabled note.
11. Discover Discomfort, "YouTube channels for comprehensible Mandarin" – https://discoverdiscomfort.com/?p=18549 – levelled list, order, session lengths.
12. HSK Lord, "Best Chinese YouTube channels (2026)" – https://hsklord.com/blog/best-chinese-youtube-channels – Mandarin Corner dual subs; English-medium channels.
13. Lazy Chinese – https://www.lazychinese.com/ ; HC resource – https://challenges.hackingchinese.com/resources/stories/530-lazy-chinese-youtube-slash-podcast ; podcast – https://www.podbean.com/itunes/1610476816 ; listening-challenge log (video durations) – https://challenges.hackingchinese.com/challenges/133-chinese-listening-challenge-february-2025/participations/6153
14. Mandarin Blueprint free resources – https://intercom.help/mandarin-blueprint/en/articles/9041117-mandarin-blueprint-s-free-resources
15. Du Chinese pricing – https://www.duchinese.net/pricing
16. Mandarin Corner – https://www.mandarincorner.org/ , https://www.mandarincorner.org/free-resources/ – supporter-only transcripts; All Rights Reserved.
17. Slow Chinese (Mei), Pocket Casts – https://pocketcasts.com/podcasts/0a3d7d50-7e55-0139-34ab-0acc26574db2 ; slow-chinese.com parked (observed 2026-11-02).
18. Reed College Lang Lab blog – https://blogs.reed.edu/langlabbies/?p=1959 – official Peppa Pig Chinese channel, no CC.
19. Melnyks Chinese – https://www.podengine.ai/podcasts/learn-mandarin-chinese-chinese-audio-lessons – premium transcripts.
20. Dashu Mandarin Podcast – https://apx-security-us.audible.com/podcast/Dashu-Mandarin-Podcast/B09VRYMLKD ; Learn Taiwanese Mandarin With Ben – https://podcasts.apple.com/us/podcast/id1867086235
21. Chinese Reading Practice – https://chinesereadingpractice.com/
22. Global Storybooks Mandarin – https://global-asp.github.io/storybooks-minnesota/stories/zh/ ; story 0087 – https://global-asp.github.io/storybooks-minnesota/stories/zh/0087
23. global-asp/gasp-audio – https://github.com/global-asp/gasp-audio – audio CC BY / CC BY-NC.
24. Mandarin Bean – https://mandarinbean.com/
25. Tatoeba downloads – https://tatoeba.org/en/downloads – text licenses; per-recording audio licenses.
26. Tatoeba stats – https://tatoeba.org/en/stats/sentences_by_language ; recorders – https://tatoeba.org/en/audio/of/LeviHighway , https://tatoeba.org/en/audio/of/fucongcong , https://tatoeba.org/en/audio/of/GlossaMatik
27. Chinese Grammar Wiki – https://resources.allsetlearning.com/chinese/grammar/ ; Copyrights – https://resources.allsetlearning.com/chinese/grammar/Chinese_Grammar_Wiki:Copyrights
28. Grammar Wiki A1 – https://resources.allsetlearning.com/chinese/grammar/A1_grammar_points ; A2 – https://resources.allsetlearning.com/chinese/grammar/A2_grammar_points
29. hugolpz/audio-cmn – https://github.com/hugolpz/audio-cmn
30. Wikimedia Commons: Mandarin pronunciation – https://commons.wikimedia.org/wiki/Category:Mandarin_pronunciation ; Tones of Standard Chinese – https://commons.wikimedia.org/wiki/Category:Tones_of_Standard_Chinese ; Shtooka.net redirect observed 2026-11-02.
31. Wikipedia, "Forvo" – https://en.wikipedia.org/wiki/Forvo
32. Mozilla Data Collective, Common Voice 23.0 zh-CN – https://mozilladatacollective.com/datasets/cmflnuzw8fvgv2vdgt6f52qvh
33. OpenSLR AISHELL-1 – https://www.openslr.org/33/ ; THCHS-30 – https://www.openslr.org/18/
34. MDBG CC-CEDICT – https://www.mdbg.net/chinese/dictionary?page=cc-cedict
35. Cai & Brysbaert (2010), SUBTLEX-CH – https://pmc.ncbi.nlm.nih.gov/articles/PMC2880003/ ; https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch
36. Chinese-forums, BCC frequency list – https://chinese-forums.com/forums/topic/56677-word-frequency-list-based-on-a-15-billion-character-corpus-bcc-blcu-chinese-corpus
37. Make Me a Hanzi – https://github.com/skishore/makemeahanzi (README + COPYING)
38. Hanzi Writer – https://github.com/chanind/hanzi-writer ; https://hanziwriter.org/docs.html
39. cjkvi/cjkvi-ids – https://github.com/cjkvi/cjkvi-ids
40. amake/cjk-decomp – https://github.com/amake/cjk-decomp
41. MDN, Intl.Segmenter – https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter
42. fxsjy/jieba – https://github.com/fxsjy/jieba
43. zh-lx/pinyin-pro – https://github.com/zh-lx/pinyin-pro
44. mozillazg/python-pinyin – https://github.com/mozillazg/python-pinyin
45. YouTube Terms of Service – https://www.youtube.com/static?template=terms
46. YouTube API Services Developer Policies – https://developers.google.com/youtube/terms/developer-policies
47. YouTube embedded player parameters – https://developers.google.com/youtube/player_parameters
48. YouTube Data API captions.download / captions.list – https://developers.google.com/youtube/v3/docs/captions/download , https://developers.google.com/youtube/v3/docs/captions/list
49. YouTube Data API videos.list – https://developers.google.com/youtube/v3/docs/videos/list – 1 quota unit.
50. Bilibili embed – https://github.com/zeffon/bilibili-embed-renderer ; https://meta.discourse.org/t/discourse-embed-bilibili-discourse/282491
51. Language Reactor reviews and forum – https://siktengmsikgong.substack.com/p/web-tools-every-chinese-learner-needs ; https://forum.languagelearningwithnetflix.com/t/feature-suggestion-chinese-subtitles-pinyin-no-pinyin-option/6131
52. Migaku, Learn Chinese – https://migaku.com/learn-chinese
53. MyDramaList, Chinese dramas on YouTube with English subs – https://nl.mydramalist.com/article/chinese-romance-dramas-available-on-youtube-with-english-subs
54. Mandarin Companion – https://mandarincompanion.com/ ; Refold Mandarin 1K deck (paid) – https://www.refold.la/decks/buy/fundamental-vocabulary-to-learn-mandarin
55. HSK Lord, "Chinese TV shows for learning (2026)" – https://hsklord.com/blog/chinese-tv-shows-learning – shows by level, platforms, subtitle progression, Peppa ~5 min.
56. Migaku, "Best Chinese TV shows for Mandarin learners (2026)" – https://migaku.com/blog/chinese/best-chinese-shows-for-language-learners
57. StoryLearning, "15 best Chinese shows on Netflix" – https://storylearning.com/learn/chinese/chinese-tips/chinese-shows-on-netflix
58. Preply, Chinese dramas and movies on Netflix – https://preply.com/en/blog/chinese-dramas-and-movies-on-netflix ; Kaiwa – https://trykaiwa.com/blog/chinese-best-movies-tv-shows-learning
59. ChineseClass101, "Best shows on Netflix for Chinese learners" – https://www.chineseclass101.com/lesson/fun-easy-chinese-2-best-shows-on-netflix-for-chinese-learners – Taiwanese accent note; set audio first.
60. Mitterer & McQueen (2009), "Foreign subtitles help but native-language subtitles harm foreign speech perception", PLoS ONE – https://pmc.ncbi.nlm.nih.gov/articles/PMC2775720 ; MPG press release – https://www.mpg.de/593363/foreign-subtitles-improve-speech-perception
61. Montero Perez, Van Den Noortgate & Desmet (2013), "Captioned video for L2 listening and vocabulary learning: a meta-analysis", System 41(3) – https://doi.org/10.1016/j.system.2013.07.013 (abstract via https://core.ac.uk/download/84321351.pdf) – large caption effects on listening and vocabulary.
62. Pujadas & Muñoz (2020), "Examining adolescent EFL learners' TV viewing comprehension through captions and subtitles", SSLA – https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/examining-adolescent-efl-learners-tv-viewing-comprehension-through-captions-and-subtitles/66353C0F8CC7F65B0DFE7570C48678A2 ; Pujadas & Muñoz (2019), Language Learning Journal 47(4) – https://diposit.ub.edu/items/148ce458-937c-4473-9385-8294f6d3e4fd/full – L1 subtitles better for beginner comprehension; vocabulary predicts caption benefit.
63. r/Refold, "Complete beginner help" thread – https://reddit.birdcat.cafe/r/Refold/comments/1jqzugm/complete_beginner_help – community advice on native-language subtitles as a starting point (reported); Refold guidance to prefer matching subtitles for beginners (reported via search summary).
64. krmanik/HSK-3.0, "New HSK (2025)/HSK Grammar/HSK 1–3.txt" – https://github.com/krmanik/HSK-3.0 – community transcription of the 2025 syllabus grammar lists, used for the S1/S2 coverage checks (reported; not checked against the official PDF)
