"""Experiment: validate known-transcript items by forced scoring instead of free transcription.
Run: python -I -X utf8 score_known.py <data_dir> <out_dir> <model_dir>

For each audio-cmn item, Whisper scores P(text | audio) by teacher forcing (ct2 `align`, which returns
per-token probabilities). We score the true text and impostor texts to see whether a threshold
separates them:
  words:     true word vs a random HSK word with a different toneless pinyin
  syllables: a char with the right toned reading vs a char with same syllable, other tone
Writes <out_dir>/forced_scores.json.
"""
import json, os, random, re, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ingest as I  # noqa: E402
from pypinyin import Style, lazy_pinyin  # noqa: E402

data, out, model_dir = sys.argv[1:4]
model = I.load_model(model_dir, "float16")
from faster_whisper.audio import pad_or_trim  # noqa: E402
from faster_whisper.tokenizer import Tokenizer  # noqa: E402

tok = Tokenizer(model.hf_tokenizer, True, task="transcribe", language="zh")


def score(x16, texts):
    feats = model.feature_extractor(x16)
    n_frames = feats.shape[-1]
    enc = model.encode(pad_or_trim(feats))
    toks = [tok.encode(t) for t in texts]
    res = [model.model.align(enc, tok.sot_sequence, [t], min(n_frames, 3000) // 2)[0] for t in toks]
    # mean log prob per text (EOT prob is the last entry)
    return [float(np.mean(np.log(np.maximum(r.text_token_probs, 1e-9)))) for r in res]


# a reading -> common chars map, from the HSK word list chars first, then the CJK block
hsk_words = [it["expect"] for it in I.audio_cmn_items(data) if it["kind"] == "word"]
chars = list(dict.fromkeys("".join(hsk_words))) + [chr(c) for c in range(0x4E00, 0x9FA6)]
by_reading = {}
for ch in chars:
    r = lazy_pinyin(ch, style=Style.TONE3, neutral_tone_with_five=True)[0]
    by_reading.setdefault(r, []).append(ch)

rnd = random.Random(1)
rows = []
for it in I.audio_cmn_items(data):
    x = I.decode(it["path"], I.SR_ASR)
    s, e = I.trim_span(x, I.SR_ASR)
    seg = x[int(s * I.SR_ASR):int(e * I.SR_ASR)]
    if it["kind"] == "word":
        w = it["expect"]
        p0 = [I.py0(c) for c in w]
        imp = rnd.choice([v for v in hsk_words if [I.py0(c) for c in v] != p0])
        t, f = score(seg, [w, imp])
        rows.append({"kind": "word", "expect": w, "true": t, "impostor": f, "impostor_text": imp})
    else:
        syl = it["expect"]
        if syl not in by_reading:
            continue
        base = re.sub(r"\d", "", syl)
        others = [base + str(k) for k in "12345" if base + str(k) != syl and base + str(k) in by_reading]
        texts = [by_reading[syl][0]] + [by_reading[o][0] for o in others]
        sc = score(seg, texts)
        rows.append({"kind": "syl", "expect": syl, "true_char": texts[0], "true": sc[0],
                     "other_tones": dict(zip(others, sc[1:]))})
json.dump(rows, open(os.path.join(out, "forced_scores.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

w = [r for r in rows if r["kind"] == "word"]
t, f = np.array([r["true"] for r in w]), np.array([r["impostor"] for r in w])
print("words n=", len(w), "true mean logp pct[5,50,95]", np.percentile(t, [5, 50, 95]).round(2),
      "impostor", np.percentile(f, [5, 50, 95]).round(2))
for thr in (-3.0, -2.5, -2.0, -1.5, -1.0):
    print(f"  thr {thr}: accept true {np.mean(t >= thr):.3f}, accept impostor {np.mean(f >= thr):.3f}")
print("  pairwise true>impostor:", np.mean(t > f).round(3))
sy = [r for r in rows if r["kind"] == "syl" and r["other_tones"]]
best = [r["true"] > max(r["other_tones"].values()) for r in sy]
print("syllables n=", len(sy), "true tone scores highest among tones:", np.mean(best).round(3),
      "(chance ~", np.mean([1 / (1 + len(r["other_tones"])) for r in sy]).round(3), ")")
