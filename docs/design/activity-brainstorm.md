# Activity and interactable brainstorm

**Status:** a design brainstorm, written 2026-11-02. **Mostly not decided.** §4 (the lesson arc, rotating openers and practice formats, and skills in the SRS) was revised and adopted on 2026-11-03; see the README synthesis. It turns doc 07's activity types (T1–T18) and lesson shapes into concrete widgets (the "interactables"). Its scope is mostly the I do and the we do. It contains no technical planning; another doc covers that.

**Inputs:** [07 Activity types](../research/07-activity-types.md) (the evidence and T-codes), [06 Lesson design](../research/06-lesson-design.md) (the skeleton), [03 §1.8](../research/03-mandarin-curriculum-and-materials.md) (the lesson ideas), and vue-crash-course `CURRICULUM.md` §2 (how the user likes demos to feel).

---

## TL;DR

- **A small kit, rotated deliberately (§4).** About 24 interactables are listed below, but a normal lesson uses 4–6 of them. Every lesson runs one arc: opener, lesson (the I do), examples (the we do), and practice (the you do). Openers and practice formats rotate through fixed repertoires, for motivation while the habit forms; a new format is introduced once, in one line. The practice format is also what the skill's SRS card reviews.
- **I do widgets ask nothing of the learner.** This copies vue-crash-course's rule that playgrounds "ask nothing of the reader". The I do is for exploring: replay, switch voice, loop, reveal. All checking happens in the we do and you do.
- **Every we do widget must make the deciding cue the thing you process.** This is transfer-appropriate processing [07 §2]. A 不/没 item is answerable only if you heard 不 or 没. A tone item is answerable only from the tone.
- **One fixed phone layout:** the player sits at the top and the response pad in the bottom 40% of the screen. One **↺ again** button stays in the same thumb spot in every widget. No dragging, no pinching, no typing by default.
- **Wrong-answer feedback is a contrast, not a red X.** It plays what you picked, then what it was, from the same voice, and names the cue in one line. Right answers get a tick and auto-advance.
- **Often a plain clip and one sentence beat any widget.** That is true for the explanation, for affective particles (吧, 呢), for erhua, and for fluency re-listens. This doc says so wherever it applies.

---

## 1. Interactables catalog

### 1.0 Layout rules that apply to every widget

- **Player top, thumb bottom.** The YouTube embed or the audio card sits in the top third. The line or transcript area sits in the middle. Response buttons fill the bottom ~40%, where a thumb reaches when the phone is held one-handed in bed.
- **One replay button, in one place.** ↺ again is always bottom-center. Long-press it to loop (X2).
- **Nothing on the video.** YouTube can't be overlaid or modified, so every gloss, highlight and tap target sits below the player [03 §4.1].
- **No precision gestures.** Targets are big. There are no drag handles and no scrubbing (YouTube scrubbing is coarse on phones anyway). Swipes are allowed only as a second route to a button that is already on screen.
- **Audio follows taps.** Tapping Next advances and plays in one tap, so a session never needs two taps per item.
- **Dark and quiet by default.** Bed use means a dark theme and no sound effects. The only audio is Chinese.

### 1.1 Summary table

Slot: I = I do, W = we do, Y = you do, C = cards. Output: 0 none, 1 light. Gimmick risk is our judgement of how likely the widget is to feel like decoration rather than practice.

| X | Interactable | Serves T | Shapes | Slot | Out | Gimmick risk |
|---|---|---|---|---|---|---|
| **Playback and exploration** |||||||
| X1 | Clip stage (player + control bar below) | T10–T15 | all | I W Y | 0 | Low |
| X2 | Loop-a-span | T4, T11, T17 | Clip, Pattern | I W | 0 | Low |
| X3 | Speed steps | T11, T15 | Clip | I W | 0 | Medium |
| X4 | Line stepper with tap-to-gloss | T11, T12, T4 | Clip, Pattern | I W | 0 | Low |
| X5 | Reveal layers (pinyin / hanzi / English) + hold-to-peek | T11, T12, T16 | all | I W | 0 | Low |
| X6 | Pass tracker (predict → pass 1 → 2 → 3) | T11 | Clip | I W Y | 0 | Low |
| X7 | Speaker switch (same item, N voices) | T1, T13, T16 | Sound, Pattern | I C | 0 | Low |
| X8 | Minimal-pair A/B player | T1, T7 | Sound | I | 0 | Low |
| X9 | Pitch trace on native audio | T1, T2 | Sound | I (figure) | 0 | **High** |
| X10 | Component card (口 + 马 → 吗) | — (script) | on demand | I C | 0 | Medium |
| X11 | Pattern highlight: form flood and slot bands | T8 | Pattern | I (2nd pass) | 0 | Medium |
| X12 | Timeline figure / picker | T5, T7 | Pattern | I W Y | 0 | Low |
| X13 | Narrow-set carousel | T13 | Clip, Checkpoint | I Y | 0 | Low |
| **Guided response** |||||||
| X14 | Predict-then-hear card | T2 | Sound | W | 0 | Low |
| X15 | Choice pad (2–4 big buttons; AX mode) | T1, T7 | Sound, Checkpoint | W Y | 0 | Low |
| X16 | Meaning grid (picture or gloss) | T5, T9, T18 | Pattern, Clip | W Y | 0 | Medium |
| X17 | Scene hotspots (listen-and-do) | T9 | Clip | W | 0 | Medium |
| X18 | Tap-when-you-hear strip | T3 | Clip, Pattern | W Y | 0 | Medium |
| X19 | Gapped line | T4 | Clip | W | 0 | Low |
| X20 | Confusable sorter | T7 | Pattern, Sound, Checkpoint | W Y | 0 | Low |
| X21 | Gist question after a clip | T11, T14 | Clip, Checkpoint | Y | 0 | Low |
| **Self-report and light output** |||||||
| X22 | Comprehension self-rating | T11, T14, T15 | Clip, Checkpoint | I Y | 0 | Medium |
| X23 | Shadow prompt (gated, optional) | T17 | Sound, Clip | W | 1 | Medium |
| X24 | Recall flip (shared with cards) | T16, T18 | all | Y C | 0–1 | Low |

