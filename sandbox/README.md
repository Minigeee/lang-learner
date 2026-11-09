# sandbox

Temporary and experimental work: mockups, spikes, throwaway prototypes. Nothing in the app imports from here, and anything in it can be deleted once it has served its purpose. Decisions it leads to are recorded in `docs/`.

Code from `spikes/sync-replay` (events, sync) and `spikes/authoring-format` (id grammar) now lives in `packages/core`, and the design tokens from `spikes/activity-pilot` are in `apps/web`. `spikes/authoring-format` also went into `packages/content-tools`, the audio spikes into `tools/media-ingest`, and `dependency-check`'s vocabulary and path checks became `content:check` rules. [Build phases §4.2](../docs/design/build-phases.md) lists where each spike goes next.

| Path | What it is |
|---|---|
| `ui-mockups/index.html` | A Figma-style board of static phone mockups, grouped into flows with arrows and sticky notes, for nailing the UI/UX before building. Open it in a browser: drag to pan, scroll or pinch to zoom, F to fit, and a light/dark toggle (dark by default). The proposal behind it is [docs/design/app-ui-flow.md](../docs/design/app-ui-flow.md). |
| `data/` | Large source datasets the spikes read, gitignored. `python sandbox/data/fetch_common_voice.py` downloads Common Voice zh-CN 27.0 (about 23 GB, CC0) into `data/common-voice-zh-CN/`, then deletes the archive. It needs `MOZILLA_DATA_COLLECTIVE_API_KEY` in the repo-root `.env.development.local`. Common Voice is dropped as a source (research README, Native audio and TTS), so it isn't kept locally; the clip-coverage and tts-grader scripts that read it need that fetch first. Spike `.venv` and `node_modules` folders may be absent to save space: rebuild them from each spike's `requirements.txt` or `package-lock.json`. |
| `spikes/activity-pilot/` | Spike C: local Vue app running three lessons through the lesson arc (rotating openers, examples, practice in rotating formats), for tuning feel. `npm run dev`, then open on the phone over Wi-Fi. |
| `spikes/media-ingest/` | Spike A: automatic CC audio → validated, timed clips on the laptop GPU. See its FINDINGS.md. |
| `spikes/clip-coverage/` | Spike B: can S1/S2 be filled with lesson-eligible native sentences? See its FINDINGS.md. |
| `spikes/sync-replay/` | Spike D: two-device event-log sync and FSRS replay correctness and performance. See its FINDINGS.md. |
| `spikes/authoring-format/` | Spike E: lesson authoring format, mini toolchain, zh analyzer accuracy. See its FINDINGS.md. |
| `spikes/figure-drawing/` | Spike F: making LLM-authored lesson figures look better without image models. Compares raw SVG, a render-and-critique loop, a scene spec plus parts library, and emoji. Run `node src/build.mjs`, then open `index.html`. See its FINDINGS.md. |
| `spikes/elevenlabs-check/` | ElevenLabs v4 test: a trap-heavy test text, `gen.py` to synthesize (key from `.env.development.local`), and `check.py` for a Whisper round trip. Audio is gitignored. |
| `spikes/image-retrieval/` | Matching vocab-card example sentences to dataset photos (caption embeddings vs CLIP-family image embeddings, plus a VLM fit gate). Stopped before results; see its README. Its data is in `data/coco/` and `data/openimages/`. |
| `spikes/tauri-youtube/` | Do YouTube embeds play inside a Tauri app, served from its bundled origin? Yes on Windows (`http://tauri.localhost`, 2026-11-08); Android untested. Build with `npx tauri build --debug --no-bundle`; the app writes its results to `tauri-youtube-report.txt` in the temp folder. |
| `spikes/tts-grader/` | Deterministic tone grader (forced alignment plus a tone classifier) run on native Common Voice speakers and ElevenLabs v4. See its README. |
