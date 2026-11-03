# ElevenLabs check (spike)

Test texts for TTS: `a-sentences.txt` (tone sandhi, polyphones, neutral tone, erhua, the pilot lines) and `b-syllables.txt` (single syllables in four tones). `traps.json` says what to listen for on each line.

- `gen.py`: synthesize with ElevenLabs (reads `ELEVENLABS_API_KEY` from the repo-root `.env.development.local`; never logs it). Library voices need a paid plan.
- `check.py`: Whisper large-v3 round trip (uses the media-ingest venv and model cache).

Results on 2026-11-03, eleven_v4: sentence CER 0.9% and 2.8% for the two voices; single syllables are inconclusive with Whisper. See `../tts-grader/` for the tone grader.
