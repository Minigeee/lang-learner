# Image retrieval (spike, stopped before results)

Can a vocab card's example sentence be matched to a fitting photo automatically? This compares two routes on 30 everyday beginner sentences (`sentences.tsv`, Chinese plus English):

- **Caption route:** embed a dataset's captions with BGE-M3 and query with the sentence. An image scores as its best caption.
- **Image route:** embed the images themselves with a CLIP-family model (Chinese-CLIP ViT-L/14 for Chinese queries, SigLIP 2 for English).

Research write-up: [docs/research/09-image-datasets.md](../../../docs/research/09-image-datasets.md).

## Status (2026-11-03): stopped, no fit results

The run was stopped on request before any sentence was retrieved or judged. What finished:

| Step | State |
|---|---|
| COCO 2017 annotations and val2017 images (1.07 GB), Open Images Localized Narratives captions and val/test metadata (240 MB) | downloaded to `sandbox/data/coco/` and `sandbox/data/openimages/` (gitignored) |
| BGE-M3 embeddings: 616,767 COCO train+val captions, 25,014 val captions, 675,155 Open Images narratives (truncated to 128 tokens) | done, in `cache/` (about 7 min and 20 min on an RTX 2070, fp16) |
| Chinese-CLIP ViT-L/14 image embeddings of the 5,000 val2017 images | done, in `cache/` |
| Chinese-CLIP text queries, SigLIP 2 image embeddings, top-k retrieval for the 30 sentences | not run. The first run hit a transformers 4.57 bug in `ChineseCLIPModel.get_text_features`. `retrieve.py` now works around it, but the rerun was stopped. |
| Contact sheets for blind review (`prepare_review.py`), VLM gate (`gate.py`, Qwen3-VL-2B-Instruct), scoring (`report.py`) | written, not run. The Qwen3-VL weights only partly downloaded (`models/…/model.safetensors.part`). |

## Method, if resumed

1. `python -m venv .venv`, then `.venv/Scripts/python -m pip install torch==2.7.1 --index-url https://download.pytorch.org/whl/cu126` and `.venv/Scripts/python -m pip install "transformers<5" sentence-transformers sentencepiece protobuf pillow numpy`.
2. `.venv/Scripts/python -I fetch_models.py`: weights come from ModelScope, because Hugging Face reset TLS connections from this machine on 2026-11-03. It resumes partial files.
3. `.venv/Scripts/python -I -X utf8 retrieve.py` writes `out/candidates.json` (top 3 per sentence for each of six methods; see the docstring).
4. `prepare_review.py` fetches each method's top-1 image and builds one shuffled contact sheet per sentence, so the reviewer doesn't see which method found which image. Label every slot `fit`, `partial` or `miss` in `judgments.tsv` (`id`, `slot`, `label`).
5. `gate.py` records the VLM's P(yes) for each pair. `report.py` writes `out/report.md`: fit per method, plus precision and recall when gating on cosine, margin or P(yes).

The judging is one reviewer's call on whether a learner would connect the photo with the sentence. Sentence s27 (a clock time) is included on purpose, as a case that should fail the gate.

`models/`, `cache/`, `.venv/`, `out/images/` and the logs are gitignored.