### 1.2 Playback and exploration

**X1 Clip stage.** This is the embed (or the native audio card), with a control bar underneath: ◀ line, ↺ again, line ▶, and a speed chip. It is the default I do, and frequently the whole of it. **Why:** a native clip comes first [06]. Picture-supported CI video is dual coding [07 §2]. **Phone:** it plays inline. The bar is thumb-height, and nothing sits on the video. **Gimmick risk:** none. The risk is the opposite one: burying a good clip under widgets.

**X2 Loop-a-span.** Long-press ↺ to loop the current line, or the last ~3 s, until you release. You can also tap "×3" for three plays. **Why:** this is Field's micro-listening, where you replay a short span until you decode it [07 §1, ref 15]. It is also how a decoding failure becomes a gap item (X19). **Phone:** one thumb, no handles. Span edges come from the hand-made line timings, never from dragging. **Risk:** low.

**X3 Speed steps.** Three chips: 0.75×, 1×, 1.25×. 0.75× appears only as a replay after a miss. 1.25× is for fluency re-listens (T15). **Why:** fluency practice on known material is the strand courses forget [07 §1]. Slowing down helps with segmenting, but slowed audio blurs tones and rhythm, so it should never be the default. **Risk:** medium. Learners can lean on 0.75× and never train at normal speed. Cap it at 0.75× and reset it every line.

**X4 Line stepper with tap-to-gloss.** The transcript scrolls below the player, one line per row, with the current line lit. Tap a row to jump to it. Tap a word for a pop-up with pinyin, a short gloss, its own native word audio (X7), a component link (X10) and **+ card**. Auto-pause at the end of each line is optional. **Why:** this is T11's pass 2 (subs on, with pausing and lookup) and T12's read-along. It follows the Language Reactor / Du Chinese model, the single proven interaction pattern of input-first products [07 §4]. **Phone:** the pop-up is a bottom sheet, so the thumb never stretches to the top. Long lines wrap; they don't scroll sideways. **Risk:** low. It is a tool, not a game.

**X5 Reveal layers.** Each line can show three layers: hanzi, pinyin and English. Each layer is one of on, hold-to-peek (visible only while you hold the line), or off. A lesson's defaults come from its fading stage: lesson 1 of a unit has pinyin on, the last lesson has pinyin on peek. **Why:** fading support beats fixed support [07 §2, ref 22]. Same-language text plus audio helps listening only when the text is easy [07, refs 11–12]. The first pass of a clip shows no layers [07, ref 7]. **Phone:** hold-to-peek is one-thumb and self-limiting: you can't leave it on by accident. **Risk:** low.

**X6 Pass tracker.** Three dots above the transcript set up X4 and X5 automatically:
- **Predict:** one prompt, such as "What will they talk about?", with three options or a still frame.
- **Pass 1:** no layers, no pausing; gist only.
- **Pass 2:** layers by fading stage, stepper on.
- **Pass 3:** no layers again.
- **Verify:** the prediction is checked and the self-rating (X22) shown.

**Why:** this is Vandergrift's metacognitive cycle, which helped less-skilled listeners most [07 §1, ref 16]. The tracker turns the cycle into a stable routine, so it is never re-explained. **Risk:** low. It mostly removes taps.

**X7 Speaker switch.** A row of voice chips for one word or sentence (V1–V5, each labeled with a few words such as "woman, Beijing, fast"), plus **play all**, which plays every voice in sequence. **Why:** talker variability is the core of HVPT, and it generalises to new voices [07 §1, refs 17, 20]. It is the cheapest way to show "the same word, many mouths". **Phone:** horizontal chips, with play-all as a big button. **Risk:** low. Rotating voices is the main content-variety lever, and this widget is that lever.

**X8 Minimal-pair A/B player.** Two big buttons, **A mǎi 买** and **B mài 卖**, from the same voice, with a voice switch underneath. A third button, **?**, plays one of the two at random and reveals which it was after you guess. This is a self-test with no scoring. **Why:** it shows the contrast in isolation before the drill. The ? button bridges the I do and the we do without making the I do a test. **Risk:** low.

**X9 Pitch trace.** A contour drawn over a word or syllable's native audio, with a playhead and the speaker's pitch range shaded. Possible only on audio we can hold (AC, CV, WM), never on YouTube. **Why:** doc 07 has no direct evidence for visual pitch displays. The case for it is narrow: it shows *why* 你好 sounds like *ní hǎo* (the first contour rises), and it shows a half-third that never comes back up. **Phone:** a static figure that replays on tap. **Gimmick risk: high.**
- Traces are noisy (creak in 3rd tones, consonant spikes).
- The user already knows tones.
- A visible line tempts you to watch instead of listen.

