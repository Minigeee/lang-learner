# Media-ingest spike: findings

**Question:** can a fully automatic pipeline turn openly licensed native Mandarin audio into validated, timed, lesson-ready clips on this laptop, and what share passes?

The subagent wrote this report; the orchestrator saved it, because subagents can't write report files in this harness.

**Answer:** yes. Global Storybooks narration gives sentence clips with **98% yield** (116 of 118). audio-cmn words reach **90%** (269 of 300). Both run unattended on the RTX 2070 at 2.6× to 6.4× real time. ASR **can't** validate isolated syllables (it is close to tone-deaf), so audio-cmn syllables need a different trust rule (§6). All numbers below come from `out/summary.json`, `out/metrics.json`, `out/forced_scores.json` and `out/alignment_eval.txt`.

Throwaway code, not production. Nothing outside this folder depends on it.

## 1. What was built

| File | Role |
|---|---|
| `fetch.py` | Downloads the approved data into `data/` and logs every URL and byte count to `data/downloads.json` |
| `ingest.py analyze` | Source adapters → candidate clips → ASR → per-clip metrics (`out/metrics.json`). All GPU work happens here. |
| `score_known.py` | Forced scoring of known transcripts (P(text \| audio) by teacher forcing, via ctranslate2 `align`) for audio-cmn → `out/forced_scores.json` |
| `ingest.py gate` | Applies thresholds (`GATES` in `ingest.py`), encodes passing clips to Opus, writes `out/media/*.yaml`, `out/quarantine.json`, `out/summary.json` |
| `evaluate.py` | Alignment scoring against page-level ground truth, plus the waveform spot-check |
| `cuda_check.py` | Confirms that ctranslate2 sees CUDA through the pip NVIDIA wheels |

How to run it (all Python runs with `-I -X utf8`; `-X utf8` is needed because `-I` ignores `PYTHONIOENCODING`):
`fetch.py data` → `ingest.py analyze data out --model <hf snapshot dir>` → `score_known.py data out <model>` → `ingest.py gate data out` → `evaluate.py out data`.

**Pipeline per source**
- **audio-cmn** (syllables, HSK words): decode → trim silence (energy, 0.1 s pad) → signal stats → free ASR → forced score of the known text → gate. The transcript comes from the filename (toned pinyin or hanzi), so no alignment is needed.
- **Global Storybooks**: parse the page HTML (page text, credits, license, level) → split sentences on 。！？ → one full-narration ASR pass with word timestamps → Levenshtein alignment of the reference characters to the ASR characters, where **homophones count as matches** (same toneless pinyin) → cut each sentence boundary at the longest pause within ±0.6 s of the whisper boundary → re-transcribe each cut clip on its own (round trip) → gate.
- **Gate**: duration bounds, speech ratio, internal silence, clipping, loudness, transcript agreement, and "boundary landed in a pause". Passing clips are loudness-normalized to −20 LUFS (peak ≤ −1 dBFS), given 5 ms fades, and encoded to Ogg Opus at 32 kbps mono 48 kHz. The storage key is the content hash `media/<sha256[:16]>.opus`.

## 2. Yield

| Source | Candidates | Passed | Yield | Failure reasons |
|---|---|---|---|---|
| Global Storybooks sentences (4 stories, L1/L2/L3/L5) | 118 | 116 | **98.3%** | 1 unaligned (title page), 1 round-trip mismatch |
| audio-cmn HSK words (HSK 2012 L1–3, first 300 with audio) | 300 | 269 | **89.7%** | 31 ASR word mismatch |
| audio-cmn syllables (300, seeded random) | 300 | 203 | **67.7%** | 97 ASR syllable mismatch |

No item in any source failed a signal check (duration, silence, clipping or loudness) at the final thresholds. Both sources are clean studio recordings. Quarantine entries with their reasons are in `out/quarantine.json`.

**Are the quarantined items actually bad?** For Storybooks, yes: both are real alignment failures (§4). For audio-cmn, almost all are **false rejects**. Whisper hears isolated single syllables as English or as a neighboring syllable: 外→"Why?", 卖→"Mine!", 爱→"I", 少/找→"CIAO", 比/别→"B", 二→"R", 咖啡→"Coffee". It also outputs digits (一点儿→"1.2", 两→"2") and sometimes traditional characters (錯, 湯). The audio is very likely fine. The validator is the weak part.

**How the word validator was chosen.** On the same 300 words:

