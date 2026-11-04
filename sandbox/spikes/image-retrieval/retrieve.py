"""Retrieve candidate images for each test sentence, by six methods.

Caption route (text-to-text): BGE-M3 dense embeddings of the dataset's captions,
queried with the sentence. An image's score is its best caption's cosine.
Image route (text-to-image): CLIP-family embeddings of the images themselves.

Methods (pool, model, query language):
  cap_coco_en   COCO 2017 train+val (123k images, 5 captions each), BGE-M3, en
  cap_coco_zh   same pool and model, zh query against English captions
  cap_oi_en     Open Images Localized Narratives captions (671k images), BGE-M3, en
  cap_val_en    COCO val2017 only (5k), BGE-M3, en        <- same pool as the next two
  cnclip_val_zh COCO val2017 images, Chinese-CLIP ViT-L/14, zh
  siglip_val_en COCO val2017 images, SigLIP 2 base (multilingual), en

Writes out/candidates.json: per sentence and method, the top 3 images with
score, the runner-up margin, the source URL and the license fields we have.
Embeddings are cached in cache/ so reruns are cheap.

Usage: .venv/Scripts/python -I -X utf8 retrieve.py
"""
import csv
import json
import pathlib

import numpy as np
import torch
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
DATA = HERE.parents[1] / "data"
COCO = DATA / "coco"
OI = DATA / "openimages"
MODELS = HERE / "models"
CACHE = HERE / "cache"
OUT = HERE / "out"
DEV = "cuda" if torch.cuda.is_available() else "cpu"
TOPK = 3


def load_sentences():
    with open(HERE / "sentences.tsv", encoding="utf8") as f:
        return list(csv.DictReader(f, delimiter="\t"))


def coco_pool(splits):
    """Return (image_ids, captions, caption_owner_index, meta by image id)."""
    lic_names, meta, caps, owner, ids = {}, {}, [], [], []
    for s in splits:
        d = json.load(open(COCO / "annotations" / f"captions_{s}.json", encoding="utf8"))
        lic_names = {l["id"]: l for l in d["licenses"]}
        for im in d["images"]:
            lic = lic_names[im["license"]]
            meta[im["id"]] = {
                "url": im["coco_url"], "flickr_url": im["flickr_url"],
                "license": lic["name"], "license_url": lic["url"], "author": None,
                "file": str(COCO / s / im["file_name"]) if s == "val2017" else None,
            }
        for a in d["annotations"]:
            caps.append(a["caption"].strip())
            owner.append(a["image_id"])
    ids = sorted(set(owner))
    pos = {i: k for k, i in enumerate(ids)}
    return ids, caps, np.array([pos[o] for o in owner]), meta


def oi_pool():
    meta = {}
    for split, fn in (("validation", "validation-images-with-rotation.csv"),
                      ("test", "test-images-with-rotation.csv")):
        with open(OI / fn, encoding="utf8") as f:
            for r in csv.DictReader(f):
                meta[r["ImageID"]] = {"license_url": r["License"], "author": r["Author"],
                                      "landing": r["OriginalLandingURL"]}
    caps, owner_ids, split_of = [], [], {}
    for split, fn in (("train", "open_images_train_v6_captions.jsonl"),
                      ("validation", "open_images_validation_captions.jsonl"),
                      ("test", "open_images_test_captions.jsonl")):
        with open(OI / fn, encoding="utf8") as f:
            for line in f:
                r = json.loads(line)
                caps.append(r["caption"].strip())
                owner_ids.append(r["image_id"])
                split_of[r["image_id"]] = split
    ids = sorted(set(owner_ids))
    pos = {i: k for k, i in enumerate(ids)}
    full = {}
    for i in ids:
        m = meta.get(i, {})
        full[i] = {
            "url": f"https://open-images-dataset.s3.amazonaws.com/{split_of[i]}/{i}.jpg",
            # Train-split author/license rows live in a 3.3 GB CSV we did not fetch;
            # the dataset page lists every image as CC BY 2.0.
            "license_url": m.get("license_url"), "author": m.get("author"),
            "landing": m.get("landing"), "file": None,
        }
    return ids, caps, np.array([pos[o] for o in owner_ids]), full


def bge():
    from sentence_transformers import SentenceTransformer
    m = SentenceTransformer(str(MODELS / "BAAI/bge-m3"), device=DEV)
    m.half()
    m.max_seq_length = 128  # Localized Narratives run long; the head carries the scene
    return m


def embed_texts(model, texts, cache_name):
    path = CACHE / f"{cache_name}.npy"
    if path.exists():
        return np.load(path)
    order = np.argsort([len(t) for t in texts])  # length-sorted batches run faster
    vecs = model.encode([texts[i] for i in order], batch_size=256, normalize_embeddings=True,
                        convert_to_numpy=True, show_progress_bar=True).astype(np.float16)
    out = np.empty_like(vecs)
    out[order] = vecs
    CACHE.mkdir(exist_ok=True)
    np.save(path, out)
    return out


def image_scores(cap_vecs, owner, n_images, q):
    """Max caption cosine per image for one query vector."""
    s = cap_vecs.astype(np.float32) @ q.astype(np.float32)
    best = np.full(n_images, -1.0, dtype=np.float32)
    np.maximum.at(best, owner, s)
    return best


def top(scores, ids, meta, extra=None):
    idx = np.argsort(-scores)[: TOPK + 1]
    res = []
    for r, i in enumerate(idx[:TOPK]):
        item = {"rank": r + 1, "image_id": str(ids[i]), "score": float(scores[i]), **meta[ids[i]]}
        if extra:
            item["caption"] = extra(i)
        res.append(item)
    res[0]["margin"] = float(scores[idx[0]] - scores[idx[1]])
    return res


