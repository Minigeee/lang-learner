# Activity pilot (spike C)

A local-only Vue app for iterating on how lessons **feel** before content production starts. Each lesson runs the arc from [brainstorm §4](../../../docs/design/activity-brainstorm.md): Start → opener → How it works (the I do) → Examples or Read along (the we do) → Practice (the you do) → a short end card. Flashcard and skill review aren't in scope.

| Lesson | Shape | Opener | We do | Practice format |
|---|---|---|---|---|
| Four tones on one syllable (0.1) | Sound practice | Puzzle (mystery) | Examples: two syllables in four tones | Pick one (`choice-pad`, ladder: one syllable → new syllables) |
| 不 vs 没 (1.13) | Lesson | Compare (showdown) | Examples: pairs in several voices, 不/没 lit | Catch the mismatch (`mismatch`) |
| Where's the cat? (1.7) | Video lesson | Listen (story) | Read along (`clip-study` stepper) | New clip (`clip-study` listen-check) |

- **Start** shows the steps, marks a practice format you haven't met as New, and offers *I already know this*, which jumps to Practice. 80% right on the first try marks the lesson done.
- **A new practice format gets a one-line introduction** the first time it appears. "Reset format intros" on the home screen shows them again.
- **The end card** adds the lesson's skill card (`card_added` with template `skill`; see the Events drawer). In the app, that card reviews in the same practice format.
- `odd-one-out` is built and registered but no pilot lesson uses it; swap it into a lesson's practice to try it.

## Run it

```bash
npm install
npm run dev
```

- **Laptop:** open http://localhost:5173.
- **Phone, same Wi-Fi:** open `http://<laptop-ip>:5173`. The laptop's address was `192.168.1.72` when this was written. If the phone can't connect, allow Node through Windows Firewall for private networks.

Nothing connects to the internet at runtime. Fonts and icons are served from `node_modules`.

## Audio is a placeholder

There are no native recordings yet. `src/core/media.ts` synthesizes a pitch-contour hum in four synthetic "voices", so the tone lesson is genuinely playable by ear. The synth can't tell 不 from 没 in a sentence, so placeholder **sentences** show their text by default. Single syllables don't.

To swap in real clips, set `src` on clips in `src/content/clips.ts`, for example to files produced by the media-ingest spike. Nothing else changes; that's the media boundary being tested.

## Where the feel lives (knobs to tune)

| Knob | Where | Now |
|---|---|---|
| Pause after a correct answer before the next item | `ChoicePad.vue` `CORRECT_ADVANCE_MS` | 650 ms |
| How far back a missed item returns | `trialRunner.ts` `RETRY_GAP` | 3–5 items |
| Practice pacing: hits to climb a rung, hits on the top rung to finish, time cap, retry cap | `trialRunner.ts` `PRACTICE_PACING` | 3, 5, 180 s, 4 |
| Gap between clips when a set plays (mismatch, odd one out) | `useSetChallenge.ts` `SET_GAP_MS` | 380 ms |
| Gap between clips in openers and examples | `usePlaylist.ts` `GAP_MS` | 420 ms |
| Test-out pass mark | `DoneStep.vue` `TEST_OUT_PASS` | 80% |
| Auto-play delay when an item appears | `ChoicePad.vue` `advance()` | 220 ms |
| Miss replay: yours, then the answer | `MissCard.vue` `replayBoth()` | 300 ms, then a 250 ms gap |
| Step transition | `styles/base.css` `.rise-*` | 220 ms rise |
| Placeholder voices (pitch) | `content/clips.ts` `SPEAKERS` | 4 voices |

## Contract being tested

- **Widgets render and report picks.** The trial runner (`src/core/trialRunner.ts`) owns order, the rung ladder and pacing, scoring, instant feedback, retries in a new voice, and card-on-second-miss.
- **Definitions are separate from views.** Definitions live in `src/core/lesson.ts` (`WIDGETS`: activity type, output level, time estimate, evidence targets). Views live in `src/components/widgetViews.ts`.
- **Events are the only write path** (`src/core/events.ts`). The Events button shows them live.

## Not in scope

There's no persistence, sync, SRS scheduling, real native audio, language pack or content compilation. Other spikes cover those.
