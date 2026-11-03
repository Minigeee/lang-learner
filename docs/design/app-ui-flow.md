# App UI and screen flow (proposal)

A phone-first layout for the v1 app, built on the research decisions in [docs/research/README.md](../research/README.md) and the lesson design in [activity-brainstorm.md](activity-brainstorm.md). Proposal only: nothing here is decided until the user agrees.

**Mockups:** [sandbox/ui-mockups/index.html](../../sandbox/ui-mockups/index.html) (open in a browser) is a pan-and-zoom board, with a light/dark toggle, that lays out 14 static phone screens as flows: Today, Path (unit graph), Progress, Watch, the log sheet, four lesson-player steps including a Clip pass, review, the session summary, item detail and the test-out result.

## Design goals

1. **One tap to a useful session.** The main use is fragmented time and 15-minute bedtime sessions, so the home screen leads with "how long do you have?", not a menu.
2. **Never show a pile.** No "1,043 due". Reviews show as a capped, timed batch (doc 02).
3. **Progress is about knowledge and time, not points.** Lead with "days studied in the last 30", the three-bucket weekly ring and frontier suggestions. XP is secondary (README decision 9 is still open).
4. **Phone ergonomics.** Media at the top, controls in the bottom 40%, one-handed, no typing by default (brainstorm §1.0).
5. **Nothing is locked.** Every unit can be opened, and any lesson or stage can be tested out of.

## Visual hierarchy rules (revision 2, 2026-11-02)

1. **One primary action per screen.** Only that action gets a filled button, and everything else is outlined or a plain row.
2. **Three text levels only:** screen title (20 px, medium), body (14 px), metadata (12 px, muted).
3. **Color encodes state only:** green = done, blue = current or action, dashed outline = ready, gray = later. Watching, lessons and cards keep fixed bucket colors wherever minutes appear.
4. **Cards only for tappable things.** Everything else sits under plain section labels.

## Visual style (revision 3, 2026-11-02)

The mockups board has a Style frame showing all of this.

- **Type.**
  - Lexend for all UI text.
  - Noto Sans SC for Chinese at body size, and Noto Serif SC for display hanzi (review cards, item titles, answer buttons). The serif is the one touch of flair.
  - Scale: display 32/500, title 20/600, headline 16/500, body 14/400, meta 12/400.
  - Numbers are tabular.
- **Color (revision 6).** Three hues, a cool neutral, and warm neutrals. There is **no "wrong" color**:
  - **Cinnabar:** brand, anything you can tap, and where you are now: the single primary button, selected chips, the current node and line, the active tab, flow arrows. The dark-mode fill is #C9452E, which passes 4.8:1 with white text.
  - **Jade:** correct, done, known. The right answer after a miss is marked in jade.
  - **Ink blue:** watching outside the app. It's used for the Netflix log, show posters, subtitle badges, the watching share of the time split, and listening hours.
  - **Slate (cool neutral):** "take another look". It's used for misses, weak test-out units, items sent back to review, and the ✗ example in an explanation. It's calm and clearly not a warning, and its cool hue separates it from the warm decorative neutrals. Text on slate passes 6.2:1 (light) and 7.4:1 (dark).
  - **Warm neutrals:** surfaces, decoration and anything with no meaning attached (tips, figures, "cards added").
  - **Rule: accent only on neutral surfaces.** A tinted card never contains accent-colored controls, because two saturated hues stacked together clash. Feedback lives on neutral cards with a slate marker.

  Time-split bars use cinnabar for lessons, jade for cards and ink for watching.
  - *Tried and dropped:*
    - Revision 4: a separate indigo, violet or cobalt interaction hue. It clashed on the amber miss card just as cinnabar did.
    - Revision 5: slate for watching. It was too close to the warm neutrals.
- **Icons.** Tabler outline icons: 18 px inside tinted 34 px rounded chips in lists, 22 px in the tab bar. A chip is tinted only when it carries a meaning above (tappable, correct or done, watching, another look), and is warm-neutral otherwise.
- **Brand mark.** A cinnabar rounded-square seal with 学 in serif.
- **Detail-heavy screens are trimmed:**
  - Item detail uses three stat tiles and drops the long evidence line.
  - Watch drops the subtitle-mix breakdown in favor of a badge on each recent show.
  - The log sheet uses three segmented controls, with "how much did you follow" as A little / Some / Most instead of 1–5.
  - Review drops the per-word gloss line (words are tappable instead).
  - The "we do" miss feedback is one line plus the two replay chips.

## UI copy: no internal terminology

Pedagogy and design terms stay in docs and board annotations, never in user-facing text. The mapping:

| Internal term (docs) | User-facing copy |
|---|---|
| Lesson steps: Hear it / Explain / We do / You do | Listen / How it works / Practice / Check |
| Floor (minimum day) | "Tonight counts" |
| Lesson shapes: Clip / Pattern / Sound / Checkpoint | Video lesson / Lesson / Sound practice / Check |
| Multi-pass listening ("pass 2") | "Watch 2 of 3", "Watch again · no subtitles" |
| Stage codes S0, S1, S2 | Stage names (Sounds, Stage 1) |
| Tested out, prerequisites | "Marked as known" |
| Strands, Refold categories, output levels, encompassing | Never shown |

