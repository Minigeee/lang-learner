"""Tone triage for synthesized speech: flags a clip for a listen, and never rejects one.

It must not run on AISHELL, because the classifier was trained on AISHELL-3. `ToneGrader.grade` is
deterministic (CPU, fixed threads, eval mode). Importing this module loads torch, so import it only
when there is a clip to grade.

Each syllable is located by the MMS forced aligner from toneless pinyin, then classified by
`TONE_MODEL`. Expected tones apply sandhi, and a third tone before a third tone accepts 2 or 3.
Neutral tones aren't scored.
"""

from pathlib import Path

import librosa
import numpy as np
import torch
import torchaudio
from pypinyin import Style, lazy_pinyin
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

from .audio import SR_ASR

TONE_MODEL = "cge7/wav2vec2-base-version3"
PAD_SEC = (0.02, 0.04)  # MMS spans hug the letters


def expected_tones(text: str) -> list[dict]:
    """The syllables of the hanzi in `text`, with the tones accepted for each."""
    hanzi = [c for c in text if "一" <= c <= "鿿"]
    toned = lazy_pinyin("".join(hanzi), style=Style.TONE3, tone_sandhi=True, neutral_tone_with_five=True)
    plain = lazy_pinyin("".join(hanzi), style=Style.NORMAL)
    syllables = []
    for i, (char, pinyin, letters) in enumerate(zip(hanzi, toned, plain)):
        tone = int(pinyin[-1]) if pinyin[-1].isdigit() else 5
        following = int(toned[i + 1][-1]) if i + 1 < len(toned) and toned[i + 1][-1].isdigit() else None
        accept = [2, 3] if tone == 3 and following == 3 else [tone]
        syllables.append({"char": char, "letters": letters.replace("ü", "v"), "tone": tone, "accept": accept})
    return syllables


class ToneGrader:
    def __init__(self, hf_cache: Path):
        torch.manual_seed(0)
        torch.set_num_threads(4)
        torch.use_deterministic_algorithms(True)
        bundle = torchaudio.pipelines.MMS_FA
        self._aligner_model = bundle.get_model().eval()
        self._tokenizer, self._aligner = bundle.get_tokenizer(), bundle.get_aligner()
        options = {"cache_dir": str(hf_cache), "local_files_only": True}
        self._features = AutoFeatureExtractor.from_pretrained(TONE_MODEL, **options)
        self._classifier = AutoModelForAudioClassification.from_pretrained(TONE_MODEL, **options).eval()

    @torch.inference_mode()
    def grade(self, x16: np.ndarray, text: str) -> dict:
        """Per-syllable tone calls and the share of scored syllables with an accepted tone."""
        syllables = expected_tones(text)
        if not syllables:
            return {"accuracy": None, "scored": 0, "syllables": []}
        emission, _ = self._aligner_model(torch.from_numpy(x16).unsqueeze(0))
        spans = self._aligner(emission[0], self._tokenizer([s["letters"] for s in syllables]))
        sec_per_frame = len(x16) / emission.size(1) / SR_ASR
        total_sec = len(x16) / SR_ASR

        _, voiced, _ = librosa.pyin(x16, fmin=60, fmax=500, sr=SR_ASR, frame_length=1024, hop_length=160)
        times = librosa.times_like(voiced, sr=SR_ASR, hop_length=160)
        starts = [word[0].start * sec_per_frame for word in spans] + [total_sec]

        for i, (syllable, word) in enumerate(zip(syllables, spans)):
            start = max(0.0, starts[i] - PAD_SEC[0])
            # CTC spans end before the rhyme, where the tone is, so follow the voice to the next syllable.
            end = word[-1].end * sec_per_frame + PAD_SEC[1]
            k = int(np.searchsorted(times, end))
            while k < len(voiced) and voiced[k] and times[k] < starts[i + 1]:
                k += 1
            end = min(max(end, times[min(k, len(times) - 1)]), starts[i + 1], total_sec)
            inputs = self._features(x16[int(start * SR_ASR):int(end * SR_ASR)], sampling_rate=SR_ASR, return_tensors="pt")
            probs = torch.softmax(self._classifier(**inputs).logits[0], -1).numpy()
            heard = int(np.argmax(probs[1:6])) + 1  # labels 1-5; label 0 is unexplained upstream
            syllable["heard"], syllable["p"] = heard, round(float(probs[heard]), 3)

        scored = [s for s in syllables if s["tone"] != 5]
        correct = sum(s["heard"] in s["accept"] for s in scored)
        return {"accuracy": round(correct / len(scored), 3) if scored else None,
                "scored": len(scored), "syllables": syllables}
