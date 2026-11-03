# 04 · Progression systems

> What makes a skill tree / knowledge graph motivating enough to come back daily? Math Academy first, then other systems, motivation research, a Mandarin knowledge-graph design, and a recommended progression design for this app.
>
> Researched 2026-11-02. Confidence marks: `(verified)` = checked against a primary source; `(reported)` = secondhand, community, or a search summary we did not open.

## TL;DR

- **Math Academy separates three things that most apps blur.** *Effort* is XP, calibrated so 1 XP ≈ 1 minute of focused work. *Knowledge* is a hand-built graph of about 2,500 topics with mastery shading. *Review* is FIRe, which gives implicit credit when advanced work exercises simpler topics. We should keep the same separation: effort, input volume and knowledge are three different meters.
- **FIRe is the most useful idea to borrow, but only in part.** In math, solving an advanced problem really does exercise its sub-skills. In Mandarin, reading 学生 does not reliably make you recall 学 on its own. So implicit credit should be fractional, should go to subcomponents only, and should postpone explicit reviews rather than replace them.
- **"Repetition compression" transfers directly.** When picking which due cards to show, prefer ones whose implicit credit clears several other due items, for example a mined sentence that covers three due words. This also helps with review pile-ups after missed days (see 02).
- **XP = focused minutes is the right currency for a Refold app**, because most Refold progress is time spent rather than lesson completions. Math Academy's sustainable ceiling is about 50–60 XP/day, and it recommends 20–40 XP/day, 3–5 days a week.
- **Streaks work but are fragile.** Duolingo's own data shows large retention gains from streaks. Peer-reviewed work shows that a *broken* streak makes people drop the activity, unless the streak can be repaired. Built-in slack ("emergency reserves") raises persistence. So: a generous streak, rest tokens, repair, and a 30-day consistency score that a single bad day can't wipe out.
- **Gamification evidence is mixed.** Points, levels and leaderboards raise *quantity* of work but not intrinsic motivation. A semester-long classroom study found gamification (badges plus leaderboard) *lowered* motivation over time. Keep only mechanics that give real information about competence.
- **Use three buckets matching the user's planned split:** Curriculum 25% (in-app lessons for about the first 6 months), SRS 25% (in-app) and Immersion 50% (Netflix etc. outside the app, logged by hand). In-app minutes are measured and earn 1 XP/min. Logged immersion minutes count *fully* toward Input hours, but earn only 0.5 XP/min, capped at 20 XP/day, because they are self-reported.
- **For the lazy-day user, use a three-tier day: Floor, Standard, Stretch.** The Floor is a *short, measured in-app session*: about 10 min of flashcards or one 5–10 min video lesson (around 8 XP). That is the bedtime session on a phone with the screen on. Logged immersion alone can only *hold* the streak (at most 2 days a week), never extend it, so it is hard to game.
- **Show the 25/25/50 balance weekly, not daily.** One goal number per day, with a weekly three-segment ring against the target split. Daily balance rules would punish the legitimate flashcards-only lazy day.
- **The knowledge graph covers what the app can observe: curriculum and SRS.** It has three layers: Sound (initials, finals, tones, tone pairs), Script (components → characters → words) and Grammar (Chinese Grammar Wiki A1–C1 points with prerequisite edges), plus curriculum lesson nodes. Immersion sits beside the graph as a self-logged hours roadmap rather than inside it.
- **Visualization:** don't draw the whole graph on a phone. Make the main view a "frontier" list plus cluster rings, and put the zoomable map one tap away. Cytoscape.js (canvas, touch, compound nodes, DAG layouts) is the best general fit. Sigma.js is an option for a WebGL "constellation of all hanzi".
- **Deliberately leave out:** leagues and leaderboards, negative XP, hearts/lives, gems, shops and loot, wagers, guilt notifications, and hard content locks.

## Findings

### 1. Math Academy in depth

**People and sources.** Math Academy was founded by Jason and Sandy Roberts. Justin Skycak designed much of the algorithmic layer and writes about it on justinmath.com and in the free book draft *The Math Academy Way* [3][13] (verified). The book's chapter list confirms the main ideas: the knowledge graph (Ch. 4, including "Encompassings Enable Turbo-Boosted Learning Speed"), "Knowledge Frontier as Zone of Proximal Development" (Ch. 13), spaced repetition compression and per-student calibration (Ch. 18), gamification with "XP-Time Equivalence", "Closing Loopholes" and "Progress vs XP" (Ch. 22), and a FIRe deep dive (Ch. 29) [3] (verified, TOC). We could not load the full PDF (over 10 MB), so details below come from Skycak's blog posts and FAQ, which cover the same material.

**Knowledge graph.** About 2,500 topics, each with 3–4 *knowledge points*. Each knowledge point links to one or more (usually several) prerequisites [2] (verified). Skycak has said he is uneasy with more than 3–4 direct prerequisites per item, because beyond that cognitive overload becomes a risk [reported via podcast summary]. The graph is hand-built by domain experts. Setting the encompassing weights alone took about 2 minutes per edge, roughly 250 hours in total [2] (verified). Two kinds of edge matter:
- A **prerequisite** is something you must know first.
- An **encompassing** means "practising the advanced topic also practises the simpler one". It carries a weight from 0 to 1 for *how much* of the simpler topic is exercised. Prerequisites are often not encompassed, so the encompassing graph is kept separate [1] (verified).

**Fractional Implicit Repetition (FIRe)** [1] (verified):
- A successful review flows *down* encompassing edges as fractional repetition credit to simpler topics. A failure flows *up* and penalizes the more advanced topics that rely on the failed skill. Full encompassings form a "trunk". Partial ones fade out along branches.
- **Repetition compression:** the task selector picks tasks whose implicit repetitions "knock out" the most due reviews, and looks ahead to upcoming ones. The result is far fewer explicit reviews than flat SRS. Skycak argues that without this, review load in a deep hierarchy grows faster than a student can keep up.
- **Per-student, per-topic learning speed** (student ability ÷ topic difficulty) scales how much a review counts. If speed is below 1, the system *discards incoming implicit credit and forces explicit reviews*. Memory decay speeds up when a review is badly overdue.
- How it differs from flat SRS: Anki/FSRS schedule each card on its own. Anki's developers confirm the scheduler "cannot access the review history of any other card", so siblings can't share credit [47] (reported, forum).
- Matuschak, an expert SRS user, found MA's implicit credit "too conservative" for him, meaning he forgot faster than it assumed. He also noted that reviews focus on the newest material rather than on his weak spots [11] (verified).

