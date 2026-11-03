# sandbox

Temporary and experimental work: mockups, spikes, throwaway prototypes. Nothing in the app imports from here, and anything in it can be deleted once it has served its purpose. Decisions it leads to are recorded in `docs/`.

| Path | What it is |
|---|---|
| `ui-mockups/index.html` | A Figma-style board of static phone mockups, grouped into flows with arrows and sticky notes, for nailing the UI/UX before building. Open it in a browser: drag to pan, scroll or pinch to zoom, F to fit, and a light/dark toggle (dark by default). The proposal behind it is [docs/design/app-ui-flow.md](../docs/design/app-ui-flow.md). |
| `data/` | Large source datasets the spikes read, gitignored. `python sandbox/data/fetch_common_voice.py` downloads Common Voice zh-CN 27.0 (about 23 GB, CC0) into `data/common-voice-zh-CN/`, then deletes the archive. It needs `MOZILLA_DATA_COLLECTIVE_API_KEY` in the repo-root `.env.development.local`. |
| `spikes/activity-pilot/` | Spike C: local Vue app running three lessons through the lesson arc (rotating openers, examples, practice in rotating formats), for tuning feel. `npm run dev`, then open on the phone over Wi-Fi. |
| `spikes/media-ingest/` | Spike A: automatic CC audio → validated, timed clips on the laptop GPU. See its FINDINGS.md. |
| `spikes/clip-coverage/` | Spike B: can S1/S2 be filled with lesson-eligible native sentences? See its FINDINGS.md. |
| `spikes/sync-replay/` | Spike D: two-device event-log sync and FSRS replay correctness and performance. See its FINDINGS.md. |
| `spikes/authoring-format/` | Spike E: lesson authoring format, mini toolchain, zh analyzer accuracy. See its FINDINGS.md. |
| `spikes/figure-drawing/` | Spike F: making LLM-authored lesson figures look better without image models. Compares raw SVG, a render-and-critique loop, a scene spec plus parts library, and emoji. Run `node src/build.mjs`, then open `index.html`. See its FINDINGS.md. |
| `spikes/elevenlabs-check/` | ElevenLabs v4 test: a trap-heavy test text, `gen.py` to synthesize (key from `.env.development.local`), and `check.py` for a Whisper round trip. Audio is gitignored. |
| `spikes/tts-grader/` | Deterministic tone grader (forced alignment plus a tone classifier) run on native Common Voice speakers and ElevenLabs v4. See its README. |
