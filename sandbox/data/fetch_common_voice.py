"""Download the Common Voice zh-CN dataset from Mozilla Data Collective, extract it, delete the archive.

Usage:  python sandbox/data/fetch_common_voice.py

Reads MOZILLA_DATA_COLLECTIVE_API_KEY from the environment or from the repo-root
.env.development.local. Safe to rerun: an interrupted download resumes, and a finished
extraction (marked by .complete) is left alone. Peak disk use is about twice the archive
size, because the archive is only deleted once extraction has succeeded.
"""

import hashlib
import json
import os
import shutil
import sys
import tarfile
import time
import urllib.error
import urllib.request
from pathlib import Path

DATASET_ID = "cmu5lcunh00qimh078sdd5so8"  # Common Voice Scripted Speech 27.0, Chinese (zh-CN)
API = f"https://mozilladatacollective.com/api/datasets/{DATASET_ID}/download"
KEY_NAME = "MOZILLA_DATA_COLLECTIVE_API_KEY"
USER_AGENT = "lang-learner-fetch/1.0"  # the API answers 403 to urllib's default agent

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
OUT = HERE / "common-voice-zh-CN"
ARCHIVE = OUT / "archive.tar.gz"
PART = OUT / "archive.tar.gz.part"
DONE = OUT / ".complete"
CHUNK = 8 * 1024 * 1024


def log(msg):
    print(time.strftime("%H:%M:%S"), msg, flush=True)


def api_key():
    if os.environ.get(KEY_NAME):
        return os.environ[KEY_NAME]
    env = REPO / ".env.development.local"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            name, _, value = line.partition("=")
            if name.strip() == KEY_NAME and value.strip():
                return value.strip().strip('"').strip("'")
    sys.exit(f"{KEY_NAME} is not set (environment or {env})")


def grant(key):
    """Ask the API for a download grant: {downloadUrl, sizeBytes, checksum (sha256), ...}.

    Presigned URLs expire, so this is called on every (re)connect. Never log the URL: it carries a signature.
    """
    req = urllib.request.Request(API, method="POST", data=b"{}", headers={
        "Authorization": f"Bearer {key}", "Content-Type": "application/json", "User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def download(key):
    for attempt in range(1, 31):
        have = PART.stat().st_size if PART.exists() else 0
        try:
            g = grant(key)
            total = int(g["sizeBytes"])
            if attempt == 1:
                need = total * 2.05 - have
                free = shutil.disk_usage(OUT).free
                if free < need:
                    sys.exit(f"need about {need / 1e9:.0f} GB free, have {free / 1e9:.0f} GB")
            if have >= total:
                break
            headers = {"User-Agent": USER_AGENT, **({"Range": f"bytes={have}-"} if have else {})}
            with urllib.request.urlopen(urllib.request.Request(g["downloadUrl"], headers=headers), timeout=120) as r:
                if have and r.status != 206:
                    log("server ignored the resume request; starting over")
                    have = 0
                log(f"downloading from {have / 1e9:.2f} GB of {total / 1e9:.2f} GB")
                last = time.time()
                with open(PART, "ab" if have else "wb") as f:
                    while chunk := r.read(CHUNK):
                        f.write(chunk)
                        have += len(chunk)
                        if time.time() - last > 60:
                            log(f"  {have / 1e9:.2f} / {total / 1e9:.2f} GB")
                            last = time.time()
            if have >= total:
                break
        except urllib.error.HTTPError as e:
            if e.code == 416 and have:  # range starts at the end: the previous run got every byte
                break
            if e.code in (401, 403):
                sys.exit(f"HTTP {e.code}: check the API key and that the dataset's terms are accepted on the site")
            log(f"attempt {attempt} failed: HTTP {e.code}; retrying in 15 s")
            time.sleep(15)
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            log(f"attempt {attempt} failed: {e}; retrying in 15 s")
            time.sleep(15)
    else:
        sys.exit("download did not finish after 30 attempts; rerun to resume")
    log("verifying sha256")
    h = hashlib.sha256()
    with open(PART, "rb") as f:
        while chunk := f.read(CHUNK):
            h.update(chunk)
    if PART.stat().st_size != total or h.hexdigest() != g["checksum"]:
        PART.unlink()
        sys.exit("size or checksum mismatch; deleted the partial file, rerun to download again")
    PART.rename(ARCHIVE)
    log(f"downloaded and verified {total / 1e9:.2f} GB")


def extract():
    log("extracting (hundreds of thousands of small files; this is slow on Windows)")
    n = 0
    with tarfile.open(ARCHIVE, "r|gz") as tar:  # stream mode: one pass, no index of the whole archive
        for member in tar:
            tar.extract(member, OUT, filter="data")  # 'data' rejects absolute paths, links out of OUT, devices
            n += 1
            if n % 50000 == 0:
                log(f"  {n} entries")
    log(f"extracted {n} entries")


def main():
    if DONE.exists():
        log(f"already complete: {OUT}")
        return
    OUT.mkdir(parents=True, exist_ok=True)
    key = api_key()
    if not ARCHIVE.exists():
        download(key)
    extract()
    ARCHIVE.unlink()
    DONE.write_text(time.strftime("%Y-%m-%d %H:%M:%S\n"), encoding="utf-8")
    tsvs = sorted(p.relative_to(OUT).as_posix() for p in OUT.rglob("*.tsv"))
    log("archive deleted; TSVs:\n  " + "\n  ".join(tsvs))


if __name__ == "__main__":
    main()