**Diagnostic and the knowledge frontier.** An adaptive diagnostic of 30–45 minutes measures both mastery and automaticity (speed). It places the student at their **knowledge frontier**, the boundary of the known set, which is where new topics become available [6][7] (verified). Skycak frames the frontier as Vygotsky's zone of proximal development (Ch. 13) [3]. His three-line summary of the method is: bite-size progression, implicit spaced repetition, and frontier-based task selection that clears due reviews while keeping explicit review to a minimum [8] (verified).

**Mastery learning.** Up to about 5 problems per knowledge point, advancing only after mastery is shown. A failed lesson is rescheduled within a few days, and prerequisite gaps get priority [6][7] (verified). Students choose from a short menu of available tasks (about 5), which users describe as feeling like picking a quest in an RPG [9] (verified).

**XP.**
- 1 XP ≈ 1 minute of fully focused work "for an average serious but imperfect student" [5] (verified).
- XP scales with performance, with a small bonus for a perfect score. Each task shows its XP value before you start [6][9] (verified).
- Earning half an XP per minute or less over a session is described as a warning sign [4] (verified).
- One self-taught adult measured 0.76–0.84 XP per real minute and treated the ratio as a "focus rate" [10] (verified). A forum parent reported 2–3 minutes per XP (reported).
- **Penalties:** negative XP is triggered by "patterns indicating lack of effort (e.g., rushing and guessing)". Productive students "rarely, if ever" get it [4][7] (verified). It is distinct from remediation: failing a lesson twice triggers prerequisite review, not a penalty [4]. The exact penalty formula is not public. A podcast mentions warnings and gradual ramp-up (reported).
- "Progress vs XP" is a chapter in its own right [3]. XP measures effort input, while the graph measures results. Matuschak notes the same thing: XP "standardizes pace" but measures inputs rather than outcomes [11].

**Daily goals and pace.** The daily XP goal and days per week are adjustable. MA recommends "20 to 40 XP per day, 3 to 5 days per week" and does not recommend fewer than 3 days [7] (verified). Projected completion dates are recomputed from recent pace, and reviewers find them motivating [7][9][11] (verified). From leaderboard data, Skycak estimates the maximum *sustainable* rate at about 50–60 XP/day, and says "even something like 30 XP/day" gives fast progress [5] (verified). One year-long adult user averaged 53 XP/day (about 325 hours a year) [12] (verified). Habit advice in the FAQ: on busy days, "a little bit of math … will go a long way in terms of protecting the habit". After a break, restart slowly because "it's much easier to speed up a slow wagon" [4] (verified). In other words, never-zero, in MA's own words.

**Leagues.** Weekly leagues: top performers are promoted, the bottom ones drop into a "demotion zone". Accumulated XP is never lost and "each week is a fresh start". Students can opt out [6][9] (verified). Users say the leaderboard pushes them to do "one more lesson" and that fear of demotion motivates them [9][10] (verified).

**What users say helps and hurts.**
- *Helps:* short tasks of a few minutes, which make starting easy [9]; task choice, i.e. autonomy [9]; visible daily-goal progress, described as a "superstimulus for our sense of progress" [9]; game-like correct-answer feedback; and the sense that "less is more" [10].
- *Hurts:* slow recovery from a block you aren't ready for, and no "I don't know" option [10]. A self-taught user moved from daily to **weekly** XP targets because daily ones felt stressful [10]. Matuschak felt passive with an opaque, algorithm-driven queue ("living inside a database table"), wanted to see where items come from, and found the visual of progress weak [11]. Many users find review load overwhelming late in a course [reported, Hecker/Discord]. A system that responds slowly after each task breaks flow [12].

**Unique to math, and what transfers.**

| Math Academy feature | Why it works in math | Transfer to Mandarin/Refold? |
|---|---|---|
| Dense hand-built prerequisite DAG of about 2,500 topics | Math is deeply hierarchical. Every advanced step runs its sub-skills. | **Partial.** Only Script (component→character→word) and some grammar are truly hierarchical. Most vocabulary is a huge, flat, frequency-ordered set. |
| Full-credit encompassings | You can't solve the advanced problem without running the sub-skill. | **Weak.** Words are often recognized as a whole. Use small weights and credit subcomponents only. |
| Auto-graded problems → penalties for guessing | Answers are objectively right or wrong and timed. | **No.** Refold progress is mostly ungraded input. With one user, guessing only cheats yourself. |
| Diagnostic placement | Dense graph, so few questions are needed. | **Lite.** One-time "mark known" for pinyin, HSK bands and grammar is enough. |
| XP = focused minutes | Standardizes effort | **Yes, strongly**, for in-app time, which is measured. Self-logged immersion needs a discounted rate (§5). |
| Daily XP goal + completion projection | Gives a sense of pace | **Yes.** Project curriculum completion and immersion-hour milestones. |
| Mastery-gated curriculum lessons | Structured course | **Yes**, for the foundation curriculum (pinyin, tones, first words, grammar), which is the in-app 25%. Gates stay soft. |
| Knowledge frontier task menu | Autonomy plus zone of proximal development | **Yes.** "Ready to learn" words, characters and grammar. |
| Repetition compression | Reduces review load | **Yes.** Pick sentence cards that cover several due words. |
| Leagues | Social comparison among thousands | **No.** We have one user. |

### 2. Other systems worth borrowing from