| Validator | Accepts true word | Accepts a random impostor word |
|---|---|---|
| Free ASR, hanzi CER = 0 | 72.7% | n/a |
| Free ASR, toneless-pinyin match (homophones allowed) | 84.0% | n/a |
| Forced score, mean token log-prob ≥ −2.5 | 82.7% | 0.0% |
| **Pinyin match OR forced ≥ −2.5 (used)** | **89.7%** | **0.0%** |

The impostor test is easy: a random HSK word with different pinyin. A near-homophone impostor would be harder, and this spike didn't test it.

**Syllables: ASR can't validate tones.** Free ASR matched the toneless syllable for 61% of items and the toned syllable for only 29%. In forced scoring, the correct-tone character outscored the same syllable in other tones 37.7% of the time, against 28.5% by chance. In addition, 66 of 300 syllables (22%) are toned syllables with no common character (`ban2`, `gan2`, `jian2`…), and interjections (`hm2`, `hng3`, `m2`) all come out as 嗯. An ASR gate on syllables therefore mostly measures Whisper, not the audio.

## 3. Throughput

Machine: RTX 2070 8 GB (driver 581.95). CUDA works through pip wheels alone (`nvidia-cublas-cu12` 12.9, `nvidia-cudnn-cu12` 9.27, `nvidia-cuda-nvrtc-cu12`, with `os.add_dll_directory` on their `bin/`). ctranslate2 4.8.5, faster-whisper 1.2.1. **Model: large-v3, float16, beam 5**, `condition_on_previous_text=False`, no VAD. The model fit in VRAM, so the int8 and `medium` fallbacks weren't needed.

| Stage | Audio | Wall | Audio per wall-minute |
|---|---|---|---|
| audio-cmn syllables (analyze) | 334 s | 129 s | 156 s/min (2.6× RT; ~0.43 s per item, dominated by per-call overhead) |
| audio-cmn words (analyze) | 332 s | 120 s | 166 s/min |
| audio-cmn forced scoring (600 items) | 666 s | 196 s | ~0.3 s per item |
| Storybooks, everything (analyze) | 1,023 s | 159 s | **385 s/min (6.4× RT)** |
| of which the full-narration pass | 1,023 s | 65 s | 950 s/min (15.8× RT) |
| of which the round trip on cut clips | 924 s | 77 s | 723 s/min |
| Gate + Opus encode (718 candidates, 588 written) | 1,289 s out | 28 s | n/a |

VRAM peaked at 6.2 GB total, of which about 0.95 GB is the idle desktop, so large-v3 fp16 needs about 5.2 GB. Mean GPU utilization was 82%. Model load takes 12 s.

**Full run estimate for both sources:**
- **Global Storybooks Mandarin, all 40 stories.** HEAD requests on every narration give 63.8 MB at the observed ~75 kbps, about **6,800 s (1.9 h)** of narration. That splits into 29 CC BY stories (1.75 h) and 11 CC BY-NC stories. At 385 s/min this is **~18 min**, yielding roughly 780 sentence clips (0.114 clips per narrated second).
- **audio-cmn, all 1,707 syllables and 8,596 words.** About 0.43 + 0.30 s per item, so **~2.1 h**. Batching (faster-whisper `BatchedInferencePipeline`) or dropping free ASR in favor of forced scoring alone would cut this a lot. This spike didn't try either.
- **Total ≈ 2.5 h unattended.** That is well within "run it on the laptop overnight".

## 4. Alignment quality

**Ground truth exists for free.** Global Storybooks also publishes per-page mp3s split from the same narration (`mp3/NN.mp3`). `ingest.py` locates each page in the full file by FFT cross-correlation (median normalized correlation 0.93, minimum 0.80) and measures each page's speech onset and offset by energy. Every page edge is also a sentence edge, so 50 page-first and 50 page-last sentence boundaries can be scored automatically. Sentence boundaries inside a page have no ground truth. For those, the proxies are boundary energy and the round trip.

