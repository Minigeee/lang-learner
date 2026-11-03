"""Media-ingest spike. Throwaway code.

Stage 1 (analyze): python -I ingest.py analyze <data_dir> <out_dir> [--model DIR] [--compute float16]
  Source adapters -> candidate clips -> ASR (full pass for narration, round trip per clip)
  -> per-clip metrics in <out_dir>/metrics.json. All the GPU work lives here.
Stage 2 (gate): python -I ingest.py gate <data_dir> <out_dir>
  Applies thresholds (GATES) to metrics.json, encodes passing clips to Opus,
  writes <out_dir>/media/*.yaml, <out_dir>/quarantine.json, <out_dir>/summary.json.
Splitting the stages lets thresholds be tuned without re-running ASR.
"""
import functools, glob, hashlib, html, json, os, re, site, subprocess, sys, threading, time
from datetime import date

for _sp in site.getsitepackages():
    for _sub in ("cublas", "cudnn", "cuda_nvrtc"):
        _d = os.path.join(_sp, "nvidia", _sub, "bin")
        if os.path.isdir(_d):
            os.add_dll_directory(_d)
            os.environ["PATH"] = _d + os.pathsep + os.environ["PATH"]

import av
import numpy as np
import pyloudnorm
import yaml
import zhconv
from pypinyin import Style, lazy_pinyin, pinyin

SR_ASR, SR_OUT = 16000, 48000

# ---- thresholds (the gate stage reads these; justification in FINDINGS.md) ----
GATES = {
    "sentence_cer_max": 0.20,      # round-trip hanzi CER vs page text
    "sentence_per_max": 0.10,      # round-trip toneless-pinyin error rate (homophone tolerant)
    "sentence_dur": (0.6, 60.0),   # seconds, hard cap from architecture
    "sec_per_char": (0.10, 1.00),  # titles are read slowly (0.75 s/char seen)
    "word_forced_min": -2.5,       # mean token log-prob of the known word (score_known.py); 0% impostors accepted
    "syl_forced_min": -3.0,  # speech-rate plausibility, catches misalignment
    "word_dur": (0.2, 3.5),        # trimmed speech duration
    "syl_dur": (0.15, 2.0),
    "speech_ratio_min": 0.30,      # active frames / clip frames
    "max_internal_gap": 2.0,       # seconds of silence inside a clip
    "clip_frac_max": 0.001,        # share of samples at |x| >= 0.99
    "lufs": (-40.0, -6.0),         # raw integrated loudness bounds (clips are normalized after)
    "edge_db_max": -25.0,          # first/last 20 ms vs clip p95 frame level (cut-mid-speech check)
}
TARGET_LUFS, PEAK_CEIL_DB, OPUS_BPS = -20.0, -1.0, 32000
PAUSE_WIN = float(os.environ.get("PAUSE_WIN", "0.6"))  # search +-s around whisper boundary for the cut pause
SOFT_PAUSE = os.environ.get("SOFT_PAUSE", "1") == "1"  # accept a quiet dip when there is no true silence


# ---------------------------------------------------------------- audio io
def decode(path, sr):
    """Decode any file to mono float32 at sr."""
    out = []
    with av.open(path) as c:
        rs = av.AudioResampler(format="flt", layout="mono", rate=sr)
        for frame in c.decode(audio=0):
            for f in rs.resample(frame):
                out.append(f.to_ndarray().reshape(-1))
        for f in rs.resample(None):
            out.append(f.to_ndarray().reshape(-1))
    return np.concatenate(out).astype(np.float32) if out else np.zeros(0, np.float32)


def encode_opus(x48, path, bps=OPUS_BPS):
    with av.open(path, "w", format="ogg") as c:
        st = c.add_stream("libopus", rate=SR_OUT, layout="mono")
        st.bit_rate = bps
        fr = av.AudioFrame.from_ndarray(x48.reshape(1, -1).astype(np.float32), format="flt", layout="mono")
        fr.sample_rate = SR_OUT
        fr.pts = 0
        for p in st.encode(fr):
            c.mux(p)
        for p in st.encode(None):
            c.mux(p)


# ---------------------------------------------------------------- signal stats
def frame_db(x, sr, win=0.02, hop=0.01):
    w, h = int(sr * win), int(sr * hop)
    if len(x) < w:
        x = np.pad(x, (0, w - len(x)))
    n = 1 + (len(x) - w) // h
    idx = np.arange(w)[None, :] + h * np.arange(n)[:, None]
    rms = np.sqrt(np.mean(x[idx] ** 2, axis=1) + 1e-12)
    return 20 * np.log10(rms)


