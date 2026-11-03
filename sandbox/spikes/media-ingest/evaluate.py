"""Alignment-quality evaluation. Run: python -I -X utf8 evaluate.py <out_dir> [<data_dir>]

Ground truth: Global Storybooks ships per-page mp3s split from the same narration. ingest.py locates
each page in the full file (cross-correlation) and its speech onset/offset (energy). Every page edge
is also a sentence edge, so page-first/page-last sentence clips can be scored against truth.
Also prints a waveform spot-check of 10 clips (we can't listen, so energy envelopes are the proxy).
"""
import json, os, random, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ingest as I  # noqa: E402

out = sys.argv[1]
res = json.load(open(os.path.join(out, "metrics.json"), encoding="utf-8", errors="replace"))
rows = []
for it in res["items"]:
    if it["kind"] != "story":
        continue
    m, truth = it["m"], it["m"]["truth"]
    clips = [c for c in m["clips"] if "span" in c]
    by_page = {}
    for c in clips:
        by_page.setdefault(c["page"], []).append(c)
    for pg, cs in by_page.items():
        T = truth.get(str(pg))
        P, N = truth.get(str(pg - 1)), truth.get(str(pg + 1))
        if not T or not T["speech"]:
            continue
        first, last = cs[0], cs[-1]
        for c in cs:
            rows.append({"media": it["media_id"], "page": pg, "zh": c["zh"],
                         # leak = the clip reaches into speech that belongs to a neighboring page
                         "inside_page": (not P or not P["speech"] or c["span"][0] >= P["speech"][1])
                                        and (not N or not N["speech"] or c["span"][1] <= N["speech"][0]),
                         "onset_err": round(c["span"][0] - T["speech"][0], 3) if c is first else None,
                         "offset_err": round(c["span"][1] - T["speech"][1], 3) if c is last else None,
                         "w_onset_err": round(c["whisper"][0] - T["speech"][0], 3) if c is first else None,
                         "w_offset_err": round(c["whisper"][1] - T["speech"][1], 3) if c is last else None,
                         "corr": T["corr"]})


def q(v):
    v = [x for x in v if x is not None]
    if not v:
        return "n/a"
    a = np.abs(np.array(v))
    return f"n={len(v)} median|err|={np.median(a):.3f}s p90={np.percentile(a, 90):.3f}s max={a.max():.3f}s"


print("model:", res["model"], res["compute"], "full_vad:", res.get("full_vad"))
print("clips scored:", len(rows), " not leaking into a neighboring page:", sum(r["inside_page"] for r in rows))
on = [r["onset_err"] for r in rows if r["onset_err"] is not None]
off = [r["offset_err"] for r in rows if r["offset_err"] is not None]
print("final onset  (clip start - true speech onset):", q(on))
print("final offset (clip end - true speech offset): ", q(off))
print("whisper raw onset: ", q([r["w_onset_err"] for r in rows]))
print("whisper raw offset:", q([r["w_offset_err"] for r in rows]))
print("onset truncated >50ms:", sum(1 for v in on if v > 0.05), "/", len(on),
      " offset truncated >50ms:", sum(1 for v in off if v < -0.05), "/", len(off))
print("page-location corr (min/median):", min(r["corr"] for r in rows), np.median([r["corr"] for r in rows]))
bad = [r for r in rows if not r["inside_page"] or (r["onset_err"] or 0) > 0.05 or (r["offset_err"] or 0) < -0.05]
for r in bad:
    print("  BAD", r["media"], "p", r["page"], r["zh"][:20], {k: r[k] for k in ("inside_page", "onset_err", "offset_err")})

# ---- waveform spot-check
if len(sys.argv) > 2:
    rnd = random.Random(7)
    cands = [(it, c) for it in res["items"] if it["kind"] == "story" for c in it["m"]["clips"] if "span" in c]
    picks = rnd.sample(cands, min(10, len(cands)))
    cache = {}
    print("\nSpot-check: 100 ms frame levels (dB rel. clip p95), '#'>=-10 '+'>=-20 '-'>=-35 '.' below")
    for it, c in picks:
        if it["path"] not in cache:
            cache[it["path"]] = I.decode(it["path"], I.SR_ASR)
        x = cache[it["path"]]
        s, e = c["span"]
        ctx = x[int(max(0, s - 0.5) * I.SR_ASR):int((e + 0.5) * I.SR_ASR)]
        db = I.frame_db(ctx, I.SR_ASR, win=0.1, hop=0.1) - c["p95_db"]
        lead = int(round((s - max(0, s - 0.5)) / 0.1))
        bar = "".join("#" if v >= -10 else "+" if v >= -20 else "-" if v >= -35 else "." for v in db)
        n_clip = int(round((e - s) / 0.1))
        bar = bar[:lead] + "[" + bar[lead:lead + n_clip] + "]" + bar[lead + n_clip:]
        print(f"{it['media_id'][-4:]} p{c['page']:02d} {c['dur']:5.2f}s cer={c['cer']:.2f} lead={c['lead_sil']:.2f} "
              f"trail={c['trail_sil']:.2f} edge={c['edge_start_db']:.0f}/{c['edge_end_db']:.0f}dB {c['zh'][:18]}")
        print("   ", bar)
