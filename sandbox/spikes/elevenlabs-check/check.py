"""Round-trip TTS clips through Whisper large-v3 and compare with the script that was read.

Usage (the media-ingest spike's venv has faster-whisper on CUDA):
    ../media-ingest/.venv/Scripts/python -I -X utf8 check.py [audio files...]

With no arguments it checks every file in audio/. A file whose name starts with "b" is checked
against b-syllables.txt, anything else against a-sentences.txt. Writes results/<file>.json.

What this can and can't tell you: Whisper catches skipped, garbled or wrong words, and a
character read so badly it becomes another word. It is close to tone-deaf and writes the
right character for a polyphone (行, 长, 得) whatever the reading, so tones and readings
still need a listen; traps.json says what to listen for on each line.
"""

import json
import os
import site
import sys
from pathlib import Path

for sp in site.getsitepackages():  # CUDA DLLs from the pip NVIDIA wheels (see media-ingest/cuda_check.py)
    for sub in ("cublas", "cudnn", "cuda_nvrtc"):
        d = os.path.join(sp, "nvidia", sub, "bin")
        if os.path.isdir(d):
            os.add_dll_directory(d)
            os.environ["PATH"] = d + os.pathsep + os.environ["PATH"]

import zhconv
from faster_whisper import WhisperModel
from pypinyin import Style, lazy_pinyin

HERE = Path(__file__).resolve().parent
MODEL = next((HERE.parent / "media-ingest" / "hf-cache" / "models--Systran--faster-whisper-large-v3" / "snapshots").iterdir())
SCRIPTS = {"a": HERE / "a-sentences.txt", "b": HERE / "b-syllables.txt"}


def norm(s):
    s = zhconv.convert(s, "zh-cn")
    return "".join(ch for ch in s if "一" <= ch <= "鿿")


def py(ch, tone=False):
    return lazy_pinyin(ch, style=Style.TONE3 if tone else Style.NORMAL)[0]


def align(ref, hyp):
    """Levenshtein alignment as (ref_index or None, hyp_char or None, ref_position) triples.
    An insertion has ref_index None and is charged to the reference position before it."""
    n, m = len(ref), len(hyp)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]))
    pairs, i, j = [], n, m
    while i or j:
        if i and j and d[i][j] == d[i - 1][j - 1] + (ref[i - 1] != hyp[j - 1]):
            pairs.append((i - 1, hyp[j - 1], i - 1)); i -= 1; j -= 1
        elif i and d[i][j] == d[i - 1][j] + 1:
            pairs.append((i - 1, None, i - 1)); i -= 1
        else:
            pairs.append((None, hyp[j - 1], max(i - 1, 0))); j -= 1
    return pairs[::-1]


def check(path, model):
    kind = "b" if path.name.lower().startswith("b") else "a"
    lines = [l.strip() for l in SCRIPTS[kind].read_text(encoding="utf-8").splitlines() if l.strip()]
    segments, info = model.transcribe(str(path), language="zh", beam_size=5, condition_on_previous_text=False)
    heard = "".join(s.text for s in segments)
    ref = "".join(norm(l) for l in lines)
    line_of = [k for k, l in enumerate(lines) for _ in norm(l)]
    pairs = align(ref, norm(heard))
    per_line = [{"line": k + 1, "text": l, "heard": "", "char_errors": 0, "pinyin_errors": 0} for k, l in enumerate(lines)]
    for ri, h, pos in pairs:
        row = per_line[line_of[pos]]
        row["heard"] += h or ""
        if ri is None or h is None or h != ref[ri]:
            row["char_errors"] += 1
            if ri is None or h is None or py(h) != py(ref[ri]):
                row["pinyin_errors"] += 1  # a homophone swap (他/她) is a character error but not a sound error
    total_chars = len(ref)
    result = {
        "file": path.name, "script": SCRIPTS[kind].name, "duration_s": round(info.duration, 1),
        "heard": heard,
        "cer": round(sum(r["char_errors"] for r in per_line) / total_chars, 3),
        "pinyin_error_rate": round(sum(r["pinyin_errors"] for r in per_line) / total_chars, 3),
        "lines": per_line,
    }
    if kind == "b":  # single syllables: show the tone of whatever character Whisper chose (a weak signal)
        for r in per_line:
            r["heard_pinyin"] = " ".join(py(c, tone=True) for c in r["heard"])
            r["expected_pinyin"] = py(norm(r["text"]), tone=True)
    out = HERE / "results" / f"{path.stem}.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    return result


def main():
    files = [Path(a) for a in sys.argv[1:]] or sorted(p for p in (HERE / "audio").iterdir() if p.suffix.lower() in (".mp3", ".wav", ".m4a", ".ogg", ".opus", ".flac"))
    model = WhisperModel(str(MODEL), device="cuda", compute_type="float16")
    for f in files:
        r = check(f, model)
        print(f"\n== {r['file']} ({r['script']}, {r['duration_s']} s)  CER {r['cer']:.1%}  pinyin errors {r['pinyin_error_rate']:.1%}")
        for row in r["lines"]:
            mark = "ok " if row["pinyin_errors"] == 0 else "!! "
            extra = f"  [{row['heard_pinyin']} vs {row['expected_pinyin']}]" if "heard_pinyin" in row else ""
            print(f"{mark}{row['line']:>2} {row['text']}  ->  {row['heard']}{extra}")


if __name__ == "__main__":
    main()