**Duolingo.**
- *Streaks.* Learners on a 7-day streak are 2.4× more likely to come back the next day [14] (verified). Letting one lesson extend the streak, separately from the daily XP goal, gave +3.3% Day-14 retention, +1% daily active learners and +19% of new learners on a streak. It also *lowered* the share of learners reaching their daily goals [14] (verified). Lesson for us: **the streak threshold should be a low floor, separate from the goal.**
- *Streak freeze.* Allowing two freezes to be equipped at once raised daily active users by 0.38%. The design rationale cites research showing that some slack helps goal pursuit [15] (verified).
- *Weekend Amulet* (skip the weekend without losing the streak): users were 4% more likely to come back a week later and 5% less likely to lose their streak. Duolingo's internal research found that "learners who binge … were much more likely to abandon the app" [16] (verified). Pace beats binges.
- *Milestone animations* raised 7-day retention for new learners by 1.7%. The blog also notes diminishing returns (2→3 days is +50%, 200→201 is +0.5%) and that loss aversion is what drives long streaks [15] (verified).
- *Downsides Duolingo itself admits:* "Losing a streak can be very discouraging", and some learners get "pretty crazy" about streaks [16] (verified). Third-party studies report streak anxiety, and found that streaks predict continued use but are *not* driven by perceived learning value [reported, student theses]. In other words, a streak can turn into a habit of opening the app rather than a habit of learning.
- *Leagues.* These grew from 5 to 10 tiers, with Diamond at the top [17] (reported).
- *Path redesign (Nov 2022).* This replaced the branching tree with a linear path "to guide learners" [18] (reported). The main complaint in the backlash was **loss of choice**: users could no longer pick what to study or revisit skills [19] (reported). Lesson for us: a recommended path is fine, a forced one is not. This fits SDT's autonomy need (§3).

**WaniKani** is the closest analogue to a hanzi graph.
- Radicals unlock kanji, and kanji unlock vocabulary, once the parent item reaches *Guru* [22] (verified).
- SRS stages run Apprentice 1–4 (4h, 8h, 1d, 2d) → Guru 1–2 (1w, 2w) → Master (1 mo) → Enlightened (4 mo) → Burned [22] (verified).
- You level up when 90% of the level's kanji reach Guru [23] (reported via KB snippet).
- Strength: named, legible stages ("Burned" feels like an achievement) and a clear gate.
- Weakness for Refold: it is a fixed, imposed order, while Refold learners mine words from their own content.

**Khan Academy** uses mastery levels Not started → Attempted → Familiar → Proficient → Mastered. Levels can go *down* with later performance. Course percentage counts Proficient and Mastered skills [24] (reported, help-centre snippets). Useful pattern: a few named levels, honest decay, and a percentage that rolls up.

**Hack Chinese** focuses on daily micro-goals, a consistency chart and a long-term vocabulary-growth chart, with HSK-list progress percentages [29] (reported). It shows how far a Mandarin-specific app gets with almost no gamification: consistency charts plus coverage percentages.

**Brilliant** has earned "Streak Charges", which preserve the streak but don't extend it, and weekly 30-person leagues [25][26] (reported, help pages). Earning freezes through activity is better than buying them.

**Games.**
- Path of Exile's passive tree has about 1,300 nodes, with notable "keystone" nodes among many small ones [53] (reported). The lesson is clusters with landmarks: the small nodes give steady increments and the notables give goals.
- Factorio's research tree has explicit prerequisites and a research queue. Some technologies unlock when a *condition is met* rather than by spending research [54] (reported). That maps well onto "do 10 hours of listening → unlock Listening II".
- The common thread: you can *see what's next and why*, and you choose your route.

**Fitness.**
- Strava streaks are **weekly**: one activity of 60 seconds or more between Monday and Sunday keeps the streak, and you can restore a missed upload after the fact [27] (reported, help centre).
- Apple Activity rings (watchOS 11) let you **pause rings** for a day, a week or longer without losing award streaks, and set **goals per weekday** [28] (reported).
- Both are mature answers to the burnout problem: a weekly unit of consistency, planned rest, and illness/travel pauses.

**"Don't break the chain."** A wall calendar with an X per day: simple and visual. Its weakness is shown by Silverman & Barasch (*JCR* 2023, seven studies). Intact streaks increase future engagement and broken ones reduce it, *independent of actual past behaviour*, purely through how the log represents it. The drop is bigger when people blame themselves, and smaller when the streak can be **repaired**. In one account, people who broke a streak switched to a *different language* rather than restarting [20] (reported, abstract and press coverage). Highly relevant to us.

### 3. Motivation science (brief)