## Navigation

Four bottom tabs, plus a profile icon for settings.

| Tab | Purpose | Main contents |
|---|---|---|
| **Today** | Start studying | Time picker (5 / 15 / 30 / 60), "continue" card, today's plan, reviews as minutes, Floor / Standard / Stretch ring |
| **Path** | The curriculum, drawn as a graph | A vertical flowchart of units with prerequisite edges, laid out by dependency depth (at most 3 lanes on a phone). Units / Items toggle: Items is the item-level knowledge map. Tapping a unit opens a docked panel (builds on / unlocks, primary action) and highlights its incoming edges. Completed stages collapse into one node |
| **Progress** | Four answers, top to bottom | 1. This week: time against goal, split into lessons / cards / watching. 2. Consistency: days in the last 30, plus a heatmap. 3. What you know: words, grammar, characters, sounds at Familiar or better, against HSK targets. 4. Listening hours against the next milestone. The frontier list and map move to Path |
| **Watch** | Immersion outside the app | Log a show (one tap for recent ones), suggestions by difficulty, subtitle-switch check, watch history |

Settings sit behind the profile icon: daily goal, review budget in minutes, desired retention, day start, credits and licenses, flagged content.

## Screens

| Screen | Reached from | Notes |
|---|---|---|
| Login | app start | Email OTP code (doc 05), sessions refresh silently |
| First-run setup | after first login | Daily goal, an implementation intention ("After I get into bed, I'll…"), and an offer to take the S0 test-out checkpoints |
| Today | tab | The hub; see mockup |
| Session runner | Today time picker, continue card | A queue of blocks (review batch, lesson, re-watch) built by the session builder. A progress strip at the top; stop anytime, resume later. Ends with a summary that marks Floor or Standard met |
| Lesson player | session runner, Path, item detail | The six skeleton steps as a step strip: Idea → Hear it → Explain → We do → You do → Cards. The widget for each step comes from the lesson file |
| Review | session runner, Today | Audio-first cards with 2 buttons (README decision 7 open). After the cap: "Done for today" plus an opt-in "20 more" |
| Unit view | Path | Lessons with status (not started / in progress / complete / tested out), the unit's free-watch videos, "I know this" |
| Checkpoint | Unit view, Path stage header, item detail | Unseen-voice items; result per unit, with weak areas linking straight to their lessons |
| Item detail | Progress, tapping a word anywhere | A word, character, grammar point or sound contrast: mastery state, evidence history, lessons that teach it, its cards, example lines with audio, components (for characters) |
| Graph map | Progress "Open map" | Zoomable Cytoscape graph; mostly a desktop view. Never the phone's default |
| Log watching | Watch tab, Today shortcut | Bottom sheet: show and episode (runtime pre-filled), minutes, subtitle mode (none / zh / dual / en), engagement, comprehension 1–5. Today or yesterday only |
| Weekly review | Progress, Sunday prompt | Split vs target, days in last 30, hours to next milestone, projected dates |

## Path tab details (revision 1, list layout; superseded by the graph layout above)

- **Stage cards:** the current stage is open and the others are folded, so the phone list stays short. A tested-out stage shows a badge and how many units are left to review.
- **Unit rows:**
  - one status icon (complete / in progress / not started) and a lesson count;
  - "Next" marks the recommended unit;
  - a long stage shows about 6 units around your position, with "Show all".
- **Unit view:**
  - "Builds on" chips show direct prerequisites as suggestions (tap one for a one-line refresher), never as locks;
  - each lesson row shows its shape and minutes, and "Resume" if you're partway in;
  - the unit's free-watch videos, which are watch-only embeds;
  - "I know this", which opens the unit's checkpoint.
- **Test-out result:**
  - the score against the pass mark;
  - results for each unit, with weak units flagged;
  - an explanation of what "tested out" means: it counts for prerequisites, and mastery is capped at Familiar until it shows up in reviews (doc 08 F5);
  - one "start lessons" action covering only the weak units.

## Key flows

1. **Bedtime 15:** open the app → Today → tap "15 min" → the session runner plays a review batch, then one easy lesson (no new grammar) → summary "Floor met" → close. 2 taps to start.
2. **Normal chunk:** Today → "continue" card resumes the lesson mid-step. Or pick "30 min" for a full unit.
3. **Test out:** Path → S0 header → "I know this" → Checkpoint (3 short parts) → results: passed units marked tested out, weak units listed with "Start lesson".
4. **Log Netflix:** Watch (or the Today shortcut) → tap a recent show → minutes pre-filled → pick subtitle mode → save. About 3 taps.
5. **Explore:** Progress → frontier suggestion "了 after the verb" → item detail → "Start lesson" → lesson player.

## Open questions

1. **Four tabs, or fold Watch into Today?** Watch is a quick log most days, so it could be a Today shortcut plus a Progress section.
2. **How visible should XP be?** The mockups show minutes and rings only.
3. **Does the Today plan auto-pick content,** or offer 2–3 choices? Math Academy offers a small menu (doc 04). The proposal auto-picks with a "swap" button.
4. **Desktop layout:** the same tabs as a left rail, with the graph map and lesson explanations getting wider panes. Is that worth any special effort in v1?