def speech_mask(db, rel=30.0):
    thr = max(-50.0 - (rel - 30.0), np.percentile(db, 95) - rel)
    return db > thr


def speech_regions(x, sr, min_gap=0.15, min_len=0.05, rel=30.0):
    db = frame_db(x, sr)
    m = speech_mask(db, rel)
    regs, start = [], None
    for i, v in enumerate(m):
        t = i * 0.01
        if v and start is None:
            start = t
        if not v and start is not None:
            regs.append([start, t + 0.02]); start = None
    if start is not None:
        regs.append([start, len(m) * 0.01 + 0.02])
    merged = []
    for r in regs:
        if merged and r[0] - merged[-1][1] < min_gap:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return [r for r in merged if r[1] - r[0] >= min_len]


def signal_stats(x, sr):
    db = frame_db(x, sr)
    m = speech_mask(db)
    p95 = float(np.percentile(db, 95))
    active = np.flatnonzero(m)
    gaps, run = 0.0, 0
    if len(active):
        inner = m[active[0]:active[-1] + 1]
        for v in inner:
            run = 0 if v else run + 1
            gaps = max(gaps, run * 0.01)
    edge_n = max(1, int(0.02 * sr))
    edge = lambda seg: 20 * np.log10(np.sqrt(np.mean(seg ** 2) + 1e-12))
    meter = pyloudnorm.Meter(sr, block_size=min(0.4, max(0.1, len(x) / sr * 0.9)))
    try:
        lufs = float(meter.integrated_loudness(x.astype(np.float64)))
    except Exception:
        lufs = float("-inf")
    return {
        "dur": round(len(x) / sr, 3),
        "speech_ratio": round(float(m.mean()), 3),
        "lead_sil": round(float(active[0] * 0.01) if len(active) else len(x) / sr, 3),
        "trail_sil": round(float(len(m) - 1 - active[-1]) * 0.01 if len(active) else 0.0, 3),
        "max_gap": round(gaps, 3),
        "clip_frac": float(np.mean(np.abs(x) >= 0.99)),
        "peak_db": round(float(20 * np.log10(np.max(np.abs(x)) + 1e-12)), 2),
        "lufs": round(lufs, 2),
        "p95_db": round(p95, 2),
        "edge_start_db": round(float(edge(x[:edge_n]) - p95), 2),
        "edge_end_db": round(float(edge(x[-edge_n:]) - p95), 2),
    }


# ---------------------------------------------------------------- text
DIG = "零一二三四五六七八九"


def num2zh(n):
    if n < 10:
        return DIG[n]
    if n < 20:
        return "十" + (DIG[n % 10] if n % 10 else "")
    units = [(100000000, "亿"), (10000, "万"), (1000, "千"), (100, "百"), (10, "十")]
    out, zero = "", False
    for u, ch in units:
        q, n = divmod(n, u)
        if q:
            if zero and out:
                out += "零"
            out += (num2zh(q) if q >= 10 else DIG[q]) + ch
            zero = False
        elif out:
            zero = True
    if n:
        out += ("零" if zero else "") + DIG[n]
    return out


def digits_to_hanzi(s):
    def rep(m):
        g = m.group(0)
        if len(g) == 4 and s[m.end():m.end() + 1] == "年" or len(g) > 8:
            return "".join(DIG[int(c)] for c in g)
        return num2zh(int(g))
    return re.sub(r"\d+", rep, s)


def norm(s):
    """Normalize for comparison: simplified, digits read out, punctuation and spaces dropped."""
    s = zhconv.convert(s, "zh-cn")
    s = digits_to_hanzi(s)
    return "".join(ch for ch in s if "一" <= ch <= "鿿" or ch.isalnum()).lower()


@functools.lru_cache(maxsize=None)
def py0(ch):
    return lazy_pinyin(ch, style=Style.NORMAL)[0]


def levenshtein(a, b):
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
        prev = cur
    return prev[-1]


def cer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    return levenshtein(r, h) / max(1, len(r))


def per(ref, hyp):
    r, h = [py0(c) for c in norm(ref)], [py0(c) for c in norm(hyp)]
    return levenshtein(r, h) / max(1, len(r))