**Proposal:** use it as an explanatory figure in about 4 lessons (sandhi, half-third, neutral tone, 一/不). Never use it as a response channel, and never with "match your voice".

**X10 Component card.** 吗 = 口 (mouth, meaning hint) + 马 (mǎ, sound hint), with the sound of each part and 2–3 other characters that share the sound component (妈 码 骂). It opens from the gloss pop-up (X4) and from cards; it is not a lesson step. **Why:** doc 03 plans characters learned in context, with components on demand. Phonetic components make the link between sound and script, which matters to an ear-first learner. **Risk:** medium. A component tree is fun to browse and costs lesson time. Keep it on demand only.

**X11 Pattern highlight.** On the *second* pass only:
- **Form flood:** every 了 (or 没, 比…) in the transcript is tinted.
- **Slot bands:** for word-order ideas, faint labels sit under a native line: *when · who · where · does · what* (我 | 明天 | 去 | 北京).

The labels describe a native line; the learner never assembles one. **Why:** noticing [07 §1, ref 6], but enhancement costs comprehension on a first viewing [ref 7], hence second pass only. **Risk:** medium. Color soup and grammar-terminology creep. One form per lesson, one tint.

**X12 Timeline figure / picker.** A horizontal line marked *before · now · later*, with three or four glyphs:
- ✔ happened (了)
- ✖ didn't happen (没)
- ⟳ habit or general (不)
- ◯ has ever happened (过)
- ▶ ongoing (在)

In the I do it is the figure that carries the explanation. In the we do it becomes the answer pad: hear a sentence, then tap where and what it is. **Why:** this is structured input in its referential form: the only cue is the form, and the answer is a meaning, not a grammar label [07 §1, refs 3–4]. One figure is reused for 不/没, 了/过, 在, 已经, 快…了 and 以前/以后, so it is learnt once and pays off for a whole stage. **Phone:** a full-width bar with big glyph buttons below it. **Risk:** low, if the glyph set stays small and consistent.

**X13 Narrow-set carousel.** One question card on top (你是哪国人?). Swipe, or tap ▶, through 3–5 clips of different people answering it. **Why:** narrow input [07, ref 8] plus talker variability [ref 20]. Mandarin Corner's "one question = one clip" format makes this nearly free to curate [03 §2.6]. **Risk:** low. It is mostly watching.

### 1.3 Guided response (we do, you do)

**X14 Predict-then-hear card.** It shows the written phrase in citation tones: 很好 *hěn hǎo*. Tap the first syllable to cycle its tone, or choose between two surface options, then hear it. Feedback replays the native audio with the pitch trace (X9) or the surface tone marks. **Why:** T2. The rule is retrieved before the evidence is heard [07, refs 3, 23]. **Phone:** two big options beat tone-cycling, which takes several taps. **Risk:** low.

**X15 Choice pad.** Audio plays on Next. Two to four big buttons sit in the bottom 40%:
- tones 1–4, or only the two in contrast;
- *mǎi / mài*;
- **same / different** in AX mode, for initials such as zh/j and for sandhi neutralisation.

**Why:** T1, the best-evidenced activity in the catalog: many voices, many contexts, feedback on every trial [07, refs 17–20]. **Phone:** the ideal one-handed widget, with no reading needed. **Risk:** low. Monotony is the real risk, and voices, not format changes, are the answer to it.

**X16 Meaning grid.** Hear a sentence, then tap one of 2–4 tiles. A tile is either a simple picture or a short English gloss ("Is she a teacher?" vs "She's a teacher."). **Why:** T5 referential structured input, and T9 listen-and-do. Only the target form separates the tiles [07, refs 3–5]. **Phone:** a 2×2 grid of big tiles. **Risk:** medium. Pictures cost asset work, and pretty but ambiguous pictures become guessing games. **Proposal:** English-gloss tiles by default, and pictures only where the scene is the meaning (where things are, comparisons).

**X17 Scene hotspots.** One drawn or still-frame scene, such as a room or a market stall. Hear 猫在桌子上 or 点一下三本书 and tap the right spot. **Why:** T9, the phone version of TPR [07, refs 5, 9]. Doc 07 itself questions whether a tap counts as TPR (its Open question 5). **Risk:** medium. A good wildcard candidate, not a default.

**X18 Tap-when-you-hear strip.** While the clip plays, the lower half of the screen is one big tap zone for "every 是". Afterwards, a strip under the transcript shows your taps against the real tokens, with a generous timing window. **Why:** T3, word spotting in connected speech; Field's word-segmentation work and input flood [07, refs 6, 15]. **Phone:** the whole lower half is the target, so you can do it blind. **Risk:** medium. It is close to a reaction game. Never time-score it, and report "8 of 10 heard" rather than milliseconds.

**X19 Gapped line.** One transcript line with a gap (我 __ 北京). The span loops on ↺ (X2). You answer by choosing 1 of 3–4 tiles of similar-sounding candidates (去 qù / 七 qī / 气 qì). Typed pinyin is optional, mainly on desktop. **Why:** T4, Field's partial dictation. Sound-alike distractors make it a decoding task, not a vocabulary guess [07, ref 15]. **Phone:** tiles avoid one-handed typing. **Risk:** low. The lines come from the passes where *you* struggled ("decoding failures"), which keeps it honest.

