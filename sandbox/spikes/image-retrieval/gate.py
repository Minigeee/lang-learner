"""VLM fit gate: ask Qwen3-VL-2B-Instruct whether each top-1 image shows its sentence.

For every (sentence, image) pair in out/sheets/key.json, the model sees the
image and the English sentence and is asked for a one-word yes/no answer.
P(yes) is read from the first generated token's logits (yes vs no, any case),
so the result is deterministic and gives a score to threshold, not just a word.
Writes out/gate.json: {sentence_id: {image_id: p_yes}}.

Usage: .venv/Scripts/python -I -X utf8 gate.py
"""
import json
import pathlib

import torch
from PIL import Image
from transformers import AutoModelForImageTextToText, AutoProcessor

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "out"
MODEL = HERE / "models" / "Qwen/Qwen3-VL-2B-Instruct"

PROMPT = (
    'This is the example sentence on a language-learning flashcard: "{en}"\n'
    "Does this photo clearly show the situation the sentence describes, so a learner "
    "would connect the photo with the sentence? Answer with one word: yes or no."
)


def main():
    proc = AutoProcessor.from_pretrained(MODEL, min_pixels=128 * 28 * 28, max_pixels=512 * 28 * 28)
    model = AutoModelForImageTextToText.from_pretrained(MODEL, torch_dtype=torch.float16).to("cuda").eval()
    tok = proc.tokenizer
    yes_ids = sorted({tok.encode(w, add_special_tokens=False)[0] for w in ("yes", "Yes", " yes", " Yes")})
    no_ids = sorted({tok.encode(w, add_special_tokens=False)[0] for w in ("no", "No", " no", " No")})

    cands = json.loads((OUT / "candidates.json").read_text(encoding="utf8"))
    key = json.loads((OUT / "sheets" / "key.json").read_text(encoding="utf8"))
    result = {}
    for sid, slots in key.items():
        result[sid] = {}
        for e in slots:
            msgs = [{"role": "user", "content": [
                {"type": "image"}, {"type": "text", "text": PROMPT.format(en=cands[sid]["en"])}]}]
            text = proc.apply_chat_template(msgs, add_generation_prompt=True, tokenize=False)
            inputs = proc(text=[text], images=[Image.open(e["path"]).convert("RGB")],
                          return_tensors="pt").to("cuda")
            with torch.no_grad():
                logits = model(**inputs).logits[0, -1].float()
            p = torch.softmax(logits[yes_ids + no_ids], dim=0)
            p_yes = float(p[: len(yes_ids)].sum())
            result[sid][e["image_id"]] = round(p_yes, 4)
            print(sid, e["image_id"], f"{p_yes:.3f}", flush=True)
    (OUT / "gate.json").write_text(json.dumps(result, indent=1), encoding="utf8")


if __name__ == "__main__":
    main()