def align(ref_chars, hyp_chars):
    """Levenshtein alignment where homophones (same toneless pinyin) count as matches.
    Returns hyp index (or None) for every ref char."""
    n, m = len(ref_chars), len(hyp_chars)
    rp, hp = [py0(c) for c in ref_chars], [py0(c) for c in hyp_chars]
    D = np.zeros((n + 1, m + 1), np.int32)
    D[0, :] = np.arange(m + 1); D[:, 0] = np.arange(n + 1)
    for i in range(1, n + 1):
        sub = np.array([0 if (ref_chars[i - 1] == hyp_chars[j] or rp[i - 1] == hp[j]) else 1 for j in range(m)], np.int32)
        diag = D[i - 1, :-1] + sub
        up = D[i - 1, 1:] + 1
        best = np.minimum(diag, up)
        row = D[i]
        for j in range(1, m + 1):
            row[j] = min(best[j - 1], row[j - 1] + 1)
    out, i, j = [None] * n, n, m
    while i > 0 and j > 0:
        c = 0 if (ref_chars[i - 1] == hyp_chars[j - 1] or rp[i - 1] == hp[j - 1]) else 1
        if D[i, j] == D[i - 1, j - 1] + c:
            out[i - 1] = j - 1; i -= 1; j -= 1
        elif D[i, j] == D[i - 1, j] + 1:
            i -= 1
        else:
            j -= 1
    return out


# ---------------------------------------------------------------- source adapters
LICENSES = {
    "cc-by-sa": {"name": "CC BY-SA (version unstated by source)", "url": "https://github.com/hugolpz/audio-cmn#license",
                 "requires": ["attribution", "share-alike"], "nonCommercialOnly": False},
    "cc-by-3.0": {"name": "CC BY 3.0", "url": "https://creativecommons.org/licenses/by/3.0/", "requires": ["attribution"], "nonCommercialOnly": False},
    "cc-by-4.0": {"name": "CC BY 4.0", "url": "https://creativecommons.org/licenses/by/4.0/", "requires": ["attribution"], "nonCommercialOnly": False},
    "cc-by-nc-3.0": {"name": "CC BY-NC 3.0", "url": "https://creativecommons.org/licenses/by-nc/3.0/", "requires": ["attribution"], "nonCommercialOnly": True},
}


def audio_cmn_items(data):
    """Adapter: one media + one clip per file. Transcript = filename (pinyin or hanzi)."""
    base = "https://github.com/hugolpz/audio-cmn/blob/master/64k/"
    for kind, sub, speaker in (("syl", "syllabs", "Chen Wang"), ("word", "hsk", "Yue Tan")):
        for p in sorted(glob.glob(os.path.join(data, "audio-cmn", "64k", sub, "*.mp3"))):
            stem = os.path.basename(p)[4:-4]
            yield {
                "source": "audio-cmn-" + kind, "kind": kind, "path": p,
                "media_id": f"media:zh-acmn-{kind}-{stem}", "title": stem,
                "expect": stem.lstrip("_") if kind == "syl" else stem,
                "context": "word-audio",
                "speaker": {"id": "speaker:zh-acmn-" + speaker.lower().replace(" ", "-"), "label": speaker},
                "rights": {"license": "cc-by-sa", "author": f"{speaker} (speaker); Hugo Lopez (audio-cmn curation)",
                           "sourceUrl": base + sub + "/" + os.path.basename(p)},
            }


def parse_story(page_path):
    t = open(page_path, encoding="utf-8").read()
    credits = {k: html.unescape(v.strip()) for k, v in re.findall(
        r'data-tooltip="(Written by|Illustrated by|Translated by|Read by)">.*?</span>\s*([^<]+)</h3>', t, re.S)}
    lic = re.search(r'creativecommons\.org/licenses/(by(?:-nc)?)/(\d\.\d)', t)
    level = re.search(r"Level (\d)", t)
    pages = []
    for blk in re.split(r'(?=<div[^>]*id="text\d+")', t)[1:]:
        num = int(re.search(r'id="text(\d+)"', blk).group(1))
        m = re.search(r'<h1><span class="def">(.*?)</span>', blk, re.S) or \
            re.search(r'-txt def"><h3>(.*?)</h3>', blk, re.S)
        en = re.search(r'<span class="l1">(.*?)</span>', blk, re.S) or re.search(r'-txt l1"><h3>(.*?)</h3>', blk, re.S)
        if m:
            pages.append({"page": num, "zh": html.unescape(m.group(1)).strip(),
                          "en": html.unescape(en.group(1)).strip() if en else None})
    return {"credits": credits, "license": f"cc-{lic.group(1)}-{lic.group(2)}" if lic else None,
            "level": int(level.group(1)) if level else None, "pages": pages}


def split_sentences(text):
    parts = re.findall(r"[^。！？!?]+[。！？!?]*[”」』\"]?", text)
    return [p.strip() for p in parts if norm(p)]


