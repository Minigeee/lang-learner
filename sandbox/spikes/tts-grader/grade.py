"""Deterministic tone grader for Mandarin speech clips.

Usage:  .venv/Scripts/python -I -X utf8 grade.py   (grades every job in jobs.json, writes results/)

For each clip and its text:
1. Expected tones come from pypinyin with tone sandhi applied (你好 -> ni2 hao3, 一个 -> yi2 ge4).
   A 3rd tone before another 3rd tone may surface as 2 or 3, so both are accepted there.
   Neutral tones (5) are reported but not scored: both checks below are weakest on them.
2. Each syllable is located with Meta's MMS forced aligner (torchaudio MMS_FA), fed toneless pinyin.
3. Each syllable segment gets two tone calls:
   - classifier: cge7/wav2vec2-base-version3 (Tone.me, wav2vec2 fine-tuned on AISHELL-3 syllables);
   - contour: a pitch rule on librosa pYIN F0, in semitones relative to the clip's median pitch.
4. A syllable passes when the classifier's tone is in the accepted set. The contour call is a
   cross-check reported next to it.

Same clip in, same numbers out: fixed models in eval mode, CPU, a fixed thread count, no sampling.
"""

import json
import sys
from pathlib import Path

import librosa
import numpy as np
import torch
import torchaudio
from pypinyin import Style, lazy_pinyin
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

HERE = Path(__file__).resolve().parent
SR = 16000
TONE_MODEL = "cge7/wav2vec2-base-version3"
PAD_S = (0.02, 0.04)  # widen each aligned syllable a little: MMS spans hug the letters

torch.manual_seed(0)
torch.set_num_threads(4)
torch.use_deterministic_algorithms(True)


def expected(text):
    """Syllables to grade. `text` is hanzi, or toned pinyin like "ma1 tang2" for audio with no hanzi."""
    if text[:1].isascii():
        toned = text.split()
        hanzi, plain = toned, [t.rstrip("012345") for t in toned]
    else:
        hanzi = [c for c in text if "一" <= c <= "鿿"]
        toned = lazy_pinyin("".join(hanzi), style=Style.TONE3, tone_sandhi=True, neutral_tone_with_five=True)
        plain = lazy_pinyin("".join(hanzi), style=Style.NORMAL)
    sylls = []
    for i, (ch, t, p) in enumerate(zip(hanzi, toned, plain)):
        tone = int(t[-1]) if t[-1].isdigit() else 5
        nxt = int(toned[i + 1][-1]) if i + 1 < len(toned) and toned[i + 1][-1].isdigit() else None
        accept = {2, 3} if tone == 3 and nxt == 3 else {tone}
        sylls.append({"char": ch, "pinyin": t, "letters": p.replace("ü", "v"), "tone": tone, "accept": sorted(accept)})
    return sylls


class Grader:
    def __init__(self):
        bundle = torchaudio.pipelines.MMS_FA
        self.fa = bundle.get_model().eval()
        self.tokenizer, self.aligner = bundle.get_tokenizer(), bundle.get_aligner()
        self.fe = AutoFeatureExtractor.from_pretrained(TONE_MODEL)
        self.tone = AutoModelForAudioClassification.from_pretrained(TONE_MODEL).eval()

    @torch.inference_mode()
    def grade(self, path, text):
        wav, _ = librosa.load(str(path), sr=SR, mono=True)
        sylls = expected(text)
        emission, _ = self.fa(torch.from_numpy(wav).unsqueeze(0))
        spans = self.aligner(emission[0], self.tokenizer([s["letters"] for s in sylls]))
        sec_per_frame = len(wav) / emission.size(1) / SR

        f0, voiced, _ = librosa.pyin(wav, fmin=60, fmax=500, sr=SR, frame_length=1024, hop_length=160)
        f0_times = librosa.times_like(f0, sr=SR, hop_length=160)
        ref = np.nanmedian(np.where(voiced, f0, np.nan))


        starts = [w[0].start * sec_per_frame for w in spans] + [len(wav) / SR]
        for i, (s, word) in enumerate(zip(sylls, spans)):
            start = max(0.0, starts[i] - PAD_S[0])
            # CTC spans end early, cutting off the rhyme where the tone lives: extend the end while
            # the voice continues, up to the next syllable's start.
            end = word[-1].end * sec_per_frame + PAD_S[1]
            k = int(np.searchsorted(f0_times, end))
            while k < len(voiced) and voiced[k] and f0_times[k] < starts[i + 1]:
                k += 1
            end = min(max(end, f0_times[min(k, len(f0_times) - 1)]), starts[i + 1], len(wav) / SR)
            s["start"], s["end"] = round(start, 3), round(end, 3)
            seg = wav[int(start * SR):int(end * SR)]
            inputs = self.fe(seg, sampling_rate=SR, return_tensors="pt")
            probs = torch.softmax(self.tone(**inputs).logits[0], -1).numpy()
            label = int(np.argmax(probs[1:6])) + 1  # labels 1-5; 0 is unused by this model's outputs we read
            s["classifier"], s["classifier_p"] = label, round(float(probs[label]), 3)
            mask = (f0_times >= start) & (f0_times <= end) & voiced
            s["contour"] = contour_tone(12 * np.log2(f0[mask] / ref)) if mask.sum() >= 4 else None
            s["pass"] = s["classifier"] in s["accept"] if s["tone"] != 5 else None
        scored = [s for s in sylls if s["pass"] is not None]
        agree = [s for s in scored if s["contour"] is not None]
        return {
            "file": Path(path).name, "text": text, "syllables": sylls,
            "tone_accuracy": round(sum(s["pass"] for s in scored) / max(1, len(scored)), 3),
            "contour_accuracy": round(sum(s["contour"] in s["accept"] for s in agree) / max(1, len(agree)), 3),
            "scored": len(scored),
        }


def contour_tone(st):
    """Crude tone call from a syllable's pitch track in semitones (0 = the clip's median pitch)."""
    st = np.convolve(st, np.ones(3) / 3, mode="valid") if len(st) >= 5 else st
    n = len(st)
    head, tail = st[: max(1, n // 4)].mean(), st[-max(1, n // 4):].mean()
    lo = int(np.argmin(st))
    rise, span = tail - head, st.max() - st.min()
    if lo / n > 0.25 and lo / n < 0.8 and min(head, tail) - st[lo] > 1.0 or st.mean() < -3 and span < 2:
        return 3
    if rise > 1.5:
        return 2
    if rise < -2.0:
        return 4
    if span < 2.0 and st.mean() > -1.5:
        return 1
    return 4 if rise < 0 else 2


def main():
    jobs = json.loads((HERE / (sys.argv[1] if len(sys.argv) > 1 else "jobs.json")).read_text(encoding="utf-8"))
    grader = Grader()
    out = HERE / "results"
    out.mkdir(exist_ok=True)
    summary = []
    for job in jobs:
        r = grader.grade(HERE / job["path"], job["text"])
        r.update({k: job[k] for k in ("group", "source")})
        (out / f"{job['group']}--{Path(job['path']).stem}.json").write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding="utf-8")
        summary.append({k: r[k] for k in ("group", "source", "file", "tone_accuracy", "contour_accuracy", "scored")})
        print(f"{job['group']:<14} {job['source']:<22} tone {r['tone_accuracy']:.0%}  contour {r['contour_accuracy']:.0%}  ({r['scored']} syllables)", flush=True)
    (out / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
