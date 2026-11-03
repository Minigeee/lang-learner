# TTS grader (spike)

A deterministic tone grader for Mandarin clips, tried on ElevenLabs v4 against native Common Voice speakers. Run on 2026-11-03.

## How it works

`grade.py` (details in its docstring):
1. Expected tones come from pypinyin with tone sandhi (你好 → ni2 hao3). A 3rd tone before a 3rd tone accepts 2 or 3. Neutral tones aren't scored.
2. Meta's MMS forced aligner (torchaudio `MMS_FA`, fed toneless pinyin) locates each syllable. Each span is extended while the voice continues, because CTC spans end before the rhyme, where the tone is.
3. The Tone.me classifier (`cge7/wav2vec2-base-version3`, wav2vec2 fine-tuned on AISHELL-3 syllables) calls each syllable's tone. A pitch-contour rule on pYIN F0 is reported alongside as a cross-check.

It is deterministic: CPU, fixed thread count, eval mode, no sampling. A rerun produced a byte-identical `results/summary.json`.

```
python -m venv .venv && .venv/Scripts/python -m pip install torch==2.7.1 torchaudio==2.7.1 --index-url https://download.pytorch.org/whl/cpu
.venv/Scripts/python -m pip install "transformers<5" librosa soundfile pypinyin==0.55.0
.venv/Scripts/python -I -X utf8 make_jobs.py      # picks 3 native CV speakers per sentence, writes jobs.json
TORCH_HOME=models/torch HF_HOME=models/hf .venv/Scripts/python -I -X utf8 grade.py
```

The TTS clips come from `../elevenlabs-check/gen.py` (`say` mode). Models (1.6 GB), clips and the venv are gitignored.

## Results

Share of scored syllables whose classifier tone matched the expected tone:

| Sentence | Native 1 | Native 2 | Native 3 | 11labs v4 `ByhETI` | 11labs v4 `DowyQ6` |
|---|---|---|---|---|---|
| 它们可以是独居或成对生活 (11 scored) | 82% | 91% | 64% | 73% | 55% |
| 这里的天气真好 (6 scored) | 50% | 67% | 67% | 67% | 50% |
| 妈麻马骂汤糖躺烫 (8 single syllables) | — | — | — | 75% | 88% |

The pitch-contour rule scored native speakers 20–73%, so it is too crude to use.

**Loudness doesn't affect the scores.** The raw clips ranged from −36.8 LUFS (v4 `ByhETI`, very quiet) to −15.9 LUFS. `normalize.py` brings every clip to −20 LUFS (peak ≤ −1 dBFS, the media-ingest target) in `clips-norm/`, and `grade.py jobs-norm.json` regrades them. Every tone score came out identical, because the classifier normalizes its input itself. Only one contour score moved (`ByhETI` syllables, 62% → 50%). The real pipeline should normalize TTS clips to the same −20 LUFS as ingested native clips, so voices don't jump in volume.

## What it means

- **On sentences, the grader can't separate native speech from v4.** Native speakers themselves score 50–91%. A per-syllable classifier trained on isolated syllables struggles with connected speech (coarticulation, phrase-final half-thirds), so its noise is larger than the differences being measured. Both v4 voices land inside the native range.
- **On isolated syllables it is more useful, especially where two independent tools agree:**
  - `ByhETI` 麻 (má) was called tone 1 with p = 0.97, and Whisper also heard 妈. It probably came out flat.
  - `DowyQ6` 骂 (mà) was called tone 3 with p = 0.74, and Whisper also heard 马. It probably dipped instead of falling.

  Agreement between the tone classifier and Whisper is a credible flag. Either alone is not.
- **Use it as triage, not as a score:** flag clips where the classifier and ASR agree on a wrong tone, and have a human or a regeneration step look at those.

## Native single-syllable baseline (Yoyo pinyin chart)

`make_yoyo_jobs.py` grades the user's local Yoyo Chinese pinyin-chart cache in place: 403 syllables × 4 tones, one native voice. The recordings are for personal study only and are never copied into this repo. It grades the 8 test syllables plus a seeded sample of 25 syllables × 4 tones (`grade.py jobs-yoyo.json`).

**The classifier gets 76% (82 of 108) on clean native isolated syllables, and its accuracy depends heavily on the tone:**

| Expected | Classifier said | Accuracy |
|---|---|---|
| Tone 1 | 1 ×27 | 100% |
| Tone 2 | 2 ×22, 1 ×5 | 81% |
| Tone 3 | 4 ×11, 3 ×8, 2 ×6, 1 ×2 | **30%** |
| Tone 4 | 4 ×25, 1 ×2 | 93% |

What this changes:
- **v4 `ByhETI` 麻 called tone 1 is probably not a real error.** Yoyo's own 麻 (ma2) gets the same call (p = 0.68), and calling a 2 a 1 is this classifier's common native error. Whisper hearing 妈 doesn't add much, because Whisper is tone-deaf on syllables.
- **v4 `DowyQ6` 骂 called tone 3 is more credible.** The classifier called no native tone 4 a 3.
- **A 3rd-tone call means little in either direction.** The classifier gets native 3rd tones right only 30% of the time.
- The pitch-contour rule fails on isolated syllables: it normalizes to the clip's median pitch, which is meaningless for a single syllable. Ignore it there.

## How to make it a real score

Recognize tones at the sentence level, with context, instead of classifying cut-out syllables. Published work reports a 1.7% tone error rate on AISHELL-1 with wav2vec2 + CTC over tonal syllables plus a language model (arXiv 2108.01122). That would mean fine-tuning a wav2vec2 model on AISHELL-3, whose transcripts carry toned pinyin. It needs the 19 GB audio download and some hours of GPU training on the RTX 2070. It is a project of its own.

## Limits

- Two sentences, three native speakers each, two TTS voices: a tiny sample.
- Common Voice speakers vary in accent and care.
- The tone classifier has no published accuracy, and its label 0 is unexplained, so it is ignored.
