"""Score the methods and the gates from the blind review labels.

Reads out/candidates.json, out/sheets/key.json, out/gate.json and
judgments.tsv (sentence id, slot, label in {fit, partial, miss}), and writes
out/report.md:
  1. top-1 labels per method;
  2. how well each automatic gate separates fit from not-fit images:
     retrieval cosine, top-1 margin, and the VLM's P(yes).

Usage: .venv/Scripts/python -I -X utf8 report.py
"""
import csv
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"
METHODS = ["cap_coco_en", "cap_coco_zh", "cap_oi_en", "cap_val_en", "cnclip_val_zh", "siglip_val_en"]


def main():
    cands = json.loads((OUT / "candidates.json").read_text(encoding="utf8"))
    key = json.loads((OUT / "sheets" / "key.json").read_text(encoding="utf8"))
    gate = json.loads((OUT / "gate.json").read_text(encoding="utf8"))
    with open(HERE / "judgments.tsv", encoding="utf8") as f:
        labels = {(r["id"], int(r["slot"])): r["label"] for r in csv.DictReader(f, delimiter="\t")}

    label_of = {}  # (sentence, image) -> label
    for sid, slots in key.items():
        for e in slots:
            label_of[(sid, e["image_id"])] = labels[(sid, e["slot"])]

    lines = ["# Image retrieval spike: results", "", "## Top-1 fit by method (30 sentences)", "",
             "| Method | fit | partial | miss |", "|---|---|---|---|"]
    rows = []  # (method, sid, label, score, margin, p_yes)
    for m in METHODS:
        counts = {"fit": 0, "partial": 0, "miss": 0}
        for sid, s in cands.items():
            top = s["methods"][m][0]
            lab = label_of[(sid, top["image_id"])]
            counts[lab] += 1
            rows.append((m, sid, lab, top["score"], top["margin"], gate[sid][top["image_id"]]))
        lines.append(f"| {m} | {counts['fit']} | {counts['partial']} | {counts['miss']} |")

    lines += ["", "## Per sentence", "", "| id | en | " + " | ".join(METHODS) + " |",
              "|---|---|" + "---|" * len(METHODS)]
    for sid, s in cands.items():
        cells = []
        for m in METHODS:
            top = s["methods"][m][0]
            cells.append(f"{label_of[(sid, top['image_id'])]} ({gate[sid][top['image_id']]:.2f})")
        lines.append(f"| {sid} | {s['en']} | " + " | ".join(cells) + " |")
    lines += ["", "Cells: label (VLM P(yes))."]

    def sweep(name, values):
        """values: list of (score, is_fit). Report precision/recall at each distinct cut."""
        out = [f"", f"### {name}", "", "| keep if ≥ | kept | fit kept | precision | recall |", "|---|---|---|---|---|"]
        n_fit = sum(f for _, f in values)
        cuts = sorted({round(v, 2) for v, _ in values})
        for c in cuts[:: max(1, len(cuts) // 12)]:
            kept = [(v, f) for v, f in values if v >= c]
            tp = sum(f for _, f in kept)
            prec = tp / len(kept) if kept else 0
            out.append(f"| {c:.2f} | {len(kept)} | {tp} | {prec:.0%} | {tp / n_fit if n_fit else 0:.0%} |")
        return out

    lines += ["", "## Gates", "", "All top-1 images from all methods (one row per method and sentence).",
              "Positive = labeled `fit`; `partial` counts as not fit."]
    pairs = {}
    for m, sid, lab, sc, mg, py in rows:
        pairs[(sid, cands[sid]["methods"][m][0]["image_id"])] = (lab == "fit", py)
    lines += sweep("VLM P(yes), distinct (sentence, image) pairs", [(py, f) for f, py in pairs.values()])
    for m in ("cap_coco_en", "cap_oi_en", "siglip_val_en"):
        lines += sweep(f"{m}: retrieval cosine", [(sc, lab == "fit") for mm, _, lab, sc, _, _ in rows if mm == m])
        lines += sweep(f"{m}: top-1 margin", [(mg, lab == "fit") for mm, _, lab, _, mg, _ in rows if mm == m])

    (OUT / "report.md").write_text("\n".join(lines) + "\n", encoding="utf8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
