"""Download the spike's model weights from ModelScope into models/<repo>/.

Hugging Face was unreachable from this machine on 2026-11-03 (TLS reset), so
weights come from ModelScope. BAAI and Qwen publish there themselves, and the
Chinese-CLIP README links its AI-ModelScope copies. The SigLIP 2 repo under
ModelScope's `google` namespace is a mirror, so only its safetensors are used.
Only config, tokenizer and weight files are fetched; no repo code is run.

Usage: .venv/Scripts/python -I fetch_models.py [repo ...]   (default: all)
"""
import json
import pathlib
import sys
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent / "models"
API = "https://www.modelscope.cn/api/v1/models/{repo}/repo"

REPOS = {
    "BAAI/bge-m3": None,  # text embedder for the caption route
    "AI-ModelScope/chinese-clip-vit-large-patch14": None,  # zh text -> image
    "google/siglip2-base-patch16-256": None,  # multilingual text -> image
    "Qwen/Qwen3-VL-2B-Instruct": None,  # VLM gate
}
# Skip duplicate checkpoints and sample images; transformers needs only these.
SKIP_SUFFIXES = (".jpg", ".png", ".pt", ".onnx", ".md")
SKIP_DIRS = ("onnx/", "imgs/")


def list_files(repo: str) -> list[dict]:
    url = API.format(repo=repo) + "/files?Revision=master&Recursive=true"
    with urllib.request.urlopen(url, timeout=60) as r:
        data = json.load(r)
    return [f for f in data["Data"]["Files"] if f["Type"] == "blob"]


def fetch(repo: str, path: str, size: int) -> None:
    dest = ROOT / repo / path
    if dest.exists() and dest.stat().st_size == size:
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    q = urllib.parse.urlencode({"Revision": "master", "FilePath": path})
    url = API.format(repo=repo) + "?" + q
    tmp = dest.with_suffix(dest.suffix + ".part")
    # The CDN drops long transfers, so resume with Range requests.
    for _ in range(30):
        have = tmp.stat().st_size if tmp.exists() else 0
        if have >= size:
            break
        req = urllib.request.Request(url, headers={"Range": f"bytes={have}-"} if have else {})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                mode = "ab" if have and r.status == 206 else "wb"
                with open(tmp, mode) as f:
                    while chunk := r.read(1 << 20):
                        f.write(chunk)
        except OSError as e:
            print(f"  retry {path}: {e}", flush=True)
    if tmp.stat().st_size != size:
        raise RuntimeError(f"{repo}/{path}: got {tmp.stat().st_size} bytes, want {size}")
    tmp.replace(dest)
    print(f"  {repo}/{path} ({size / 1e6:.0f} MB)", flush=True)


def main() -> None:
    for repo in sys.argv[1:] or REPOS:
        print(repo, flush=True)
        for f in list_files(repo):
            p = f["Path"]
            if p.endswith(SKIP_SUFFIXES) or p.startswith(SKIP_DIRS):
                continue
            fetch(repo, p, f["Size"])


if __name__ == "__main__":
    sys.exit(main())
