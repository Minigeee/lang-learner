# media-ingest

Turns clip requests into validated, loudness-normalized Opus files and the metadata the Node toolchain checks. It shares files with Node and never imports it. It never touches the bucket: Node uploads from the cache.

## Setup

Python 3.11 on Windows, with an NVIDIA GPU for Whisper. ffmpeg isn't needed: PyAV decodes and encodes.

```powershell
cd tools/media-ingest
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m pip install --no-deps -e .
```

`-I` keeps the working directory off the import path, so the package must be installed like this.

Settings come from the process environment, then the repo-root `.env.development.local`:

| Setting | Needed for |
|---|---|
| `ELEVENLABS_API_KEY` | `source: elevenlabs`. Spends the owner's credits. |
| `YOYO_CACHE_DIR` | `source: yoyo`. A local folder of `pinyin_<syllable>_<tone>.mp3` or `<syllable><tone>.mp3` files. |

`fetch` downloads the models a run needs: Whisper large-v3 (about 3 GB; Hugging Face, then a ModelScope mirror, checked by SHA-256) and the tone classifier. The aligner's weights (1.2 GB) arrive through torch the first time a clip is graded.

## Commands

```
.venv/Scripts/python -I -X utf8 -m media_ingest <command> [--requests PATH] [--media PATH]
```

| Command | What it does |
|---|---|
| `fetch` | Models, corpus transcripts, and source audio for everything except ElevenLabs |
| `synth` | Generates uncached ElevenLabs lines, then rewrites `usage.json` |
| `analyze` | Measures each source file: signal, Whisper, tone grader. All model work is here. |
| `gate` | Applies the thresholds, renders passing clips, rewrites `media.yaml` and `quarantine.json` |
| `run` | All four in order. A rerun with nothing new spends nothing and writes the same bytes. |

Exit codes: 0 when every stage finished (quarantined clips are a normal outcome), 1 when a stage reported a failure, and 2 for an invalid requests file. The other stages still run after a failure, and a clip without audio lands in quarantine.

`gate` needs no GPU, so thresholds can be retuned against cached metrics by rerunning it alone.

## Contract

### In: `content/zh/media/requests.yaml`

A list of entries. Every entry has `id` (`clip:<slug>`), `source` and `lessons` (a non-empty list of lesson ids), plus the fields for its source:

```yaml
- { id: clip:ai3-xxx, source: aishell3, utt: SSB00050001, zh: 我是学生。, lessons: [zh:les:slug] }
- { id: clip:ai1-xxx, source: aishell1, utt: BAC009S0724W0121, zh: ..., lessons: [zh:les:slug] }
- { id: clip:ac-ma1, source: audio-cmn, syllable: ma1, lessons: [zh:les:slug] }
- { id: clip:ac-w-xxx, source: audio-cmn, word: 老师, lessons: [zh:les:slug] }
- { id: clip:yo-ma1, source: yoyo, syllable: ma1, lessons: [zh:les:slug] }
- { id: clip:tts-xxx, source: elevenlabs, text: 他是老师吗？, voice: ByhETIclHirOlWnWKhHc, lessons: [zh:les:slug] }
```

A corpus line's `zh` is display text. It may carry restored punctuation, but must match the transcript once punctuation and spaces are ignored. Syllables are toned pinyin with `v` for ü.

### Out: `content/zh/media/media.yaml` (committed)

A list with one record per passing clip, sorted by `id` in code-point order. It has no timestamps, so a rerun writes the same bytes.

```yaml
- id: clip:ai3-xxx
  source: aishell3
  zh: 我是学生。              # absent for syllables
  syllable: ma1              # syllables only
  speaker: spk:aishell3-ssb0005
  media: media:<sha16>
  file: { key: media/<sha16>.opus, sha256: ..., bytes: ..., durationSec: ... }
  lufs: -20.0                # measured on the encoded file
  gainDb: 6.2
  validation: { method: asr-roundtrip, ... }
  warnings: []
  rights: { license: lic:apache-2-0, source: ..., changes: ... }
  ingest: { tool: media-ingest 0.1 }
```

- **`lufs`** can land under −20 when the −1 dBFS peak ceiling limits the gain.
- **Speaker ids** are lowercase, because `spk:` keys are slugs: `spk:<corpus>-<id>`, `spk:audio-cmn`, `spk:yoyo`, `spk:elevenlabs-<first 6 of voice>`.
- **`rights.license`** is an id from `content/shared/licenses.yaml`. Yoyo records also carry `restriction: personal-use-private-bucket`.
- **`validation.method`** is `signal-only` (syllables, whose label is trusted and which never reach Whisper), `asr-toneless` or `forced-score` (words), or `asr-roundtrip` (sentences).
- **`warnings`** mean "listen to this one" and never reject a clip. `tone:` entries come from the tone grader, on ElevenLabs clips only. `edge:` entries mark sentences whose first or last 20 ms is loud.

### Out: reports and cache (gitignored)

| Path | Contents |
|---|---|
| `.cache/out/<sha16>.opus` | Finished files. Ogg Opus, 32 kbps mono, 48 kHz. The bucket key is `media/<sha16>.opus`. |
| `.cache/raw/` | Source audio, per source |
| `.cache/metrics/` | Measurements per source file, keyed by content |
| `.cache/transcripts/` | AISHELL transcripts and AISHELL-3's `aishell3-spk-info.txt` |
| `.cache/models/` | Whisper, the tone classifier and the aligner |
| `quarantine.json` | Rejected clips with their reasons |
| `usage.json` | ElevenLabs characters for the current requests: each lesson's total, and `totalCharacters` counting each audio file once. Reruns don't change it. |

Yoyo audio is personal use only. It lives in the cache and the private bucket, and is never committed.

## Tests

```powershell
.venv/Scripts/python -I -X utf8 -m pytest
```

The end-to-end proof runs the real sources, redirected away from `content/`. Its ElevenLabs line costs credits the first time:

```powershell
.venv/Scripts/python -I -X utf8 -m media_ingest run --requests tests/fixtures/requests.smoke.yaml --media $env:TEMP/media.smoke.yaml
```

`data/audio_cmn_index.tsv` lists the 64k files in `hugolpz/audio-cmn` with their git blob SHA-1s, so every download is verified. To refresh it, regenerate the file from the repo's git tree.