def clip_like(kind, image_paths, cache_name):
    """Image embeddings for a CLIP-family model; returns (encode_text fn, image matrix)."""
    from transformers import AutoModel, AutoProcessor, ChineseCLIPModel, ChineseCLIPProcessor
    if kind == "cnclip":
        p = MODELS / "AI-ModelScope/chinese-clip-vit-large-patch14"
        model = ChineseCLIPModel.from_pretrained(p, torch_dtype=torch.float16).to(DEV).eval()
        proc = ChineseCLIPProcessor.from_pretrained(p)
        text_kw = {"padding": True, "truncation": True, "max_length": 52}
    else:
        p = MODELS / "google/siglip2-base-patch16-256"
        model = AutoModel.from_pretrained(p, torch_dtype=torch.float16).to(DEV).eval()
        proc = AutoProcessor.from_pretrained(p)
        text_kw = {"padding": "max_length", "truncation": True, "max_length": 64}

    path = CACHE / f"{cache_name}.npy"
    if path.exists():
        img = np.load(path)
    else:
        chunks = []
        with torch.no_grad():
            for b in range(0, len(image_paths), 64):
                ims = [Image.open(x).convert("RGB") for x in image_paths[b:b + 64]]
                px = proc(images=ims, return_tensors="pt")["pixel_values"].to(DEV, torch.float16)
                v = model.get_image_features(pixel_values=px)
                chunks.append(torch.nn.functional.normalize(v.float(), dim=-1).cpu().numpy())
        img = np.concatenate(chunks).astype(np.float16)
        CACHE.mkdir(exist_ok=True)
        np.save(path, img)

    def encode(texts):
        with torch.no_grad():
            t = proc(text=texts, return_tensors="pt", **text_kw).to(DEV)
            t = {k: t[k] for k in t if k in ("input_ids", "attention_mask", "token_type_ids")}
            if kind == "cnclip":
                # get_text_features in transformers 4.57 reads a pooler this checkpoint
                # doesn't have; Chinese-CLIP projects the [CLS] state instead.
                cls = model.text_model(**t).last_hidden_state[:, 0, :]
                v = model.text_projection(cls)
            else:
                v = model.get_text_features(**t)
            return torch.nn.functional.normalize(v.float(), dim=-1).cpu().numpy()

    return encode, img, model


def main():
    sents = load_sentences()
    zh = [s["zh"] for s in sents]
    en = [s["en"] for s in sents]
    results = {s["id"]: {"zh": s["zh"], "en": s["en"], "topic": s["topic"], "methods": {}} for s in sents}

    def put(method, ranked):
        for s, r in zip(sents, ranked):
            results[s["id"]]["methods"][method] = r

    # Caption route
    model = bge()
    q_zh = model.encode(zh, normalize_embeddings=True)
    q_en = model.encode(en, normalize_embeddings=True)

    ids, caps, owner, meta = coco_pool(["train2017", "val2017"])
    cv = embed_texts(model, caps, "bge_coco_trainval2017")
    by_img = {}
    for k, o in enumerate(owner):
        by_img.setdefault(o, []).append(k)
    for name, Q in (("cap_coco_en", q_en), ("cap_coco_zh", q_zh)):
        ranked = []
        for q in Q:
            sc = image_scores(cv, owner, len(ids), q)
            ranked.append(top(sc, ids, meta, extra=lambda i, q=q: caps[max(
                by_img[i], key=lambda k: float(cv[k].astype(np.float32) @ q))]))
        put(name, ranked)

    # Same model, COCO val only, to compare with the image route on one pool
    vids, vcaps, vowner, vmeta = coco_pool(["val2017"])
    vcv = embed_texts(model, vcaps, "bge_coco_val2017")
    vby = {}
    for k, o in enumerate(vowner):
        vby.setdefault(o, []).append(k)
    put("cap_val_en", [top(image_scores(vcv, vowner, len(vids), q), vids, vmeta,
                           extra=lambda i, q=q: vcaps[max(vby[i], key=lambda k: float(vcv[k].astype(np.float32) @ q))])
                       for q in q_en])

    oids, ocaps, oowner, ometa = oi_pool()
    ov = embed_texts(model, ocaps, "bge_oi_ln")
    oby = {}
    for k, o in enumerate(oowner):
        oby.setdefault(o, []).append(k)
    put("cap_oi_en", [top(image_scores(ov, oowner, len(oids), q), oids, ometa,
                          extra=lambda i, q=q: ocaps[max(oby[i], key=lambda k: float(ov[k].astype(np.float32) @ q))][:300])
                      for q in q_en])
    del model, cv, ov
    torch.cuda.empty_cache()

    # Image route on COCO val2017
    paths = [vmeta[i]["file"] for i in vids]
    for name, kind, queries in (("cnclip_val_zh", "cnclip", zh), ("siglip_val_en", "siglip", en)):
        enc, img, m = clip_like(kind, paths, f"{kind}_coco_val2017")
        Q = enc(queries if kind == "cnclip" else [q.lower() for q in queries])
        sc = Q @ img.astype(np.float32).T
        put(name, [top(row, vids, vmeta) for row in sc])
        del m
        torch.cuda.empty_cache()

    OUT.mkdir(exist_ok=True)
    (OUT / "candidates.json").write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf8")
    print("wrote", OUT / "candidates.json")


if __name__ == "__main__":
    main()