**X20 Confusable sorter.** Items play one at a time. Tap **不** or **没** (or 二/两, 在/有, 2nd/3rd tone). A right or left swipe does the same thing. Items from an earlier lesson are mixed in. **Why:** T7. Interleaving similar categories gives the largest interleaving effect (g = 0.42, larger for similar items), and spacing it across sessions matters [07, refs 24–26]. **Phone:** a two-bin decision, triaged like cards. **Risk:** low.

**X21 Gist question.** After the clip ends, 2–3 English questions with 3 options each ("What did she buy?"). For the you do, no replay is allowed until you have answered. **Why:** T14. Transfer to unseen material, tested separately from teaching [07, refs 15, 23]. **Risk:** low. Questions must be answerable from the audio, not from the pictures alone.

### 1.4 Self-report and light output

**X22 Comprehension self-rating.** "How much did you follow?" with four steps: *little · some · most · nearly all*. It is asked after pass 1 and pass 3, and after logged immersion. It shows the pass 1 → pass 3 change for the clip. **Why:** it makes the multi-pass gain visible, it feeds the fading defaults and doc 03's subtitle-switch check, and it costs one tap. **Risk:** medium. Self-report inflates, so it should never count as mastery evidence on its own (the README caps self-report at Familiar).

**X23 Shadow prompt.** "Say it with her": the line plays, then a silent gap the length of the line, then the line again. No recording or scoring in this version. It is offered only once tone identification on that contrast is already high. **Why:** Hamada's perception gains [07, ref 33], against Refold's timing (README open decision 4). **Out:** 1. **Risk:** medium. Silent-in-bed use makes it easy to skip, which is fine because it is optional.

**X24 Recall flip.** Hear the clip, think, tap to reveal, then grade **Again / Good**. Lessons and SRS share this one widget. **Why:** retrieval practice [07, ref 23]. One mechanic for cards and lessons means a lesson's last step looks exactly like tomorrow's review. **Risk:** low.

### 1.5 Where no widget beats a plain clip

- **The explanation itself.** A ≤300-word explanation with one native example and ↺ is better than any interactive explainer. X9 and X12 are figures inside the text, not stations.
- **Affective particles (吧, 呢, 啊).** Their meaning is social tone. Three native examples from different scenes, played back to back (X7 or X13), teach more than a choice task can test. T6 "true for me" buttons add little; doc 07 rates their evidence as weak.
- **Erhua and accent noticing.** Hear it in a clip and read one sentence about it. Nothing to drill in v1.
- **Fluency re-listens (T15).** Hide every control except pause. The point is unbroken listening.
- **Pass 1 of any clip.** No widget, by design.

---

## 2. Per lesson shape: default routine and valid alternatives

The default is what a lesson of that shape does unless the idea asks otherwise. Alternatives are picked *by fit to the idea*, not to rotate. Under §4, the opener and the practice format are chosen separately, from §4.2 and §4.3; this section's we do / you do rows describe the Pick format and its alternatives.

### Sound (5–6 min)

| Slot | Default | Alternatives |
|---|---|---|
| I do | X7 on 2–3 target words (≥2 voices), then X8 A/B on the contrast | (a) one line from a CI clip on X1 + X2, so you hear the sound "in the wild"; (b) X9 trace as the explanation's figure (sandhi, half-third, neutral only); (c) just X1 + one sentence, for ideas that are a single rule |
| we do | X15 choice pad, 12–20 trials, ≥4 voices; X14 predict-then-hear (6–8) when the idea is a rule | (a) X15 in AX mode for the hardest contrasts (zh/j, -n/-ng); (b) X20 sorter when the contrast has exactly two members; (c) X18 spotting the sound inside a clip |
| you do | X15 with 2 unseen voices, ≥80% | X20 interleaved with the previous contrast |

### Pattern (6–7 min)

| Slot | Default | Alternatives |
|---|---|---|
| I do | X1 clip containing the form, gist only; after the explanation, X11 form flood on a 2nd pass (5–8 lines) | (a) X13 narrow set, 3 speakers using the form; (b) X12 timeline as the figure, for time-related forms; (c) X11 slot bands, for word-order ideas |
| we do | Referential first: X12 picker or X16 meaning grid (6–10); then X20 sorter mixing in the old confusable (8–10) | (a) X18 spotting the form in a new clip; (b) 2–3 T6 "true for me" items as two buttons; (c) X24 cued single word (T18) for vocabulary-like forms (量词) |
| you do | Same widget as the we do, on new sentences from new speakers (4–6) | X18 on an unseen clip |

### Clip (6–7 min)

| Slot | Default | Alternatives |
|---|---|---|
| I do | X6 predict → pass 1 (no layers), then X22 rating | (a) T10 picture-supported CI clip, with one gist question instead of the pass routine (Phase 0–1A); (b) T12 read-along of a GS page with line highlighting |
| we do | X6 pass 2: X4 stepper + X5 layers + X2 loop; then X19 gapped line on 2–4 lines you looped | (a) X17 scene hotspots on a picture story; (b) X18 spotting the unit's key word; (c) X23 shadowing on one line (gated) |
| you do | X6 pass 3 (no layers) → X21 gist (2–3) → X22 rating vs pass 1 | (a) X21 on a short unseen sibling clip (T14); (b) X13 narrow set as the unit's last lesson |

### Checkpoint (~7 min)