def storybook_items(data):
    """Adapter: one media per story (full narration), page text -> sentence references."""
    for d in sorted(glob.glob(os.path.join(data, "storybooks", "*", ""))):
        sid = os.path.basename(os.path.dirname(d))
        meta = parse_story(os.path.join(d, "index.html"))
        sents = []
        for pg in meta["pages"]:
            for k, s in enumerate(split_sentences(pg["zh"])):
                sents.append({"page": pg["page"], "k": k, "zh": s, "en_page": pg["en"]})
        reader = meta["credits"].get("Read by", "unknown")
        yield {
            "source": "storybooks", "kind": "story", "path": os.path.join(d, "full.mp3"),
            "pages_dir": os.path.join(d, "pages"), "media_id": f"media:zh-gs-{sid}",
            "title": meta["pages"][0]["zh"] if meta["pages"] else sid, "context": "storybook",
            "level": meta["level"], "sentences": sents,
            "speaker": {"id": "speaker:zh-gs-" + reader.lower().replace(" ", "-"), "label": reader},
            "rights": {"license": meta["license"],
                       "author": "; ".join(f"{k}: {v}" for k, v in meta["credits"].items()),
                       "sourceUrl": f"https://global-asp.github.io/storybooks-minnesota/stories/zh/{sid}/",
                       "audioUrl": f"https://globalstorybooks.net/media/audio/zh/{sid}/"},
        }


