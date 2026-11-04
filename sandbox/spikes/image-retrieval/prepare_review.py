"""Fetch each method's top-1 image and lay them out for blind review.

For every sentence, the distinct top-1 images across all methods are shuffled
(fixed seed) into numbered slots on one contact sheet, out/sheets/<id>.jpg, so
the reviewer can't tell which method found which image. out/sheets/key.json
maps slots back to image ids and methods; report.py reads it, the reviewer
doesn't. Images go to out/images/ (gitignored).

Usage: .venv/Scripts/python -I -X utf8 prepare_review.py
"""
import json
import pathlib
import random
import shutil
import urllib.request

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"
IMG = OUT / "images"
SHEETS = OUT / "sheets"
THUMB = 384


def local_copy(item) -> pathlib.Path:
    dest = IMG / f"{item['image_id']}.jpg"
    if not dest.exists():
        IMG.mkdir(parents=True, exist_ok=True)
        if item.get("file"):
            shutil.copy(item["file"], dest)
        else:
            req = urllib.request.Request(item["url"], headers={"User-Agent": "lang-learner-spike/0.1"})
            with urllib.request.urlopen(req, timeout=60) as r:
                dest.write_bytes(r.read())
    return dest


def font(size):
    for name in ("msyh.ttc", "simhei.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def main():
    cands = json.loads((OUT / "candidates.json").read_text(encoding="utf8"))
    SHEETS.mkdir(parents=True, exist_ok=True)
    rng = random.Random(20261103)
    key = {}
    for sid, s in cands.items():
        by_image = {}
        for method, ranked in s["methods"].items():
            it = ranked[0]
            by_image.setdefault(it["image_id"], {"item": it, "methods": []})["methods"].append(method)
        slots = list(by_image.values())
        rng.shuffle(slots)
        key[sid] = [{"slot": k + 1, "image_id": v["item"]["image_id"], "methods": v["methods"],
                     "path": str(local_copy(v["item"]))} for k, v in enumerate(slots)]

        cols = 3
        rows = (len(slots) + cols - 1) // cols
        head = 70
        sheet = Image.new("RGB", (cols * THUMB, head + rows * (THUMB + 30)), "white")
        d = ImageDraw.Draw(sheet)
        d.text((8, 6), f"{sid}  {s['zh']}", fill="black", font=font(26))
        d.text((8, 40), s["en"], fill="black", font=font(20))
        for k, entry in enumerate(key[sid]):
            im = Image.open(entry["path"]).convert("RGB")
            im.thumbnail((THUMB - 8, THUMB - 8))
            x, y = (k % cols) * THUMB, head + (k // cols) * (THUMB + 30)
            sheet.paste(im, (x + 4, y + 26))
            d.text((x + 6, y + 2), f"slot {entry['slot']}", fill="red", font=font(20))
        sheet.save(SHEETS / f"{sid}.jpg", quality=85)
    (SHEETS / "key.json").write_text(json.dumps(key, indent=1), encoding="utf8")
    print("sheets in", SHEETS)


if __name__ == "__main__":
    main()