- **Self-determination theory.** Intrinsic motivation and wellbeing depend on **autonomy**, **competence** and **relatedness** [30] (reported, standard reference). Applied here: let the user choose content and routes (autonomy), show real skill growth (competence), and add some light social contact (relatedness; harder with one user).
- **Overjustification.** A meta-analysis of 128 studies found that *expected, tangible* rewards undermine intrinsic motivation for tasks people already find interesting. Informational feedback is less harmful [32] (reported). Hanus & Fox (2015, 16 weeks) found students in a course gamified with badges and a leaderboard became *less* motivated and satisfied over time, with lower exam scores mediated by intrinsic motivation [37] (reported). Mekler et al. (2017) found points, levels and leaderboards increase *quantity* of output but do not change intrinsic motivation or competence [38] (reported). The Sailer & Homner meta-analysis found a positive overall effect of gamification on learning, but motivational and behavioural effects were less stable than cognitive ones [39] (reported).
- **Goal gradient.** Effort speeds up as a goal gets closer. Coffee cards with 2 "free" pre-stamped boxes out of 12 were completed faster than plain 10-box cards (illusory progress) [31] (reported). Design implication: always show a near goal (next milestone, today's ring), not just the far one.
- **Variable rewards** (Eyal's Hook model: rewards of the tribe, the hunt and the self) drive compulsive checking [36] (reported). The dark side: unpredictable rewards cut loose from real progress become slot machines, and what they train is opening the app. If we use surprise at all, it should be *informational* ("you just understood 92% of this episode"), not random loot.
- **Habit formation.** Lally et al. (2010): median 66 days to reach about 95% of the automaticity plateau, range 18–254 days (the upper end extrapolated, n≈39 well-fitted). Missing a single day did not materially derail habit formation [33] (reported; widely cited secondhand). Implication: one missed day should not cost a lot.
- **Implementation intentions** ("When X happens, I will do Y"): a meta-analysis of 94 tests found d = 0.65 for goal attainment [34] (reported).
- **Habit stacking / Tiny Habits:** "After I [anchor], I will [tiny behaviour]", then celebrate [35] (reported). For our user the anchor is natural: *after I get into bed, I open the app and do my flashcards.*
- **Never-zero / minimum viable day.** This is community advice rather than formal research, but it matches Lally (one miss doesn't matter, chains of misses do), Math Academy's "a little bit … protects the habit" [4], and Duolingo's one-lesson streak threshold [14].
- **Emergency reserves.** Goals with built-in skip days (e.g. "7 days with 2 emergency skips") *increased* persistence after a slip compared with an equivalent strict goal. In a 5-week steps study, participants took up to 20% more steps and hit their targets on up to 40% more days [21] (reported). A small cost for using a reserve stops overuse.
- **Loss aversion** (losses weigh about twice as much as equal gains [40], reported) is what powers long streaks, and also what makes breaking one so painful [15][20].

**What sustains motivation vs. what burns people out**

| Helps long-term | Burns people out / crowds out learning |
|---|---|
| Visible competence (mastery shading, coverage %, comprehension milestones) | Points cut loose from learning; badges for everything |
| Choice of route and content | A forced linear path; opaque queues [11][19] |
| Low floor plus flexible goal; weekly framing | High daily minimums; all-or-nothing streaks [10][14] |
| Slack: rest tokens, repair, pause [20][21][28] | Streak loss that resets to zero, plus guilt notifications |
| Near goals (goal gradient) | Only distant goals ("C1 someday") |
| Pacing, not binges [5][16] | Leaderboard sprints, 200+ XP days |

### 4. Designing a Mandarin knowledge graph

**Existing attempts.**
- **HanziGraph** (MIT) treats characters as nodes and words as edges between them (确—确定—定), with component trees and "hanzi math" [46] (reported).
- **Make Me a Hanzi** gives IDS decompositions and stroke data for over 9,000 characters, from Unihan/CJKlib and Arphic fonts. Licences differ per file, so check COPYING [45] (verified README; licence details pending, see 05).
- **WaniKani** is the gated-unlock model [22].
- **Graspful** documents an independent FIRe-style scheduler with encompassing weights [55] (reported).
- The **Chinese Grammar Wiki** levels points A1–C2. Its A1 page lists about 40 points; the books cite 95 A2 and 145 B1 points [44] (reported counts). Its content is under a non-commercial Creative Commons licence, so store IDs and links rather than copying text (see 05).
- **Dreaming Spanish** turns hours into a 7-level roadmap: 0/50/150/300/600/1,000/1,500 hours. It was originally calibrated on learners of *Thai* with comprehensible input [42] (verified basis; thresholds reported). For Mandarin, the FSI estimates about 88 weeks / 2,200 class hours, roughly 3× Spanish [43] (reported). Hour milestones should therefore be rescaled rather than copied.

**Scope.** The user's split puts curriculum (25%) and SRS (25%) in the app, and immersion (50%) outside it, in Netflix and similar. So the graph models what the app can *observe*: curriculum lessons and SRS items. Immersion is a separate, self-logged **hours roadmap** shown next to the graph and linked to it only through sentences mined from logged episodes (§5).

**Nodes (three graph layers plus curriculum lessons).**

| Layer | Node types | Roughly how many | Mastery source |
|---|---|---|---|
| Sound | initials (21), finals (~36), tones (4+neutral), tone pairs (20), high-frequency syllables | about 100 | curriculum lesson checks, listening discrimination drills, minimal pairs |
| Script | components / radicals, characters, words | ~300 components, 3–4k characters, 10k+ words (grows with mining) | SRS stability (see 02) |
| Grammar | Chinese Grammar Wiki points A1–C1 | a few hundred | curriculum lesson + SRS on example sentences |
| Curriculum | foundation lessons (about 6 months: pinyin, tones, first words, core grammar), including 5–10 min embedded video lessons | perhaps 60–120 lessons | completion + end-of-lesson check. Each lesson *teaches* a set of Sound/Script/Grammar nodes. |

Plus **cluster nodes** (compound/parent nodes, not edges): "HSK1 characters", "Tone pairs", "A1 grammar", "Foundations unit 3". These give PoE-style landmarks. The **immersion roadmap** (self-logged hours milestones, e.g. 50 / 150 / 300 h rescaled for Mandarin) is drawn as a separate track beside the tree, Factorio-style: an "unlock by condition" lane rather than graph nodes with mastery.

**Edges.**
- `component → character` (composes). FIRe-style encompassing weight around 0.2–0.3: recognizing 好 only partly exercises 女.
- `character → word` (appears in). Weight around 0.3–0.5.
- `syllable / tone pair → word` (pronounced as). Small weight on listening reviews only.
- `word → sentence card` (contains). Weight around 0.5–0.7 for the target word, lower for the others.
- `grammar → grammar` (prerequisite; hand-authored, kept to ≤3 per node following Skycak's guideline).
- `grammar → sentence` (exemplified by).
- `curriculum lesson → Sound/Script/Grammar node` (teaches). Completing a lesson moves its nodes to Learning and creates their SRS cards.
- `lesson → lesson` (sequence / prerequisite).

**Mastery roll-up.**
- *Leaf* mastery comes from the SRS model's stability and retrievability, using WaniKani/Khan-style named states: **New → Learning** (stability < 7 d) **→ Familiar** (≥ 7 d) **→ Solid** (≥ 30 d) **→ Mastered** (≥ 120 d). States can go down when stability decays, as on Khan [24].
- Shade nodes darker as stability rises, the way MA does [6].
- *Cluster* mastery = the frequency-weighted share of children at ≥ Familiar. For example, "HSK1 characters 87%" where 的 counts for more than 鹰.
- Gates are **soft**. A node is "ready" (on the frontier) when its prerequisites are ≥ Familiar. Locked nodes stay tappable and studyable, with a note "prereqs not solid yet". This keeps autonomy [19] and fits Refold's mining-from-content model.

**Frontier.** For the first months, the frontier is mostly "next curriculum lesson(s)". After that, it is "ready but not started" nodes, ranked by (a) frequency in the shows the user has logged and mined from and (b) how many due reviews they would compress. This is the MA task menu adapted to Refold: show about 5 suggestions and let the user choose [8][9].

**Integrating with SRS: can FIRe work for language?**
- *Yes, partly, and in one direction only.*
  - A successful review of a word or sentence gives fractional implicit credit *down* to its characters and components, which pushes their next explicit review later.
  - Following Skycak, give **no** implicit credit to items whose own recent performance is weak (lapses or low stability) [1].
  - **Never let implicit credit move an item into Mastered.** The top states need explicit successes, because gestalt word recognition can hide a character you couldn't recall on its own.
- *Failure propagation should be gentler than in math.* Failing 学生 does not mean you failed 学. We recommend no upward penalty from a word lapse. Instead, flag the word's characters for a near-term *check* review.
- *Repetition compression is the big win.* When the due queue is long (after missed days), first show sentence cards that cover the most due words, and credit those words implicitly. This turns a 200-card backlog into fewer, richer reviews, which is exactly what 02 asks for ("degrades gracefully after missed days").
- *Immersion exposure* can't be observed, because watching happens in Netflix outside the app. The only bridge is sentences the user mines from a logged episode, which become ordinary SRS cards.

### 5. Consistency for a lazy-day user

**The user's actual pattern** (corrected brief):
- The planned time split is **25% curriculum** (in-app structured foundation lessons, about the first 6 months), **25% SRS** (in-app) and **50% immersion** (Chinese shows in the Netflix app, outside ours).
- On lazy days at bedtime the phone screen is *on* and the session is short and **active**: about 15 min of flashcards, or one 5–10 min embedded video lesson.
- Nothing in this design depends on background audio.

The design problem has two parts. First, make the short bedtime session a full "counted" day. Second, credit self-logged immersion, which is half the plan, so that it is (a) rewarded, (b) not easy to inflate, and (c) can't drown out the in-app buckets.

**Two kinds of minutes.**

| Minute type | How measured | XP rate | Input hours | Can extend streak? |
|---|---|---|---|---|
| **Measured in-app**: curriculum lessons (incl. embedded YouTube lessons), SRS reviews, mining | Foreground time with interaction. Per-card cap (e.g. 2× median). Video counted from player "playing" events while the page is visible. | 1.0 XP/min | — | Yes |
| **Self-logged immersion**: Netflix etc. | Manual log (see anti-gaming rules) | 0.5 XP/min, capped at **20 XP/day** | 1.0 h per logged hour | Holds only (max 2 days per 7) |

Why discount logged immersion in XP but not in hours? Immersion is *not* less valuable. Refold treats attentive watching as the core activity [52] (reported). But XP is an *effort-verified* currency, and self-report is noisy. A systematic review of self-reported vs directly measured physical activity found correlations ranging from −0.71 to 0.96, with both over- and under-reporting [41] (reported). So immersion gets full weight in the meter that tracks it (Input hours and the hours roadmap), and partial weight in the meter that drives daily goals and streaks. The 20 XP/day cap means 40 logged minutes is the most immersion can contribute to a day's XP. A Netflix binge can't fill the Standard goal by itself, while the hours roadmap still gets every minute.

**Anti-gaming rules for the immersion log** (light enough to use every day):
1. **Log a specific thing.** Pick a show and episode (from a small saved-shows list or the app's suggestions) rather than typing a bare number. The episode's runtime pre-fills the duration. Logged minutes can't exceed runtime × 1.1. Partial watches use a slider.
2. **Short logging window.** Allow only today or yesterday, with no bulk backfill. (A one-off "import my history" at setup is allowed but goes into hours only, never XP or streaks.)
3. **Two-tap context:** subtitle mode (none / Chinese / English) and a 1–5 comprehension rating. English-subtitle minutes count at 0.5 in hours, which follows Refold's preference for target-language subtitles (reported). The comprehension ratings also become useful data for suggestions.
4. **Hard daily ceiling** of 240 logged min/day for hours. Above that needs an explicit "long day" confirmation.
5. **A verified bridge:** sentences mined from a logged episode (entered in-app, tagged with the episode) earn normal in-app XP, and give that log entry a ✓ "mined from" badge. This is the only way immersion creates graph progress. It rewards the high-value behaviour (mining) without needing to verify watch time.
6. **Weekly honesty mirror** in the weekly summary: logged hours vs sentences mined vs average comprehension. This isn't a penalty. With one user, inflating the log only fools the user, and the mirror makes that visible.

**Three-tier day.** One goal number per day. Balance is shown, not enforced (see below).

| Tier | Meaning | Default threshold (tunable) | Effect |
|---|---|---|---|
| **Floor** ("kept the flame") | Never-zero; the bedtime day | **≥ 8 measured in-app XP**: roughly 10 min of flashcards *or* one 5–10 min video lesson | Extends the streak |
| **Standard** | The real goal | User-set daily XP, default **30**. At the planned split that's about 8 curriculum + 8 SRS + up to 20 from logged immersion (40 min) | Fills the day ring; counts toward the weekly goal |
| **Stretch** | Bonus | ≈ 2× Standard, capped around 60 (MA's sustainable ceiling [5]) | Gold ring; no extra streak value, so there's nothing to binge for [16] |
| *(Immersion-only day)* | Watched but didn't open the app | ≥ 30 logged min, no in-app activity | **Holds** the streak without extending it, max 2 per rolling 7 days |

Notes:
- The Floor only counts *measured* minutes, so it can't be met by typing a number. Yet it's small enough for the user's real bedtime session.
- Planned rest is handled by rest tokens (below), not by lowering the Floor.

**Should the daily goal reflect 25/25/50?** *Not as a daily rule, yes as a weekly view.*
- A daily balance rule would turn the user's legitimate lazy day (flashcards only) into a failure, and day-to-day mixes vary naturally: a Netflix evening, then an SRS-only bedtime.
- Instead, the **weekly ring has three segments** (Curriculum / SRS / Immersion) drawn against the target split, using *minutes* (logged immersion at full value), not XP.
- When a bucket falls behind by mid-week, the frontier menu nudges toward it, e.g. "Immersion is at 30% of target. Here are 3 episode suggestions." That is a suggestion, never a lock. This keeps autonomy [30] and borrows the goal gradient (a near, visible gap) [31].
- **The split changes over time.** After the foundation curriculum (about 6 months), its 25% should move to SRS and immersion (e.g. 0/30/70). Store the split as phases the user can edit, and offer the switch when the curriculum track is finished.

**Streak protection.**
- **Rest tokens** (emergency reserves [21]): earn 1 for every 7 Floor-or-better days, hold at most 2, like Duolingo's 2 equipped freezes [15]. A token is used automatically on a missed day. A token day *preserves* the streak but doesn't extend it (Brilliant's rule [25]).
- **Repair** [20]: within 48 h of a break, do a *Standard* day (with ≥ 15 measured XP) to restore the streak. Recovery should cost a bit of effort and always be possible.
- **Planned rest days and pauses** [28]: per-weekday goals (for example a lower Sunday target) and "pause" for illness or travel, which freezes the streak and the weekly goal.
- **Don't lead with streak length.** The headline numbers should be **days studied in the last 30** and the **weekly goal** (Strava-style weekly streak [27]). The daily chain is shown as a calendar heatmap, so a break is one grey square, not a reset to zero.

## Implications for the app

**Effort, input and knowledge as three meters**
- `MUST` Define XP as focused minutes in three buckets. **Curriculum** and **SRS** are measured in-app at 1.0 XP/min, excluding idle time and with per-card caps. Embedded video lessons count while playing and visible. **Immersion** is self-logged at 0.5 XP/min, capped at 20 XP/day.
- `MUST` Keep XP (effort), Input hours (self-logged immersion at full weight) and Knowledge (graph mastery of curriculum and SRS items) as separate meters. Don't convert one into another, following Math Academy's "Progress vs XP" [3].
- `MUST` Make the immersion log specific and bounded: show + episode with runtime pre-filled (≤ runtime × 1.1), today/yesterday only, subtitle mode + comprehension rating, a 240 min/day ceiling, and no XP or streak credit for setup backfill.
- `SHOULD` Link mined sentences to the logged episode they came from, award in-app XP for mining, and mark the log entry "mined from" ✓.
- `SHOULD` Add a weekly "honesty mirror": logged hours vs sentences mined vs comprehension trend.
- `SHOULD` Show a completion projection ("foundations done by …", "at your 30-day pace you'll reach 300 immersion hours on …"), like MA's projected dates [7][11].
- `COULD` Show the XP/minute "focus rate" privately in the session summary [4][10].
- `COULD` Count English-subtitle immersion at 0.5 in hours.

**Daily goals and streaks**
- `MUST` Use a three-tier day (Floor / Standard / Stretch). The streak threshold is Floor, separate from the Standard goal [14].
- `MUST` Set the Floor at ≥ 8 *measured* in-app XP, so the user's bedtime session (about 10–15 min of flashcards or one 5–10 min video lesson, screen on) fully counts. Don't build background-audio or screen-off modes.
- `MUST` Let an immersion-only day (≥ 30 logged min) *hold* but not extend the streak, at most 2 per rolling 7 days.
- `MUST` Add rest tokens (earned 1 per 7 days, max 2), 48-hour streak repair, and a pause mode [20][21][25][28].
- `SHOULD` Show the 25/25/50 split as a weekly three-segment ring in minutes, with mid-week frontier nudges toward a lagging bucket. Don't enforce balance per day.
- `SHOULD` Store the target split as editable phases (e.g. 25/25/50 during foundations, then about 0/30/70) and offer the switch when the curriculum track is done.
- `SHOULD` Lead with "days in last 30" and a weekly goal (Standard × 5) rather than raw streak length. Show the daily chain as a heatmap.
- `SHOULD` Support per-weekday Standard targets [28].
- `SHOULD` Add an implementation-intention prompt at setup: "After I ___, I will ___" (e.g. "After I get into bed, I'll do my flashcards") [34][35].
- `COULD` Add a one-tap "bedtime session" on the phone that starts due flashcards, or the next short video lesson if none are due, and stops at about 15 min with a "Floor done ✓" moment.

**Knowledge graph**
- `MUST` Scope the graph to what the app observes. Model three node layers (Sound, Script, Grammar) plus curriculum lesson nodes and cluster nodes. Script edges come from decomposition data, grammar edges are hand-authored with ≤ 3 prerequisites per node, and lessons link to the nodes they teach. Show immersion as a separate hours-roadmap track.
- `MUST` Derive leaf mastery from the SRS model's stability, with named states (New / Learning / Familiar / Solid / Mastered) that can decay.
- `MUST` Use soft gates: frontier = prerequisites ≥ Familiar. Never hard-lock content.
- `SHOULD` Give FIRe-lite implicit credit: fractional credit *downward* only, none for weak items, never into Mastered.
- `SHOULD` Use repetition compression in the review selector, preferring sentence cards that cover several due items. Coordinate with 02's backlog handling.
- `SHOULD` Rescale the hour milestones for Mandarin rather than copying Dreaming Spanish's Spanish thresholds [42][43].

**Visualization**
- `MUST` On mobile, use a frontier list ("Next lesson / Ready to learn: 5 suggestions") plus cluster progress rings and the weekly three-bucket ring as the main progress UI. Never draw the full graph on a phone.
- `SHOULD` Use Cytoscape.js for the zoomable map. It is framework-agnostic and canvas-rendered, with touch gestures built in, compound (cluster) nodes, and dagre/ELK/fCoSE layouts, and handles thousands of elements on average hardware [48]. Precompute and store layout positions so phones don't run layout.
- `COULD` Use React Flow (if the app is React) for a small hand-curated tree such as the about 100-node Sound layer, where custom React node components are worth it. All nodes render by default, and performance depends on avoiding re-renders, so keep it to hundreds of nodes or fewer [49][50].
- `COULD` Add a Sigma.js (WebGL + graphology, multi-touch) "constellation" view of every known character and word, as an occasional rewarding view of how much is known [51].
- `COULD` Skip d3-force: it's low-level, you build everything yourself, and force layouts drift and suit DAG tech trees poorly. Only use it for a bespoke animation.

**Deliberately leave out**
- `MUST NOT` (recorded as a constraint): leagues and leaderboards, since there is one user and the evidence is mixed [37][38].
- `MUST NOT`: negative XP. There are no graded guessing loopholes worth policing, and it punishes a lazy-day user.
- `MUST NOT`: hearts/lives, gems, a shop, loot or random rewards, streak wagers, and guilt-trip notifications [36].
- `MUST NOT`: hard content locks or a forced linear path [19].
- `SHOULD` Celebrate milestones based on real competence (e.g. 100 characters Solid, first episode at ≥ 90% comprehension), with occasional informational surprises instead of random rewards [15][31].

## Open questions

1. **Standard daily target:** 30 XP (MA's middle band), or derived from the user's actual first-2-week average? And should the headline unit be daily or weekly? (User decision.)
2. **Immersion weights and caps** (0.5 XP/min, 20 XP/day cap, 240 min/day ceiling, immersion-only days hold the streak at most 2 per 7, English-sub minutes at 0.5 hours): these are reasoned defaults, not evidence-based constants. Tune after about 4 weeks of real data. The user should also decide whether an immersion-only day should be allowed to *extend* the streak.
3. **Episode runtimes:** where do pre-filled durations come from? A hand-kept saved-shows list is simplest. A metadata API (e.g. TMDB) has terms and licensing questions for 05. And does the app suggest Netflix titles itself (see 03)?
4. **Mandarin hour roadmap:** what multiplier over the Dreaming Spanish thresholds? Is the FSI's ~3× right for *listening* hours specifically, or too pessimistic? Doc 01 and 03 may inform this.
5. **Encompassing weights:** a flat default per edge type, or per-item weights (e.g. phonetic-component characters get more credit)? Hand-tuning thousands of edges isn't feasible, so we need a rule.
6. **Curriculum authoring:** how many foundation lessons, and how much grammar-graph authoring is worth it? A few hundred grammar nodes with ≤ 3 prerequisites each is perhaps 10–20 hours. Licensing of Chinese Grammar Wiki text and YouTube embeds is for 05. The lesson sequence is for 03.
7. **Post-foundation split:** what replaces the curriculum's 25% after about 6 months (e.g. 0/30/70)? This is a user decision.
8. **Relatedness for a solo user:** is a weekly summary shared with the friend who recommended Math Academy wanted, or not?
9. **Does the user want visible XP at all,** or only rings, hours and mastery? Some Refold learners prefer pure hours tracking.

## Sources

1. Skycak, *Optimized, Individualized Spaced Repetition in Hierarchical Knowledge Structures*. https://www.justinmath.com/individualized-spaced-repetition-in-hierarchical-knowledge-structures (FIRe mechanics, encompassing weights, compression, learning speed; verified)
2. Skycak, *How Math Academy Creates its Knowledge Graph*. https://justinmath.com/how-math-academy-creates-its-knowledge-graph/ (2,500 topics, knowledge points, hand-built, ~250 h of weights; verified)
3. Skycak, *The Math Academy Way* (books page with TOC; PDF draft). https://www.justinmath.com/books (chapter structure: frontier, encompassings, gamification, Progress vs XP; verified TOC)
4. Skycak, *The Math Academy Way FAQ*. https://www.justinmath.com/the-math-academy-way-faq/ (XP calibration, negative-XP triggers, habit protection; verified)
5. Skycak, *What's the Highest Sustainable Daily XP on Math Academy?* https://www.justinmath.com/what-is-the-highest-sustainable-daily-xp-on-math-academy/ (1 XP ≈ 1 min, 50–60 XP/day ceiling; verified)
6. Math Academy, *How It Works*. https://mathacademy.com/how-it-works (diagnostic, frontier, mastery, leagues, daily goals; verified)
7. Math Academy, *FAQ*. https://mathacademy.com/faq (negative XP, 20–40 XP/day 3–5 days/week, quizzes, implicit reviews; verified)
8. Skycak, *Max-Efficiency Learning in a Nutshell*. https://justinmath.com/max-efficiency-learning-in-a-nutshell/ (three-principle summary; verified)
9. Chad Nauseam, *The Game Design of Math Academy*. https://chadnauseam.com/coding/gamedev/the-game-design-of-math-academy (user view of XP, leagues, choice; verified)
10. *My First Month with Math Academy* (LessWrong). https://www.lesswrong.com/posts/HxtYuHpa3jzrWsrdm/my-first-month-with-math-academy-an-experience-report-from-a (focus rate, weekly target, frustrations; verified)
11. Andy Matuschak, notes on Math Academy. https://notes.andymatuschak.org/Math_Academy (critique: opaque queue, conservative implicit credit, weak visuals; verified)
12. Frank Hecker, *A Year of Math Academy*. https://frankhecker.com/2026/01/10/a-year-of-math-academy/ (53 XP/day average over a year; verified)
13. Antoine Buteau, *Lessons from Jason Roberts of MathAcademy*. https://www.antoinebuteau.com/lessons-from-jason-roberts-of-mathacademy/ (Roberts on feedback, smooth gradient, distributed practice; verified)
14. Duolingo, *Improving the streak*. https://blog.duolingo.com/improving-the-streak (streak separate from goal: +3.3% D14 retention; 7-day streak 2.4×; verified)
15. Duolingo, *Streak research*. https://blog.duolingo.com/duolingo-streak-research/ (freezes +0.38% DAU, milestone animation +1.7%, loss aversion; verified)
16. Duolingo, *How streaks keep learners committed*. https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals (Weekend Amulet, binge learners abandon, downsides; verified)
17. Duolingo, *Leagues & leaderboards*. https://blog.duolingo.com/duolingo-leagues-leaderboards/ (5→10 leagues; reported)
18. Duolingo, *New home screen design*. https://blog.duolingo.com/new-duolingo-home-screen-design (path rationale; reported)
19. UX Collective, *Down the wrong path*. https://uxdesign.cc/down-the-wrong-path-the-disaster-of-the-latest-duolingo-ui-update-a4cdd1e6ea1c (path backlash, loss of choice; reported)
20. Silverman & Barasch, *On or Off Track: How (Broken) Streaks Affect Consumer Decisions*, JCR 2023. https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions (broken streaks cause disengagement; repair weakens the effect; reported)
21. Sharif & Shu, *Nudging persistence after failure through emergency reserves*, OBHDP 2021. https://anderson-review.ucla.edu/wp-content/uploads/2021/03/Sharif-Shu_EmergencyReserveFailure_OBHDP2019.pdf (slack increases persistence; reported)
22. WaniKani, *SRS Stages*. https://knowledge.wanikani.com/wanikani/srs-stages/ (stages, intervals, Guru unlocks; verified)
23. WaniKani, *Level Progress*. https://knowledge.wanikani.com/widgets/level-progress/ (90% of kanji at Guru to level up; reported)
24. Khan Academy, *How do Khan Academy's Mastery levels work?* https://support.khanacademy.org/hc/en-us/articles/5548760867853 (named levels that can decay; reported)
25. Brilliant, *What is a Streak Charge?* https://brilliant.org/help/features/what-is-a-streak-charge/ (earned freezes that preserve but don't extend; reported)
26. Brilliant, *Leagues and leaderboards*. https://brilliant.org/help/features/what-are-leagues-and-leaderboards (weekly 30-person leagues; reported)
27. Strava, *Streaks on Strava*. https://support.strava.com/hc/en-us/articles/36553427481997-Streaks-on-Strava (weekly streak, restore after the fact; reported)
28. Macworld, *How to pause Apple Watch Activity rings*. https://www.macworld.com/article/2446605/how-to-pause-apple-watch-activity-rings.html (pause rings, per-day goals; reported)
29. HSKLord, *Hack Chinese review* (competitor's write-up). https://hsklord.com/blog/hack-chinese-review (Hack Chinese HSK-list percentages, consistency chart; reported)
30. Ryan & Deci (2000), *Self-Determination Theory and the Facilitation of Intrinsic Motivation*. https://selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf (autonomy, competence, relatedness; reported)
31. Kivetz, Urminsky & Zheng (2006), *The Goal-Gradient Hypothesis Resurrected*. https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf (acceleration near the goal, illusory progress; reported)
32. Deci, Koestner & Ryan (1999), meta-analysis on rewards and intrinsic motivation. https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf (overjustification; reported)
33. Lally et al. (2010), *How are habits formed* (summary). https://www.thebehavioralscientist.com/articles/how-long-to-form-a-habit (66-day median, 18–254 range, single misses OK; reported)
34. Gollwitzer & Sheeran (2006), implementation intentions meta-analysis. https://kops.uni-konstanz.de/entities/publication/2e749bfb-8533-437c-8203-7e788c910c5f (d = 0.65 across 94 tests; reported)
35. BJ Fogg, *Tiny Habits* recipe card (Stanford). https://med.stanford.edu/content/dam/sm/ascend/documents/Introduction_%20Tiny%20Habits%20for%20Self%20Compassion,%20Getting%20Started.pdf (anchor → tiny behaviour → celebrate; reported)
36. Nir Eyal, *Variable Rewards*. https://www.nirandfar.com/2012/03want-to-hook-your-users-drive-them-crazy.html (tribe/hunt/self rewards; reported)
37. Hanus & Fox (2015), *Assessing the effects of gamification in the classroom*, Computers & Education 80. https://www.smhp.psych.ucla.edu/pdfdocs/gamil.pdf (gamified course reduced motivation over time; reported)
38. Mekler et al. (2017), *Towards understanding the effects of individual gamification elements…*, CHB 71. https://glassmanlab.seas.harvard.edu/annotated_works/mekler17.pdf (points/levels/leaderboards raise quantity only; reported)
39. Sailer & Homner (2020), *The Gamification of Learning: a Meta-analysis*. https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056 (positive effects; motivational effects less stable; reported)
40. Kahneman & Tversky (1979), *Prospect Theory*, Econometrica 47(2). https://www.jstor.org/stable/1914185 (loss aversion; reported, standard reference)
41. Prince et al. (2008), *A comparison of direct versus self-report measures for assessing physical activity in adults: a systematic review*, IJBNPA 5:56. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2588639/ (self-report vs measured: correlations −0.71 to 0.96, both over- and under-reporting; reported)
42. Dreaming Spanish, *What are the 7 levels … based on?* https://dreamingspanish.freshdesk.com/support/solutions/articles/158000407386-what-are-the-7-levels-and-the-number-of-hours-for-each-one-based-on- (roadmap calibrated on Thai learners; verified). Thresholds 0–1,500 h from community pages (reported).
43. U.S. FSI, *Foreign Language Training* (language difficulty). https://www.state.gov/foreign-language-training/ (Mandarin ~88 weeks / 2,200 h vs Spanish 24–30 weeks; reported via secondary sites)
44. Chinese Grammar Wiki, *Grammar points by level*. https://resources.allsetlearning.com/chinese/grammar/Grammar_Points and A1 list https://resources.allsetlearning.com/chinese/grammar/A1 (levels; ~40 A1 points; NC Creative Commons licence; verified levels and licence footer, counts reported)
45. Make Me a Hanzi. https://github.com/skishore/makemeahanzi (IDS decompositions for 9,000+ characters; split licences; verified README)
46. HanziGraph. https://github.com/mreichhoff/hanzigraph (characters as nodes, words as edges; reported)
47. Anki forums, *Interval determination of siblings*. https://forums.ankiweb.net/t/interval-determination-of-siblings/49267 (FSRS/SM-2 can't see other cards' history; reported)
48. Franz et al. (2016), *Cytoscape.js: a graph theory library for visualisation and analysis*. https://pmc.ncbi.nlm.nih.gov/articles/PMC4708103 (touch gestures out of the box, thousands of elements; reported)
49. React Flow, *Performance*. https://reactflow.dev/learn/advanced-use/performance (re-render pitfalls, collapse large trees; reported)
50. React Flow, *Layouting*. https://reactflow.dev/learn/layouting/layouting (dagre vs ELK trade-offs; reported)
51. Sigma.js. https://www.sigmajs.org (WebGL, graphology, multi-touch; reported)
52. Refold, *Activities Explained* (roadmap 0A). https://refold.la/?p=53342 (attentive "active immersion" is the core activity where most acquisition happens; reported: page redirected on fetch, content from search snippet; see 01)
53. PoE Wiki, *Passive skill*. https://www.poewiki.net/wiki/Passive (large clustered tree with notables; node count ~1,300 reported)
54. Factorio Wiki, *Research*. https://wiki.factorio.com/Research (prerequisites, queue, condition-triggered unlocks; reported)
55. Graspful, *Spaced Repetition* concept doc. https://graspful.vercel.app/docs/concepts/spaced-repetition (third-party FIRe-style scheduler; reported)