There is no I do and no we do; the whole lesson is a you do. Default: X21 on 2 unseen clips (no replay before answering), then X15 with new voices, then X20 interleaving the unit's or stage's confusables. Alternatives: (a) X13 narrow set as one of the clips; (b) a GS read-along with pinyin off (S2); (c) X19 on unseen lines (S2 only). Feedback is held to the end and appears as a review screen of misses, each with ↺.

---

## 3. Quiz and check archetypes

| Q | Archetype | Widget | We do items | You do items | Wrong-answer feedback |
|---|---|---|---|---|---|
| Q1 | **Identify** a sound | X15 | 12–20 | 8–10, 2 unseen voices | Plays *your pick* then *the answer*, same voice. Cue: "4th falls from the top; 3rd dips" |
| Q2 | **Same or different** | X15 AX | 8–12 | 6 | Plays both slowly in turn; names the differing feature ("puff of air on p") |
| Q3 | **Predict** the surface tone | X14 | 6–8 | — | Plays the native audio with the trace or surface marks; one-line rule |
| Q4 | **Meaning from form** | X12, X16 | 6–10 | 4–6 new | Highlights the deciding word in the line; loops the 1–2 s span holding it; "没 → it didn't happen" |
| Q5 | **Sort** confusables | X20 | 8–10, ≥30% old items | 6–8 | As Q4, plus one minimal pair played back to back (他不去 / 他没去) |
| Q6 | **Spot** in a stream | X18 | 1 clip, 5–10 tokens | 1 unseen clip | Shows missed tokens on the strip; tap one to replay that span |
| Q7 | **Fill the gap** | X19 | 2–4 lines | — | Plays the span at 1×, then 0.75×, with the answer lit; shows the distractor's pinyin next to it |
| Q8 | **Gist or detail** | X21 | — | 2–3 per clip | After answering: shows the line where the answer was said; tap to replay it |
| Q9 | **Recall and grade** | X24 | — | lesson's cards | None needed; the reveal is the feedback |

### Feedback rules

1. **We do: instant. You do and Checkpoint: deferred.** Instant feedback teaches. Deferred feedback keeps the you do a clean retrieval test, and it ends with a review screen of misses.
2. **A miss replays the contrast; it doesn't just mark it.** The order is your pick, then the answer, then a one-line cue. Audio plays automatically in the we do, behind a tap in the you do.
3. **A missed item comes back** 3–5 items later, in a different voice or sentence. A second miss queues it as a card.
4. **A right answer gets a quiet tick** and moves on after about half a second. No "Great job!" and no streak-combo counters [06 writing rules].
5. **Scores are plain and per contrast**, such as "2nd vs 3rd: 11/12; 不/没: 7/10". They feed the knowledge-graph evidence and nothing else.

### When an item counts as "unseen"

Novelty is about **speaker, sentence and clip**, not about the word. Hearing 没 again is the point; hearing the same recording again is not.

- **Sound you do:** the voice was not heard on this contrast in this lesson, and preferably not in the learner's last few sessions on it. The I do voice is never the you do voice [07 rule 2].
- **Pattern you do:** the sentence did not appear in this lesson's I do or we do, is not on a card the learner holds, and comes from a new speaker.
- **Clip you do and Checkpoint:** the video span has never been played in any lesson, card or re-listen.
- **When the pool runs dry:** use the least recently heard item, but mark the result as practice, not as transfer evidence. A checkpoint should never quietly pass on recycled audio.
- **The "exposure history" rules:** a span that was only glimpsed (skipped after a second or two) still counts as seen. Being on a card counts as seen.

---

## 4. Variety, the lesson arc, and skills in the SRS

**Revised 2026-11-03** (twice) at the user's request. The first version kept every lesson on its shape's routine and allowed format novelty only as one wildcard per unit. That answered whether rotating formats helps *learning* (doc 07: no evidence that it does). It didn't answer the question that matters for a solo learner: **does the lesson stay fresh long enough to build the habit?** The user's experience from vue-crash-course is that identical structure feels repetitive even when the content changes, and novelty carries motivation until the habit takes over.

The evidence allows for this once it's read precisely:
- **The cost of a new format is paid once, when you learn how it works** [07 §2, refs 22, 28]. A fixed repertoire that rotates pays it once per format, with a one-line introduction the first time. Formats that are always new, or that don't train the target skill, are what the evidence warns against.
- **Novelty fades in about 4 weeks** [07, ref 30]. Habit formation takes a median of about 66 days, ranging from 18 to 254 (Lally et al., 2010, *European Journal of Social Psychology*). Novelty only has to bridge the gap, so it matters most early.

### 4.1 The lesson arc

Every lesson teaches **one skill** (a knowledge item such as `zh:g:mei-vs-bu`) and runs this arc. The I do is the lesson itself, the we do is the skill in use, and the you do is practice, which is also what the SRS reviews.

1. **Start.** The title, the idea line, minutes, the steps ahead, and **I already know this**, which jumps to Practice as a test-out [README, Completion & test-out].
2. **Opener: context and hook.** A real clip comes first, framed by one of the opener types in §4.2, with one question you probably can't answer yet.
3. **Lesson: the I do.** One idea, 60 words or fewer [lesson-writing-style.md], with a figure and a ❌/✅ pair where it helps.
4. **Examples: the we do.** The grammar or words in action: several native clips in different voices and contexts, with the target lit and the meaning one tap away. Nothing is scored. In Clip lessons this is the line-by-line read-along with text and glosses. A lesson can skip it when the opener and lesson already show enough (some Sound lessons).
5. **Practice: the you do.** The skill, in the lesson's practice format (§4.3), with instant feedback. The first time a format appears on the path, a one-line card says how it works; after that it needs no introduction. **This format is what the skill's SRS card reviews later (§4.4),** so the lesson's last drill and tomorrow's review look the same.
6. **Done.** A short end card: the first-try score, what was added to reviews (the skill card plus any word cards), and the next lesson.