# ---------------------------------------------------------------- ASR
class GpuSampler(threading.Thread):
    def __init__(self):
        super().__init__(daemon=True); self.mem, self.util, self.stop = [], [], False

    def run(self):
        while not self.stop:
            try:
                o = subprocess.run(["nvidia-smi", "--query-gpu=memory.used,utilization.gpu",
                                    "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=5).stdout
                m, u = [float(v) for v in o.strip().split(",")]
                self.mem.append(m); self.util.append(u)
            except Exception:
                pass
            time.sleep(0.5)


def load_model(model_dir, compute):
    from faster_whisper import WhisperModel
    return WhisperModel(model_dir, device="cuda", compute_type=compute)


FULL_VAD = False  # set by --vad: Silero VAD chunking for the full-narration pass only


def asr(model, x16, words=False):
    segs, info = model.transcribe(x16, language="zh", beam_size=5, word_timestamps=words, vad_filter=words and FULL_VAD,
                                  condition_on_previous_text=False, without_timestamps=not words)
    segs = list(segs)
    text = "".join(s.text for s in segs)
    ws = [(w.start, w.end, w.word, w.probability) for s in segs for w in (s.words or [])] if words else []
    return text, ws


# ---------------------------------------------------------------- analyze
def trim_span(x, sr, pad=0.10):
    regs = speech_regions(x, sr)
    if not regs:
        return 0.0, len(x) / sr
    return max(0.0, regs[0][0] - pad), min(len(x) / sr, regs[-1][1] + pad)


def analyze_short(model, it):
    x16 = decode(it["path"], SR_ASR)
    s, e = trim_span(x16, SR_ASR)
    seg = x16[int(s * SR_ASR):int(e * SR_ASR)]
    stats = signal_stats(seg, SR_ASR)
    raw_lead = s
    hyp, _ = asr(model, seg)
    m = {"span": [round(s, 3), round(e, 3)], "src_dur": round(len(x16) / SR_ASR, 3), "raw_lead_sil": round(raw_lead, 3),
         "hyp": hyp, **stats}
    hn = norm(hyp)
    if it["kind"] == "syl":
        exp = it["expect"]
        exp0 = re.sub(r"\d", "", exp)
        cands = [set(p) for p in pinyin(hn, style=Style.TONE3, heteronym=True, neutral_tone_with_five=True)] if hn else []
        m["syl_match"] = any(exp0 in {re.sub(r"\d", "", c) for c in cs} for cs in cands)
        m["tone_match"] = any(exp in cs for cs in cands)
        m["n_hyp_chars"] = len(hn)
    else:
        m["cer"] = round(cer(it["expect"], hyp), 3)
        m["per"] = round(per(it["expect"], hyp), 3)
        m["tone_match"] = lazy_pinyin(norm(it["expect"]), style=Style.TONE3) == lazy_pinyin(hn, style=Style.TONE3)
    return m


def page_offsets(full16, pages_dir):
    """Locate each per-page mp3 inside the full narration by FFT cross-correlation (ground truth)."""
    out = {}
    ds = 4  # 4 kHz is plenty for locating
    f = full16[::ds].astype(np.float64)
    for p in sorted(glob.glob(os.path.join(pages_dir, "*.mp3"))):
        g = decode(p, SR_ASR)
        gg = g[::ds].astype(np.float64)
        n = 1 << int(np.ceil(np.log2(len(f) + len(gg))))
        xc = np.fft.irfft(np.fft.rfft(f, n) * np.conj(np.fft.rfft(gg, n)), n)[:len(f)]
        off = int(np.argmax(xc)) * ds / SR_ASR
        corr = float(np.max(xc) / (np.linalg.norm(gg) * np.linalg.norm(f[int(off * SR_ASR / ds):int(off * SR_ASR / ds) + len(gg)]) + 1e-9))
        regs = speech_regions(g, SR_ASR, rel=45.0)
        out[int(os.path.basename(p)[:2])] = {
            "start": round(off, 3), "end": round(off + len(g) / SR_ASR, 3), "corr": round(corr, 3),
            "speech": [round(off + regs[0][0], 3), round(off + regs[-1][1], 3)] if regs else None}
    return out


def snap(t, regs, which, limit=0.6):
    """Snap a whisper time to the nearest energy-region edge of the same kind within limit."""
    edges = [r[0] if which == "start" else r[1] for r in regs]
    if not edges:
        return t, False
    best = min(edges, key=lambda v: abs(v - t))
    return (best, True) if abs(best - t) <= limit else (t, False)


def analyze_story(model, it, timing):
    x16 = decode(it["path"], SR_ASR)
    dur = len(x16) / SR_ASR
    t0 = time.perf_counter()
    hyp_text, words = asr(model, x16, words=True)
    timing["full_asr_s"] += time.perf_counter() - t0
    timing["full_audio_s"] += dur
    # hyp chars with evenly distributed word times
    hc, ht = [], []
    for ws, we, w, _ in words:
        cs = norm(w)
        for k, ch in enumerate(cs):
            hc.append(ch)
            ht.append((ws + (we - ws) * k / len(cs), ws + (we - ws) * (k + 1) / len(cs)))
    rc, owner = [], []
    for i, s in enumerate(it["sentences"]):
        for ch in norm(s["zh"]):
            rc.append(ch); owner.append(i)
    amap = align(rc, hc)
    regs = speech_regions(x16, SR_ASR)
    truth = page_offsets(x16, it["pages_dir"])
    # raw sentence spans from alignment
    raw = []
    for i, s in enumerate(it["sentences"]):
        idx = [amap[k] for k in range(len(rc)) if owner[k] == i and amap[k] is not None]
        nref = sum(1 for o in owner if o == i)
        if not idx:
            raw.append(None); continue
        a_hyp = "".join(hc[min(idx):max(idx) + 1])
        raw.append({"ws": ht[min(idx)][0], "we": ht[max(idx)][1], "aligned_frac": len(idx) / nref,
                    "align_cer": round(levenshtein(norm(s["zh"]), a_hyp) / nref, 3)})
    # cut in the longest pause near each whisper boundary (inclusive mask: rel 45 dB)
    fdb = frame_db(x16, SR_ASR)
    silent = ~speech_mask(fdb, rel=45.0)  # 10 ms frames
    p95 = float(np.percentile(fdb, 95))
    smooth = np.convolve(fdb, np.ones(8) / 8, mode="same")
    def pause(a, b):
        a, b = max(0, int(a / 0.01)), min(len(silent), int(b / 0.01))
        best, run_s, bl = None, None, 0
        for f in range(a, b + 1):
            if f < b and silent[f]:
                run_s = f if run_s is None else run_s
            elif run_s is not None:
                if f - run_s > bl:
                    best, bl = (run_s * 0.01, f * 0.01 + 0.01), f - run_s
                run_s = None
        if bl >= 8:   # >= 80 ms below the silence threshold
            return best
        if SOFT_PAUSE and b > a:   # fallback: quietest 80 ms stretch, if it is a real dip (30 dB under speech)
            f = a + int(np.argmin(smooth[a:b]))
            if smooth[f] < p95 - 30:
                return (f * 0.01 - 0.04, f * 0.01 + 0.04)
        return None
    live = [i for i, r in enumerate(raw) if r]
    cut = {}   # i -> [start, end, start_found_pause, end_found_pause]
    for n, i in enumerate(live):
        r = raw[i]
        if n == 0:
            g = pause(max(0.0, r["ws"] - 1.5), r["ws"] + 0.3) or (0.0, 0.0)
            start, sp = max(g[1] - 0.2, 0.0), True
        else:
            start, sp = cut[i][0], cut[i][2]
        if n == len(live) - 1:
            g = pause(r["we"] - 0.3, r["we"] + 1.5)
            end, ep = (min(g[0] + 0.3, dur), True) if g else (dur, False)
        else:
            j = live[n + 1]
            lo, hi = sorted((r["we"], raw[j]["ws"]))
            g = pause(lo - PAUSE_WIN, hi + PAUSE_WIN)
            if g:
                mid = (g[0] + g[1]) / 2
                end, nxt, ep = min(g[0] + 0.3, mid), max(g[1] - 0.2, mid), True
            else:
                end = nxt = (r["we"] + raw[j]["ws"]) / 2; ep = False
            cut[j] = [nxt, None, ep, None]
        cut[i] = [start, end, sp, ep]
    spans = [cut.get(i) for i in range(len(raw))]
    clips = []
    for i, sp in enumerate(spans):
        s = it["sentences"][i]
        m = {"page": s["page"], "k": s["k"], "zh": s["zh"], "en_page": s["en_page"]}
        if sp is None:
            m["fail_pre"] = "unaligned"; clips.append(m); continue
        cs, ce = sp[0], sp[1]
        seg = x16[int(cs * SR_ASR):int(ce * SR_ASR)]
        t0 = time.perf_counter()
        rt, _ = asr(model, seg)
        timing["rt_asr_s"] += time.perf_counter() - t0
        timing["rt_audio_s"] += len(seg) / SR_ASR
        m.update({"span": [round(cs, 3), round(ce, 3)], "whisper": [round(raw[i]["ws"], 3), round(raw[i]["we"], 3)],
                  "snapped": [sp[2], sp[3]], "aligned_frac": round(raw[i]["aligned_frac"], 3),
                  "align_cer": raw[i]["align_cer"], "hyp": rt, "cer": round(cer(s["zh"], rt), 3),
                  "per": round(per(s["zh"], rt), 3), "n_chars": len(norm(s["zh"])),
                  **signal_stats(seg, SR_ASR)})
        clips.append(m)
    return {"dur": round(dur, 3), "full_hyp": hyp_text, "n_words": len(words), "truth": truth,
            "regions": len(regs), "clips": clips}


def cmd_analyze(data, out, model_dir, compute, only=None):
    os.makedirs(out, exist_ok=True)
    gpu = GpuSampler(); gpu.start()
    t_load = time.perf_counter()
    model = load_model(model_dir, compute)
    t_load = time.perf_counter() - t_load
    # warm-up so the first item doesn't carry CUDA init cost
    asr(model, np.zeros(SR_ASR, np.float32))
    res = {"model": MODEL_NAME, "full_vad": FULL_VAD, "compute": compute, "load_s": round(t_load, 1), "items": []}
    timing = {"full_asr_s": 0.0, "full_audio_s": 0.0, "rt_asr_s": 0.0, "rt_audio_s": 0.0}
    per_source = {}
    gens = {"acmn": audio_cmn_items, "story": storybook_items}
    for gen in (gens[k](data) for k in gens if only in (None, k)):
        for it in gen:
            t0 = time.perf_counter()
            m = analyze_story(model, it, timing) if it["kind"] == "story" else analyze_short(model, it)
            wall = time.perf_counter() - t0
            src = per_source.setdefault(it["source"], {"wall_s": 0.0, "audio_s": 0.0, "n": 0})
            src["wall_s"] += wall; src["n"] += 1
            src["audio_s"] += m["dur"] if it["kind"] == "story" else m["src_dur"]
            res["items"].append({**{k: v for k, v in it.items() if k not in ("sentences",)}, "m": m})
            if it["kind"] == "story":
                print(f"{it['media_id']}: {m['dur']}s, {len(m['clips'])} sentences, {wall:.1f}s wall", flush=True)
        print({k: {kk: round(vv, 1) for kk, vv in v.items()} for k, v in per_source.items()}, flush=True)
    gpu.stop = True
    res["throughput"] = {"per_source": per_source, **{k: round(v, 2) for k, v in timing.items()},
                         "gpu_mem_peak_mib": max(gpu.mem or [0]), "gpu_mem_idle_mib": min(gpu.mem or [0]),
                         "gpu_util_mean": round(float(np.mean(gpu.util)) if gpu.util else 0, 1)}
    json.dump(res, open(os.path.join(out, "metrics.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps(res["throughput"], indent=1))


# ---------------------------------------------------------------- gate
def check_signal(m, reasons, dur_key):
    lo, hi = GATES[dur_key]
    if not lo <= m["dur"] <= hi:
        reasons.append(f"duration {m['dur']}s outside [{lo}, {hi}]")
    if m["speech_ratio"] < GATES["speech_ratio_min"]:
        reasons.append(f"mostly silence (speech_ratio {m['speech_ratio']})")
    if m["max_gap"] > GATES["max_internal_gap"]:
        reasons.append(f"internal silence {m['max_gap']}s")
    if m["clip_frac"] > GATES["clip_frac_max"]:
        reasons.append(f"clipping ({m['clip_frac']:.4f} of samples)")
    lo, hi = GATES["lufs"]
    if not lo <= m["lufs"] <= hi:
        reasons.append(f"loudness {m['lufs']} LUFS outside [{lo}, {hi}]")


def gate(it, forced):
    """Known-transcript items pass the ASR check if free transcription matches (toneless pinyin)
    OR forced scoring of the known text clears a threshold. Tones are not checked: see FINDINGS."""
    m, reasons = it["m"], []
    f = forced.get((it["kind"], it["expect"]))
    if it["kind"] == "syl":
        check_signal(m, reasons, "syl_dur")
        if not (m["syl_match"] or (f is not None and f >= GATES["syl_forced_min"])):
            reasons.append(f"asr syllable mismatch (expected {it['expect']}, heard {m['hyp']!r}, forced {f})")
    else:
        check_signal(m, reasons, "word_dur")
        if not (m["per"] == 0 or (f is not None and f >= GATES["word_forced_min"])):
            reasons.append(f"asr word mismatch (per {m['per']}, heard {m['hyp']!r}, forced {f})")
    return reasons


def gate_sentence(c):
    if "fail_pre" in c:
        return [c["fail_pre"]]
    reasons = []
    check_signal(c, reasons, "sentence_dur")
    spc = c["dur"] / max(1, c["n_chars"])
    lo, hi = GATES["sec_per_char"]
    if not lo <= spc <= hi:
        reasons.append(f"implausible speech rate {spc:.2f} s/char")
    if c["cer"] > GATES["sentence_cer_max"] and c["per"] > GATES["sentence_per_max"]:
        reasons.append(f"round-trip mismatch (cer {c['cer']}, per {c['per']})")
    if not all(c["snapped"]):
        reasons.append("no pause found at a boundary")
    if max(c["edge_start_db"], c["edge_end_db"]) > GATES["edge_db_max"]:
        reasons.append(f"boundary cuts speech (edge {c['edge_start_db']}/{c['edge_end_db']} dB)")
    return reasons


def render(x48, m):
    gain = TARGET_LUFS - m["lufs"]
    peak_after = m["peak_db"] + gain
    if peak_after > PEAK_CEIL_DB:
        gain -= peak_after - PEAK_CEIL_DB
    y = x48 * (10 ** (gain / 20))
    f = min(len(y) // 2, int(0.005 * SR_OUT))
    if f:
        ramp = np.linspace(0, 1, f, dtype=np.float32)
        y[:f] *= ramp; y[-f:] *= ramp[::-1]
    return y, round(gain, 2)


def write_clip(x48, span, m, out_audio, tmp_name):
    seg = x48[int(span[0] * SR_OUT):int(span[1] * SR_OUT)].copy()
    y, gain = render(seg, m)
    tmp = os.path.join(out_audio, tmp_name + ".opus")
    encode_opus(y, tmp)
    blob = open(tmp, "rb").read()
    h = hashlib.sha256(blob).hexdigest()
    final = os.path.join(out_audio, h[:16] + ".opus")
    os.replace(tmp, final)
    return {"key": f"media/{h[:16]}.opus", "mime": "audio/ogg; codecs=opus", "bytes": len(blob), "sha256": h,
            "durationSec": round(len(y) / SR_OUT, 3), "gainDb": gain}


def cmd_gate(data, out):
    res = json.load(open(os.path.join(out, "metrics.json"), encoding="utf-8", errors="replace"))
    out_audio, out_media = os.path.join(out, "audio"), os.path.join(out, "media")
    os.makedirs(out_audio, exist_ok=True); os.makedirs(out_media, exist_ok=True)
    for f in glob.glob(os.path.join(out_media, "*.yaml")):
        os.remove(f)
    quarantine, summary, speakers, total_bytes, total_sec = [], {}, {}, 0, 0.0
    fp = os.path.join(out, "forced_scores.json")
    forced = {(r["kind"], r["expect"]): r["true"] for r in json.load(open(fp, encoding="utf-8"))} if os.path.exists(fp) else {}
    t_enc = time.perf_counter()
    stamp = {"pipeline": "media-ingest-spike", "asr": f"faster-whisper {res['model']} {res['compute']}",
             "date": date.today().isoformat()}
    for it in res["items"]:
        src = summary.setdefault(it["source"], {"candidates": 0, "passed": 0, "reasons": {}})
        speakers[it["speaker"]["id"]] = {"id": it["speaker"]["id"], "label": it["speaker"]["label"]}
        cands = it["m"]["clips"] if it["kind"] == "story" else [it["m"]]
        x48 = decode(it["path"], SR_OUT)
        clips = []
        for n, c in enumerate(cands):
            src["candidates"] += 1
            reasons = gate_sentence(c) if it["kind"] == "story" else gate(it, forced)
            cid = f"{it['media_id'].replace('media:', 'clip:')}" + (f"-p{c['page']:02d}s{c['k']}" if it["kind"] == "story" else "")
            if reasons:
                quarantine.append({"clip": cid, "source": it["source"], "reasons": reasons,
                                   "text": c.get("zh", it.get("expect")), "span": c.get("span"),
                                   "hyp": c.get("hyp")})
                for r in reasons:
                    key = re.sub(r"\s(\(|-?\d).*$", "", r)
                    src["reasons"][key] = src["reasons"].get(key, 0) + 1
                continue
            src["passed"] += 1
            fi = write_clip(x48, c["span"], c, out_audio, re.sub(r"[^\w-]", "_", cid))
            total_bytes += fi["bytes"]; total_sec += fi["durationSec"]
            line = {"t": [0.0, fi["durationSec"]],
                    "zh": c["zh"] if it["kind"] == "story" else (it["expect"] if it["kind"] == "word" else ""),
                    "speaker": it["speaker"]["id"]}
            if it["kind"] == "syl":
                line["py"] = it["expect"]
            clip = {"id": cid, "span": c["span"], "file": fi, "lines": [line],
                    "validation": {k: c[k] for k in ("cer", "per", "lufs", "peak_db", "speech_ratio", "edge_start_db",
                                                     "edge_end_db", "align_cer", "aligned_frac") if k in c}}
            if it["kind"] == "story":
                clip["page"] = c["page"]
            elif (it["kind"], it["expect"]) in forced:
                clip["validation"]["forced_logp"] = round(forced[(it["kind"], it["expect"])], 2)
            clips.append(clip)
        media = {"id": it["media_id"], "title": it["title"], "context": it["context"],
                 "durationSec": it["m"].get("dur") if it["kind"] == "story" else it["m"]["src_dur"],
                 "speakers": [it["speaker"]["id"]], "status": "active",
                 "source": {"provider": "rehost", "originalUrl": it["rights"].get("audioUrl", it["rights"]["sourceUrl"])},
                 "rights": {"kind": "open", "license": it["rights"]["license"], "author": it["rights"]["author"],
                            "sourceUrl": it["rights"]["sourceUrl"], "modified": True,
                            "changes": "trimmed/cut, loudness-normalized, re-encoded to Opus 32 kbps mono"},
                 "ingest": stamp}
        if it.get("level"):
            media["level"] = it["level"]
        if clips:
            fn = re.sub(r"[^\w-]", "_", it["media_id"].replace("media:", "")) + ".yaml"
            yaml.safe_dump({"media": media, "clips": clips}, open(os.path.join(out_media, fn), "w", encoding="utf-8"),
                           allow_unicode=True, sort_keys=False, width=200)
    yaml.safe_dump({"speakers": list(speakers.values()),
                    "licenses": [{"id": k, **v} for k, v in LICENSES.items()]},
                   open(os.path.join(out_media, "_registry.yaml"), "w", encoding="utf-8"), allow_unicode=True, sort_keys=False)
    json.dump(quarantine, open(os.path.join(out, "quarantine.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    summ = {"per_source": summary, "encode_wall_s": round(time.perf_counter() - t_enc, 1),
            "opus_bytes": total_bytes, "opus_seconds": round(total_sec, 1),
            "mb_per_audio_hour": round(total_bytes / 1e6 / (total_sec / 3600), 1) if total_sec else None,
            "gates": GATES}
    json.dump(summ, open(os.path.join(out, "summary.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps(summ, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "analyze":
        model_dir = sys.argv[sys.argv.index("--model") + 1]
        compute = sys.argv[sys.argv.index("--compute") + 1] if "--compute" in sys.argv else "float16"
        only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
        FULL_VAD = "--vad" in sys.argv
        MODEL_NAME = sys.argv[sys.argv.index("--name") + 1] if "--name" in sys.argv else "large-v3"
        cmd_analyze(os.path.abspath(sys.argv[2]), os.path.abspath(sys.argv[3]), model_dir, compute, only)
    elif cmd == "gate":
        cmd_gate(os.path.abspath(sys.argv[2]), os.path.abspath(sys.argv[3]))
