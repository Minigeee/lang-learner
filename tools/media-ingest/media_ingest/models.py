"""Model weights in the cache: obtaining them, and loading them by the stage that needs them.

Hugging Face is the first choice. It has been unreliable from this machine, so Whisper falls back to
a ModelScope mirror, and either route must produce `WHISPER_BIN_SHA256`.
"""

import hashlib
import json
import os
import shutil
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from .clip_requests import ClipRequest, SynthLine
from .workspace import Workspace

WHISPER_REPO = "Systran/faster-whisper-large-v3"
WHISPER_MIRROR = "pengzhendong/faster-whisper-large-v3"
WHISPER_FILES = ("config.json", "model.bin", "preprocessor_config.json", "tokenizer.json", "vocabulary.json")
WHISPER_BIN_SHA256 = "69f74147e3334731bc3a76048724833325d2ec74642fb52620eda87352e3d4f1"
TONE_MODEL_CACHE = "models--cge7--wav2vec2-base-version3"
MODELSCOPE_API = "https://www.modelscope.cn/api/v1/models/{repo}/repo"
MIRROR_CONNECTIONS = 8
MIRROR_SEGMENT_BYTES = 32 << 20


def whisper_dir(ws: Workspace) -> Path:
    return ws.models_dir / "whisper-large-v3"


def _hf_cache(ws: Workspace) -> Path:
    return ws.models_dir / "hf" / "hub"


def _whisper_complete(folder: Path) -> bool:
    return all((folder / name).exists() for name in WHISPER_FILES)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        while chunk := f.read(1 << 24):
            digest.update(chunk)
    return digest.hexdigest()


def _from_hugging_face(dest: Path, attempts: int = 3) -> None:
    from huggingface_hub import snapshot_download

    for attempt in range(attempts):
        try:
            snapshot_download(WHISPER_REPO, local_dir=dest, allow_patterns=list(WHISPER_FILES))
            if _whisper_complete(dest):  # offline, the hub returns a partial folder without raising
                return
            raise OSError("incomplete snapshot")
        except Exception as e:  # the hub raises many unrelated types for one flaky connection
            print(f"  Hugging Face attempt {attempt + 1} failed: {type(e).__name__}", flush=True)
            if attempt == attempts - 1:
                raise
            time.sleep(5 * (attempt + 1))


def _mirror_segment(url: str, start: int, end: int, part: Path, attempts: int = 30) -> None:
    """Saves bytes [start, end) to `part`, continuing whatever an earlier attempt left there."""
    for _ in range(attempts):
        have = part.stat().st_size if part.exists() else 0
        if have >= end - start:
            return
        request = urllib.request.Request(url, headers={"Range": f"bytes={start + have}-{end - 1}"})
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                # Small files come back whole, as a 200. `_from_mirror_file` checks the joined size.
                if response.status != 206 and start + have > 0:
                    raise OSError("the mirror ignored the Range header")
                with part.open("ab") as f:
                    while chunk := response.read(1 << 20):
                        f.write(chunk)
        except OSError as e:
            print(f"  mirror retry {part.name}: {e}", flush=True)
    raise OSError(f"{part.name}: incomplete download from the mirror")


def _from_mirror_file(path: str, size: int, dest: Path) -> None:
    """Downloads over parallel connections, because the mirror throttles each one to about 1 MB/s."""
    query = urllib.parse.urlencode({"Revision": "master", "FilePath": path})
    url = MODELSCOPE_API.format(repo=WHISPER_MIRROR) + "?" + query
    segments_dir = dest / f"{path}.segments"
    segments_dir.mkdir(exist_ok=True)
    starts = range(0, size, MIRROR_SEGMENT_BYTES)
    parts = [segments_dir / f"{i:05d}" for i in range(len(starts))]
    with ThreadPoolExecutor(MIRROR_CONNECTIONS) as pool:
        jobs = [pool.submit(_mirror_segment, url, start, min(start + MIRROR_SEGMENT_BYTES, size), part)
                for start, part in zip(starts, parts)]
        for job in jobs:
            job.result()
    joined = dest / f"{path}.part"
    with joined.open("wb") as out:
        for part in parts:
            with part.open("rb") as f:
                shutil.copyfileobj(f, out, 1 << 24)
    if joined.stat().st_size != size:
        joined.unlink()
        shutil.rmtree(segments_dir)
        raise OSError(f"{path}: wrong size from the mirror")
    joined.replace(dest / path)
    shutil.rmtree(segments_dir)


def _from_mirror(dest: Path) -> None:
    listing_url = MODELSCOPE_API.format(repo=WHISPER_MIRROR) + "/files?Revision=master&Recursive=true"
    with urllib.request.urlopen(listing_url, timeout=60) as response:
        sizes = {f["Path"]: f["Size"] for f in json.load(response)["Data"]["Files"]}
    for path in WHISPER_FILES:
        if not (dest / path).exists():
            _from_mirror_file(path, sizes[path], dest)


def ensure_whisper(ws: Workspace) -> None:
    dest = whisper_dir(ws)
    if _whisper_complete(dest):
        return
    dest.mkdir(parents=True, exist_ok=True)
    print("models: downloading Whisper large-v3 (about 3 GB)", flush=True)
    try:
        _from_hugging_face(dest)
    except Exception:
        print("models: falling back to the ModelScope mirror", flush=True)
        _from_mirror(dest)
    if _sha256(dest / "model.bin") != WHISPER_BIN_SHA256:
        (dest / "model.bin").unlink()
        raise OSError("Whisper model.bin failed its SHA-256 check and was removed")


def ensure_tone_grader(ws: Workspace) -> None:
    """Caches the classifier. The aligner's weights arrive through torch on first use."""
    if (_hf_cache(ws) / TONE_MODEL_CACHE).exists():
        return
    from huggingface_hub import snapshot_download

    from .tone import TONE_MODEL
    snapshot_download(TONE_MODEL, cache_dir=_hf_cache(ws))


def ensure_models(requests: list[ClipRequest], ws: Workspace) -> list[str]:
    """Obtains what analyzing `requests` will need. Returns a failure line per model it couldn't get."""
    failures = []
    if any(r.kind != "syllable" for r in requests):
        try:
            ensure_whisper(ws)
        except Exception as e:
            failures.append(f"Whisper model unavailable: {e}")
    if any(isinstance(r, SynthLine) for r in requests):
        try:
            ensure_tone_grader(ws)
        except Exception as e:
            failures.append(f"tone model unavailable: {e}")
    return failures


def load_whisper(ws: Workspace):
    from .asr import Whisper
    return Whisper(whisper_dir(ws))


def load_tone_grader(ws: Workspace):
    os.environ["TORCH_HOME"] = str(ws.models_dir / "torch")
    from .tone import ToneGrader
    return ToneGrader(_hf_cache(ws))