There is one practice per lesson, not a practice and a separate check. **There is no synthesis or replay step** (decided 2026-11-03): the skill and its words come back often enough in the SRS. Checkpoint lessons are a Practice of mixed skills on unseen material.

### 4.2 Openers (rotate)

How the idea arrives. Chosen by fit to the idea; neighbors on the path prefer a different opener.

| Opener | What happens | Fits | vue-crash-course analog |
|---|---|---|---|
| **Story** | A real clip, gist only. The lesson unpacks it afterward. | Clip lessons, vocabulary themes | Tour |
| **Showdown** | Two clips side by side that differ only in the target (他不去 / 他没去). *Which one already happened?* | Confusable pairs, contrasts | Showdown |
| **Mystery** | Hear the puzzle before the answer. *Why does 你好 come out as ní hǎo?* | Rules with a surprise (sandhi, 一/不, neutral tone) | Mystery |
| **Discover** | Five or six examples, then *what's the pattern?* with three options, before the rule is shown. This is guided induction. | Patterns with a visible regularity (word order, 了, measure words) | Walkthrough |

The opener's question is unscored. It's there to make you listen for something, not to test.

### 4.3 Practice formats (rotate by fit)

The language version of vue-crash-course's challenge formats. Each one:
- tests the lesson's target cue (transfer-appropriate);
- is receptive (output level 0–1) and one-thumbed;
- never plays wrong Chinese;
- can be generated automatically from the content pipeline;
- works as a short SRS review on fresh stimuli (§4.4).

| C | Format | How it plays | Fits | Built on | Generated from |
|---|---|---|---|---|---|
| C0 | **Pick** | Hear it, tap one of 2–4 big buttons. The faces vary: tones, a timeline, meanings, a two-way sorter. | Sound, Pattern | X12, X15, X16, X20 | the lesson's items |
| C1 | **Recall** | Hear it, think of the meaning, reveal, grade yourself | Pattern (vocabulary-like) | X24 | the lesson's items |
| C2 | **Odd one out** | Four voices. Three say the same thing (or tone, or form), one differs. Which one? | Sound, Pattern | X15 | clips grouped by tone or form; four different speakers, so voice is never the cue |
| C3 | **Catch the mismatch** | Three or four lines play with English under each. One English line is wrong on exactly the target (*didn't* ↔ *doesn't*). Tap it. The Chinese is always right. | Pattern, Clip | X4 | each line's gloss, with the target flipped and checked by rule |
| C4 | **Listen and do** | Hear an instruction, tap the spot in a scene (*put the cat on the book*) | Pattern (place, measure), Clip | X17 | a scene spec (figure-drawing spike) |
| C5 | **Put it in order** | Hear a short story, then tap three gloss or picture cards in the order things happened | Clip | X21 | the transcript lines |
| C6 | **Fill the gap** | A spoken line with a gap, and tiles that sound alike (去/七/气) | Clip, Pattern | X19 | the analyzer plus CC-CEDICT homophones |
| C7 | **What comes next?** | The clip pauses. Pick what comes next from three English options. | Clip | X1 + X15 | the next line, and two lines from sibling clips |
| C8 | **New clip** | An unseen clip, gist questions, no replay before answering | Clip, Checkpoint | X21 | the clip pool, by exposure history |

**Rotation rule.** Choose by fit first. Among the formats that fit, prefer one that wasn't used in the previous two lessons. In S0 and S1, a format new to the learner appears about every 3–4 lessons, each arriving with its one-line introduction, so the first weeks always have something new coming up. In S2, variety comes mostly from content.

**Inside practice, content still varies:**
- **Voices and contexts:** at least 4 voices per contrast, and at least 2 contexts per unit.
- **The context ladder.** Items climb from a single syllable, to a word, to a sentence, to a line inside a real clip. Each item carries its rung, and a unit should climb at least two rungs.
- **Difficulty that adapts.** The trial runner aims for **about 80–90% accuracy**: it moves up a rung after a run of hits and serves an easier item after two misses in a row. The "85% rule" (Wilson et al., 2019, *Nature Communications*) comes from a model of learning, not a classroom study, so treat the band as a tuning target.
- **Ending on mastery or time, never on a count.** Practice ends after a run of hits on the top rung, or at about 3 minutes. Misses come back 3–5 items later in a new voice, but a lesson can grow by at most 4 retries.

### 4.4 Skills in the SRS

