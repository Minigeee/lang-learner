"""Whisper on the GPU: free transcription and forced scoring of a known text.

Isolated syllables must not come here: Whisper is close to tone-deaf on them, so a syllable's label
is trusted and only its signal is checked.
"""

import os
import site
from pathlib import Path

import numpy as np

MODEL_NAME = "faster-whisper large-v3 float16"


def _add_cuda_dlls() -> None:
    """Makes the pip `nvidia-*-cu12` wheels visible to ctranslate2. Must run before importing it."""
    for packages in site.getsitepackages():
        for name in ("cublas", "cudnn", "cuda_nvrtc"):
            folder = os.path.join(packages, "nvidia", name, "bin")
            if os.path.isdir(folder):
                os.add_dll_directory(folder)
                os.environ["PATH"] = folder + os.pathsep + os.environ["PATH"]


class Whisper:
    def __init__(self, model_dir: Path):
        _add_cuda_dlls()
        from faster_whisper import WhisperModel
        from faster_whisper.tokenizer import Tokenizer

        self._model = WhisperModel(str(model_dir), device="cuda", compute_type="float16")
        self._tokenizer = Tokenizer(self._model.hf_tokenizer, True, task="transcribe", language="zh")

    def transcribe(self, x16: np.ndarray) -> str:
        segments, _ = self._model.transcribe(x16, language="zh", beam_size=5, vad_filter=False,
                                             condition_on_previous_text=False, without_timestamps=True)
        return "".join(segment.text for segment in segments)

    def score(self, x16: np.ndarray, text: str) -> float:
        """Mean token log-probability of `text` given the audio, by teacher forcing."""
        from faster_whisper.audio import pad_or_trim

        features = self._model.feature_extractor(x16)
        frames = features.shape[-1]
        encoded = self._model.encode(pad_or_trim(features))
        result = self._model.model.align(encoded, self._tokenizer.sot_sequence,
                                         [self._tokenizer.encode(text)], min(frames, 3000) // 2)[0]
        return float(np.mean(np.log(np.maximum(result.text_token_probs, 1e-9))))