| Boundary method (same ASR) | Onset median \|err\| | Offset median \|err\| | Offset truncated > 50 ms | Clips cut mid-speech (edge > −25 dB) |
|---|---|---|---|---|
| Raw whisper word timestamps | 0.39 s | 0.78 s | n/a | n/a |
| Whisper + Silero VAD (`vad_filter`) | 0.60 s (p90 3.1 s) | 0.49 s | n/a | worse: 25 clips leak into a neighboring page |
| v1: snap to the nearest energy-region edge | 0.20 s | 0.30 s | 20 / 50 | 2 |
| v2: cut in the longest ≥ 80 ms silence within ±0.6 s | 0.19 s | 0.28 s | 2 / 50 | 2 (19 boundaries found no pause) |
| **v3 (final): v2, falling back to the quietest 80 ms dip ≥ 30 dB below speech** | **0.19 s** | **0.28 s** | **3 / 50** | **0** (all boundaries found a pause) |

Final errors are mostly the deliberate padding: about 0.2 s before onset and 0.3 s after offset. Read signs this way: onset errors are all negative (no onset was truncated), and offset errors are mostly positive. The 3 "truncated" offsets cut 0.40 to 0.42 s of low-level tail that the ground truth counts as speech (it uses a 45 dB-relative threshold, while v3 allows a dip 30 dB below speech). Their round-trip CER is 0, so no words were lost. Widening the pause window to ±1.0 s changed nothing.

**Automated checks used (no human):**
1. **Round-trip re-transcription** of each cut clip against its page sentence. This is the main gate. It catches truncation and spill-over, because spilled-in words show up as insertions.
2. **Boundary energy**: the first and last 20 ms against the clip's p95 frame level. Clean cuts sit at about −105 dB because this narration is noise-gated to digital silence. Every cut that found no pause was above −50 dB.
3. **"Cut landed in a pause"** flag per boundary. This turned out to be a better structural gate than an energy threshold.
4. **Speech-rate plausibility** (0.10–1.0 s per character; observed 0.31–0.77).

**Spot-check (~10 clips by waveform, not by ear).** I can't listen, so `evaluate.py` prints 100 ms energy bars with the clip window in brackets (see `out/alignment_eval.txt`). In 9 of 10 sampled clips, the bracket opens and closes in silence ("....."), with 0.2–0.4 s of lead and trail and speech fully inside. In one (0262 p12, "托马斯给玛格威讲过这个故事很多次。") the clip ends at −39 dB, followed by 0.5 s of −20 to −35 dB energy, most likely an inhale before the next sentence. Its round trip is clean. These are proxies only. Nobody has listened to any clip.

**Failures the checks caught:**
- **Whisper skipped a repeated line.** Story 0087 reads the title "我喜欢看书" and then page 2, "我喜欢看书。" Whisper emitted it only once, so alignment gave page 2 the title's audio and left the title unaligned. The next clip (page 3) then swallowed page 2's speech. The round trip caught page 3 (CER 0.62). The title went to quarantine as unaligned. **Page 2 passed with the title's audio.** The words are identical, so the content is correct, but it is the wrong take. Only the page ground truth exposes this. A text-only check can't.
- **Transliterated names and 他/她/它 inflate hanzi CER** (旺加里→王嘉丽/汪家里, 玛格威→马格威). Of 117 sentences, 59 have CER > 0, but only 5 have toneless-pinyin error rate (PER) > 0, and only the misaligned one is above 0.1. The full-narration pass has hanzi CER 0.9–6.8% per story, but PER 0–0.6% (6.8% for 0087, from the skipped line).

**Threshold choice:** a sentence fails when **PER > 0.10 and CER > 0.20**. PER is the primary signal because it ignores homophones and transliteration variants. A misaligned clip moves PER by at least a whole word (≥ 0.1 even for a 10-character sentence). Clean clips sit at PER 0 (112 of 117), the misaligned one at 0.62, and nothing falls in between. Hanzi CER alone at 0.20 would have rejected 3 good clips with names in them. For known-transcript words, CER is meaningless (one wrong character is 50–100%), so words use exact toneless-pinyin match OR forced log-prob ≥ −2.5. The 0% impostor acceptance in §2 is the evidence for that cut.

## 5. Storage

Opus 32 kbps mono in Ogg: **14.1 MB per audio-hour** (588 clips, 1,289 s → 5.03 MB). Short clips carry about 1 KB of container overhead, so a 1 s word costs about 4.2 KB, an effective ~34 kbps. The full catalog (all audio-cmn plus all 40 stories) would be roughly **55–60 MB**, or about 6% of the 1 GB Supabase bucket. The architecture's "1 GB ≈ 70 h" holds (measured: ~71 h).

## 6. Recommendations