**Decided 2026-11-03:** skills are SRS cards, just like vocabulary.
- **One skill card per lesson skill,** with template `skill` and a deterministic id from the skill's knowledge item (as for every card). The lesson adds it when practice ends, alongside its word and sentence cards. A test-out pass adds it too.
- **A skill review is a short burst of the lesson's practice format,** usually 1–3 items, on stimuli the learner hasn't heard: a new sentence or a new voice, chosen by exposure history. The same item never reviews the same recording twice in a row.
- **Grading is automatic.** All right on the first try is Good, and any miss is Again. Skill cards never ask you to grade yourself; C1 Recall is the exception, because recall is self-graded by design.
- **Confusable skills interleave on their own.** 不/没 and 了/过 reviews land in the same sessions, which gives the spaced interleaving doc 07 recommends [refs 24–26].
- **When the pool runs dry,** reuse the least recently heard stimulus and log the review as practice, not as transfer evidence (§3, "unseen").
- **Costs to plan for:**
  - A skill review takes about 15–30 s, against about 8 s for a word card, so the minutes-based review cap (README conflict 4) has to count it by measured time.
  - Skill cards need deep stimulus pools. A skill whose pool is thin (spike B's red ideas) can't support honest reviews, which makes those gaps more pressing.

### 4.5 What the matrix records

The matrix is computed from compiled lessons, never authored [TDD `content:matrix`]. Per lesson:
- **Shape**, from the idea, and the **skill** it teaches.
- **Opener** (§4.2) and **practice format** (§4.3), and whether the format is new to the learner at that point on the path.
- **Rungs** that the practice items span.
- **Hook source:** which real clip the opener uses.
- **Voices** (total, and new to the learner), **contexts**, and **confusables interleaved** (which earlier items, from which lesson).
- **Support stage:** pinyin default and replay allowance, fading across the unit.
- **Stimulus pool depth** for the skill card: unseen sentences × voices available after the lesson.
- **Rough strand split** and **maximum output level**, for the weekly balance check.

**Checks:**
- Neighboring lessons differ in opener or practice format.
- Each unit uses at least 3 practice formats.
- A format's first appearance on the path shows its introduction.
- Each unit climbs at least two rungs and has at least 4 voices per contrast.
- The skill card's pool supports at least ~20 unseen reviews.
- No lesson's estimate runs past 8 minutes, not counting a `main` video, which may run as long as it needs (README Video row).

**Sketch (not final), four lessons from §1.8.** The letters a/b mark a lesson's position inside its unit.

| Lesson | Shape | Skill | Opener | Practice format | Rungs | Voices (new) | Interleaved | Support |
|---|---|---|---|---|---|---|---|---|
| 0.9a 你好 → *ní hǎo* | Sound | 3rd-tone sandhi | Mystery | C2 Odd one out (new) | word → phrase | 5 (2) | 2nd vs 3rd (0.1) | pinyin on |
| 1.13c Ordering at a stall | Clip | stall phrases | Story | C7 What comes next? (new) | sentence → clip | 1 clip + 3 | — | pinyin on peek |
| 1.15a 不 vs 没 | Pattern | 没 vs 不 | Showdown | C3 Catch the mismatch | sentence → clip line | 6 (2) | 不 (1.3), 没有 (1.6) | pinyin peek |
| 1.15b 吧 softens | Pattern | 吧 | Discover | C0 Pick (meaning faces) | sentence | 4 (3) | 吗 vs 吧 (1.2) | pinyin peek |

---

## 5. Walk-throughs (descriptions, not content)

### 5.1 Sound: 0.9 "你好 sounds like *ní hǎo*" (third-tone sandhi), ~6 min

1. **Idea line.** Two 3rd tones in a row: the first one rises.
2. **I do (1.5 min).** X7 with 你好 from three voices (AC, CV, the Lazy Chinese greeting span). Then X8 A/B: 你 said alone vs the 你 inside 你好, same voice. X9 trace figure: the first contour rises in 你好 and dips in 你 alone. Nothing is asked.
3. **Explanation (≤150 words).** The rule, then its cases (很好, 可以, 我也) so the learner can predict them. One ❌/✅: ❌ two full dips.
4. **We do (2.5 min).** X14 predict-then-hear on 6 new phrases. Then X15 for 12 trials: "Is the first syllable 2nd or 3rd?", mixing real 2nd + 3rd words (没有, 还好) with sandhi'd 3 + 3 words across ≥4 voices. The point to land is that they sound the same. If native audio exists for a neutralised pair (起码 / 骑马), one AX item makes that concrete. A miss replays both from the same voice, with the trace.
5. **You do (1.5 min).** X15 ×8 with two voices not heard so far. Feedback is deferred, ≥80% passes, and misses appear on the review screen.
6. **Cards.** 你好, 很好 and 可以 with AC audio, plus one CV sentence. The user knows tones, so this lesson is also a likely test-out.

### 5.2 Pattern: 1.15 "不 vs 没 (first pass)", ~7 min

1. **Idea line.** 没 says it didn't happen; 不 says you don't, won't, or generally aren't.
2. **I do, gist (1 min).** X1 with a Peppa or Lazy Chinese scene that contains both forms, played once with no layers. One gist question, which is not scored.
3. **Explanation (≤200 words).** The X12 timeline is the figure: ✖ before-now for 没, ⟳ habit and ▶ later for 不. PI asks for the misleading strategy to be named, which here is "both mean *not*", so English gives no help [07 §1]. 没 + 有 is a reminder from 1.6.
4. **I do, second pass (1 min).** X11 form flood on the same scene: 不 and 没 tinted the same color (tinting them differently would hand over the answer). The learner hears the lines with the forms visible.
5. **We do (3 min).**
   - X12 picker, 8 sentences: hear it, tap ✖ (didn't) or ⟳ (doesn't).
   - Blocked first, 没 only, then mixed. Pan et al. found blocking does fine within the first session [07, ref 26], and 不 is already known from 1.3.
   - Then X20 sorter ×10, with ~30% of items reused from 1.3 and 1.6.
   - A miss loops the span with the deciding word lit: "他没去 → he didn't go (it's over)".
6. **You do (1 min).** X12 ×5 on new sentences from two new speakers, with feedback deferred.
7. **Cards.** Two minimal-pair sentence cards (他不去 / 他没去) as clip audio, plus a 不/没 entry added to the interleaved pool, so later lessons and the SRS mix them in.

The second lesson of the unit (吧) would then appear as the 1.15b row in §4.

### 5.3 Clip: 1.13 "Ordering at a stall" (unit theme food and shopping), ~7 min

1. **Idea line.** At a stall: what you want, how much, and 太…了 when it's too much.
2. **I do (1.5 min).** X6 predict: a still and three options (asking the way / buying fruit / talking about weather). Pass 1 of a ~60 s Mandarin Click food story, no layers. Then X22 rating.
3. **Explanation (≤150 words).** Three key words (多少钱, 太贵了, 要), each with an X7 chip of 2–3 voices. One component card is offered for 钱 if the learner taps it.
4. **We do (3 min).** Pass 2 with the X4 stepper, X5 layers at the unit's stage, X2 loop and optional auto-pause. Lines the learner looped twice or more become X19 gapped lines (2–4 of them), with sound-alike tiles. **+ card** on any line mines it. Optional X23: shadow 太贵了 once.
5. **You do (1.5 min).** Pass 3 with no layers. Then X21: two gist questions and one detail question ("How much were the apples?"). Then X22 again, shown next to the pass 1 rating.
6. **Cards.** 1–3 mined lines as clip-audio cards, plus the key words with AC audio.
7. **After.** The whole clip is queued as a T15 fluency re-listen at 1× for a future bedtime slot, with all controls hidden.

---

## 6. Cut list

| Idea | Why it's cut (or parked) |
|---|---|
| Record-your-voice pitch matching against the native trace | Output at the wrong time (Refold 3D+); pitch tracking on a phone mic in bed is noisy; turns listening into staring. Revisit at Phase 3 |
| Speech-scored pronunciation (HelloChinese style) | Production, and unreliable scoring; Refold's timing argument [07 §3] |
| Tile sentence builder / drag-to-reorder word order | Output level 2 ("Build to spec", parked by doc 07); drag precision is poor one-handed. X11 slot bands cover the noticing half |
| "Fix the wrong sentence" | Feeds ungrammatical input; metalinguistic; parked to Phase 5 [07] |
| Any overlay on the YouTube player (tap targets, karaoke on video, blur-the-subs bars) | Policy forbids modifying or obscuring the player [03 §4.1] |
| Word-level karaoke on YouTube clips | Needs hand-made word timings for every clip; line-level highlighting gives nearly all the value. Word level is fine on GS read-alongs only |
| Typing hanzi with an IME in the we do | Two-handed; trains output and IME skills, not listening. At most a desktop option in S2 |
| Countdown timers, speed runs, combo multipliers, confetti, mascots, hearts | Childish for an adult engineer; pressure doesn't help perception; doc 04's leave-out list |
| Tap-the-matching-pairs (text ↔ text) | No audio processing; doesn't match the target skill (TAP mismatch) |
| Drag-and-drop bins for the sorter | Replaced by two big buttons, with a swipe as a shortcut |
| Stroke-order writing quizzes | HSK 2025 L1 requires no handwriting; doc 03 lists them only as a COULD |
| "Build the character from components" puzzle | Gimmicky; output-like; X10 browsing covers the insight |
| 0.5× audio | Distorts tones and rhythm too much; 0.75× is the floor |
| Branching choose-your-own-adventure clips | Large curation cost; novelty only |
| Word-boundary tapper (tap between syllables where a word ends; Field) | Precise taps between characters are fiddly on a phone, and hanzi lines already show boundaries. A possible desktop wildcard |
| Separate T6 "affective" screen | Weak evidence [07]; folded into the Pattern we do as two buttons, optional |
| Leaderboards, sharing | Single user |

---

## 7. Open questions for the user

1. **Pictures or gloss tiles?** Picture tiles (X16, X17) need someone to make or source art. Is English-gloss tiles by default, with pictures only for spatial and scene ideas, acceptable?
2. **Pitch trace at all?** You already know tones. Keep it for ~4 sandhi/neutral-tone lessons, or drop it?
3. **Auto-playing feedback in bed.** Should a miss auto-play the contrast (fast, but loud without headphones), or wait for a tap? Should there be a "silent mode" that skips audio-only items altogether?
4. **Typed answers.** Gapped lines as tiles only on the phone, with typed pinyin as a desktop option, or typed everywhere?
5. **Auto-pause per line in pass 2:** on by default or off?
6. **Self-rating (X22).** Is a one-tap "how much did you follow?" useful to you, or noise? Should it drive pinyin fading, or only feed the subtitle-switch check?
7. ~~**Wildcards.**~~ **Answered 2026-11-03:** replaced by rotating openers and practice formats (§4).
8. **You-do feedback.** Deferred to an end-of-step review (as proposed), or instant everywhere?
9. **Speaker identity.** Should voices be anonymous ("voice 3") or carry a short label (gender, region, speed)? Do you want to see which voice tripped you up?
10. **Shadow prompt.** Is it fine with no recording in v1 (ties to README open decision 4 and doc 06 open question 3)?