**Sources**
- **Global Storybooks Mandarin: viable, and worth taking as the first long-form source.** It has 98% sentence yield, 2.3–18 s clips (median 7.3 s), page-level English, and levels 1–5. Two caveats:
  - Every zh story has **the same narrator** (Zhuo Sun), so it adds no voice variety.
  - 11 of the 40 are **CC BY-NC**. That's fine for a personal non-commercial app, but the license record must carry `nonCommercialOnly`.
  - **Use the per-page mp3s as the alignment unit**: ASR and align within each page, not the whole story. This removes the repeated-line failure (the only wrong-take clip came from cross-page confusion), makes the search space tiny, and gives page clips for read-along (T12) for free.
- **audio-cmn words: viable** at ~90% with the combined validator. Two speakers in total.
- **audio-cmn syllables: don't ASR-gate them.** Validation can't confirm tones (§2), so the gate measures Whisper. Treat them as a **label-trusted source**: the transcript is the curated filename (which still satisfies "obtained automatically"). Gate on signal checks plus "one syllable of speech present" (speech region count, duration), and record `validation.method: signal-only` so the trust level is explicit. Tone-trainer correctness then rests on the source's labels. Say so in the architecture.

**Record shapes (TDD §5.5).** See `out/media/*.yaml` for the adapted shape.
1. **Move the storage key from `Media` to `Clip`.** We rehost cut clips, never the whole media. `Media.source` becomes provenance (`{provider: 'open', originalUrl}`), and `Clip.file = {key, mime, bytes, sha256, durationSec, gainDb}`. The TDD's `source: {provider: 'r2', key}` on `Media` implies whole-file rehosting, which the 60 s rule forbids for long narration anyway.
2. **`Line.t` should be relative to the clip file**, with `Clip.span` kept in the media timeline for provenance only. Once a clip is a separate file, media-timeline line times force every consumer to subtract.
3. **`rights.author: string` is too thin.** Storybooks have four roles (writer, illustrator, translator, reader). Use `credits: {role, name}[]`. Add `rights.changes` (CC BY and BY-SA require indicating modifications; ours are cut, normalized and re-encoded).
4. **License granularity is per media, not per source.** Storybooks vary between BY and BY-NC, and between 3.0 and 4.0, per story. audio-cmn states "CC-by-sa" **with no version**, so `License` needs to allow an unversioned id, and the credits page should link the source's own statement.
5. **Add a per-clip `validation` block** (metrics, method, thresholds version) and a per-media `ingest` stamp (pipeline and ASR versions, date). Then re-gating after a threshold change needs no ASR.
6. Optional: a `page`/anchor field on story clips (read-along), a `level` on media, and a `'syllable'` context or clip kind distinct from `'word-audio'`.
7. `Speaker.sex` and `accent` are unknown for every speaker here. Keep them optional, and don't let the voice-variety check depend on them.

**Thresholds and rules**
- Sentence gate: PER ≤ 0.10 (primary), hanzi CER ≤ 0.20 only as a secondary signal. Every cut must land in a pause. Speech rate between 0.10 and 1.0 s per character. Raw loudness between −40 and −6 LUFS (bounds only catch broken files; everything is normalized to −20 LUFS anyway). Clipping above 0.1% of samples fails.
- **The 60 s cap is fine but not binding.** Sentence clips max out at 18 s, and pages at about 25 s. Keep 60 s as the storage and offline cap. Lesson sentence cards should prefer ≤ 15 s (90% of clips are ≤ 13 s), and the check script should warn above that rather than fail.
- **Don't use Silero VAD** (`vad_filter`) for timing: it made onsets markedly worse.

**Pipeline**
- Cache whisper word timings per media (keyed by audio hash and model). Every boundary tweak in this spike cost a full re-ASR.
- Verify downloads against source hashes. Git blob SHA-1 works for GitHub sources (all 600 audio-cmn files verified). One `metrics.json` written mid-spike came back with corrupted bytes on re-read (`\\` → `\N`, plus one broken UTF-8 byte). The cause is unexplained (disk, AV or RAM). Write outputs atomically, and hash anything that feeds the build.
- ASR the round trip on every clip. It is the cheapest check that catches real misalignment (~0.08 s of GPU per clip-second).

## 7. Surprises and breakage

- Whisper large-v3 **silently drops an exact repeated sentence** (title followed by an identical page 1), even with `condition_on_previous_text=False`.
- **Isolated syllables come back as English.** Even with `language="zh"`: "Why?", "OK", "Coffee", "Yeah", "CIAO". Occasional traditional characters too, normalized with `zhconv`.
- **Whisper is nearly tone-deaf on isolated syllables** (37.7% vs 28.5% chance in forced choice).
- **The Storybooks narration is noise-gated** to digital silence (−105 dB) between most sentences, but not all. That is why a plain "find silence" cutter missed 19 boundaries and needed the quiet-dip fallback.
- Story pages ship as per-page mp3s, which is free ground truth. Page 1 audio is the title.
- The Hugging Face connection kept resetting: `snapshot_download` failed twice, and the two config files came down with curl retries. The model's sha256 is `69f74147e3334731bc3a76048724833325d2ec74642fb52620eda87352e3d4f1`. I couldn't fetch HF's LFS oid to compare it.
- `-I` drops the script directory from `sys.path` and ignores `PYTHONIOENCODING`. Hence `-X utf8`, and `evaluate.py`/`score_known.py` insert their own folder path explicitly (never `data/`).
- My `num2zh` reads 2000 as 二千 (not 两千). It is harmless here because both sides use the same normalizer, but it would matter for digit-heavy text.

## 8. Downloads (total ≈ 4.6 GB, under the 6 GB budget)

| What | From | Size |
|---|---|---|
| faster-whisper large-v3 (`model.bin`, tokenizer, vocabulary, configs) | huggingface.co/Systran/faster-whisper-large-v3 | 3,087 MB + 3.5 MB |
| `nvidia-cudnn-cu12` 9.27.0.42 | PyPI | 743 MB |
| `nvidia-cublas-cu12` 12.9.2.10 | PyPI | 553 MB |
| `nvidia-cuda-nvrtc-cu12` 12.9.86 | PyPI | 76 MB |
| scipy 1.17.1 (for pyloudnorm), av 18.1.0 (bundles FFmpeg with libopus), ctranslate2 4.8.5, onnxruntime 1.31.1, numpy 2.4.6 | PyPI | 37 + 28 + 20 + 15 + 13 MB |
| faster-whisper 1.2.1, tokenizers, huggingface-hub, hf-xet, pypinyin, zhconv, pyloudnorm, pyyaml, soundfile and small deps | PyPI | ~15 MB |
| audio-cmn git tree listing (API JSON) | api.github.com | 11.5 MB |
| audio-cmn: 300 syllables + 300 HSK words (`64k/`), 3 HSK 2012 lists | raw.githubusercontent.com/hugolpz/audio-cmn | 7.1 MB |
| Global Storybooks zh 0087, 0337, 0110, 0262: full narration | globalstorybooks.net/media/audio/zh/ | 9.6 MB |
| same stories: 51 per-page mp3s | globalstorybooks.net/media/audio/zh/…/mp3/ | ~9 MB |
| same stories: page HTML (text, credits, license, level), gsn-audio README (license table) | raw.githubusercontent.com/global-asp/storybooks-minnesota, global-asp/gsn-audio | < 0.2 MB |

`data/downloads.json` lists all 663 data files (25.2 MB) with URLs and byte counts. Metadata-only requests (HEAD on the 40 narrations, PyPI JSON, GitHub API) are not counted. The installed `.venv` is 2.5 GB.

**Licensing as recorded.** Global Storybooks is an official project of the global-asp organization. Text comes from its Storybooks Minnesota site source; audio comes from globalstorybooks.net, which is where the sites themselves load it from. The audio license follows each story's text license (gsn-audio README table), and each page states it. The 4 stories used are CC BY: 0087 and 0337 under 3.0, 0110 and 0262 under 4.0. The reader for all of them is Zhuo Sun. audio-cmn is "CC-by-sa" with no version stated; speakers are Chen Wang (syllables) and Yue Tan (HSK words), and curation is by Hugo Lopez.

## 9. Folder layout

`data/` holds the untrusted downloads (gitignored). `hf-cache/` holds the model (gitignored). `out/` holds the final run: `media/*.yaml` (476 media records plus `_registry.yaml` with speakers and licenses), `quarantine.json`, `summary.json`, `metrics.json`, `forced_scores.json`, `alignment_eval.txt`, and `audio/` (gitignored). `out-runs/` holds the story-only comparison runs behind the §4 table: `novad` (v1 snapping; its `metrics.json` is the corrupted file), `vad`, `pause`, `pause10` and `soft`.
