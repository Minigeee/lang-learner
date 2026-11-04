# 09 · Image datasets for vocab cards

Which captioned image dataset should supply the photo on the back of a vocab card, and how do we pick and check that photo automatically? About 1,400 cards each have one Chinese example sentence in beginner vocabulary, with its English translation. The photo should put that sentence in context. Selection must be fully automatic (no manual curation). Lesson figures are a separate decision (the LLM-drawn parts library) and are out of scope.

> **Checked on 2026-11-03** against each dataset's own page, license file or paper, listed in [Sources](#sources). `(verified)` means read on a primary source that day. `(reported)` means secondhand, or a primary source we couldn't reach. **Hugging Face was unreachable from this machine all day** (TLS resets, from both curl and the web fetcher), so nothing that lives only on a Hugging Face dataset card could be checked; those claims are marked. Nothing here is legal advice; read it alongside doc 05 §5 (risk tiers).
>
> **The feasibility test was stopped before it produced results** (§6). No sentence was retrieved or judged, so this doc has **no measured fit rates and no gate thresholds**. The recommendation rests on licensing, hosting and caption style, not on measured quality.

## TL;DR

- **Recommended primary: Open Images V7 with Localized Narratives captions** [12][13][14][15].
  - Every image is "listed as having a CC BY 2.0 license" (verified). Each image's metadata row carries the author, the Flickr landing URL and the license URL; all 167,056 val/test rows we checked had all three (verified, counted).
  - The images are hosted copies on the CVDF S3 bucket, downloadable one at a time with no sign-in (verified). So we copy only the photos we pick, and Flickr link rot doesn't matter.
  - 671,469 images have human-spoken scene narratives (CC BY 4.0). The captions alone are 180 MB of text (verified), so the whole search index builds without downloading a single image.
- **Fallback: COCO 2017** [6][7]. It has the best caption style for this job: five short, literal, one-sentence English captions per image, over 123,287 images.
  - The images are hosted copies too (verified).
  - **But 69% of its images are under NonCommercial licenses and 32% under NoDerivs** (verified, counted from the annotation file). Its annotations also carry **no author names**, which CC BY attribution needs.
  - Use it only while the app stays non-commercial (synthesis open decision 12), and look up the authors before showing a photo.
- **Unsplash Lite is attractive but not a clean fit.**
  - Its terms license you to "download and store" the photos and use them to train ML models for internal business purposes. Showing them in an app isn't among the licensed uses.
  - Its README says "To use the Unsplash library in a product, see the Unsplash API." That API requires a developer account and hotlinked image URLs, so no copies in our bucket (verified [1][2][5]).
  - Downloading the Lite dataset counts as accepting its terms [2], so it was not downloaded here. Whether to use it is the user's call.
- **Web-scale sets are out.** CC3M/CC12M, LAION/Re-LAION, DataComp and Wukong all distribute **URLs** to images the publishers don't own, not the images (verified, except Wukong: reported). They suffer link rot and carry NSFW risk. Wukong and Re-LAION are also research or non-commercial only, and Re-LAION is gated (verified [18][19][20][21][22]).
- **Chinese-captioned sets are small, unclear or research-only** (COCO-CN 20k, Flickr30k-CN, AI Challenger, Crossmodal-3600's 7,174 Chinese captions). They aren't needed anyway: every card has an English translation, and multilingual embedders accept Chinese queries.
- **Approach: retrieve on captions, rerank on pixels, then gate with a vision-language model.**
  - BGE-M3 (MIT, 100+ languages) embeds the captions; this is cheap and needs only text.
  - A CLIP-family model (SigLIP 2, or Chinese-CLIP for Chinese queries) reranks only the top ~20 images per sentence. Embedding a whole pool's pixels needs every image downloaded: Open Images is 561 GB.
  - A small VLM (Qwen3-VL-2B, Apache 2.0) gives a yes/no fit verdict with a probability to threshold.
  - None of these stages has been measured yet.
- **When nothing passes the gate, the card shows no image.** The card is complete without one. Never fall back to "the best of the bad matches".

## Findings

### 1. What the photo has to do

- **The sentences are scene-like:**
  - everyday actions ("My mom is cooking in the kitchen");
  - places (train station, supermarket);
  - weather;
  - feelings;
  - some abstractions (clock times, prices, "please open the door").

  A dataset of isolated objects (product shots, ImageNet-style) fits poorly. Captions should describe the **whole scene, including what people are doing**.
- **Some sentences have no good photo.** "It's seven o'clock in the morning" or "This is too expensive" can't be photographed reliably, so the pipeline must be able to say "no image".
- **Storage:** the app serves media from a private bucket (doc 05; synthesis Stack row). So the license must allow **copying** the image, not just linking to it. Hotlink-only terms (Unsplash API) and URL-only datasets (link rot) both fail this.
- **Attribution:** doc 05 already requires a license record per item and a Credits page. CC BY needs the creator's name where one is supplied, so a dataset that ships author names saves a lookup step.
- **Size:** 1,400 photos, resized to card size, come to roughly 150–300 MB at 100–200 KB each (our estimate). Supabase Storage Free is 1 GB in total and shared with audio clips (doc 05 [1]), so resize before upload.

### 2. Candidates

#### 2.1 Open Images V7 + Localized Narratives (recommended primary)

- **Images:**
  - 9,178,275 in total (train 9,011,219, validation 41,620, test 125,436) (verified [12]).
  - License: "The images are listed as having a CC BY 2.0 license", with the caveat that Google makes "no representations or warranties regarding the license status of each image and you should verify the license for each image yourself" (verified [12]).
- **Per-image metadata:**
  - The image-information CSV has `OriginalURL`, `OriginalLandingURL`, `License`, `AuthorProfileURL`, `Author` and `Title` (verified [13]).
  - In the validation and test CSVs, all 41,620 + 125,436 rows have `License` = CC BY 2.0 and a non-empty `Author` (verified, counted 2026-11-03).
  - Train-split rows live in `image_ids_and_rotation.csv`, which is 3.3 GB (verified, HTTP size).
- **Hosting:**
  - CVDF hosts copies rescaled to at most 1,024 px on the long side, 561 GB in total, in the `s3://open-images-dataset` bucket with `--no-sign-request` (verified [14]).
  - A single image is a plain HTTPS GET (`https://open-images-dataset.s3.amazonaws.com/<split>/<id>.jpg`, tested: HTTP 200), so a subset is trivial.
  - No sign-up, form or terms acceptance was required anywhere on the download pages (verified [13][14]).
- **Captions: Localized Narratives** [15]:
  - 675,155 narratives over 671,469 Open Images images (verified [12]).
  - License: "CC BY 4.0" (verified [15]).
  - Captions-only files: train 138.5 MB, validation 10.1 MB, test 31.1 MB (verified, HTTP sizes).
  - Style: transcribed speech describing the whole scene, for example "In this image I can see a man in red wearing orange cap, making food on a stove…" (verified, file contents). It is literal and covers actions, but long and wordy.
- **Annotations:** CC BY 4.0, Google LLC (verified [12]).
- **Fit:** the images are Flickr photos, so everyday scenes are common, and image-level labels cover ~20k classes (reported, not checked). We found no statement on Chinese or Asian coverage. Expect a Western skew, as with any Flickr sample (reported, general knowledge, not measured).
- **Hazards:**
  - People and faces are common, and the pages checked show no face blurring.
  - We found no NSFW-filter statement on the pages checked.
  - Text and watermarks in photos are possible.
  - The gate must handle all three (§4).
- **Ready-made assets:** none of our kind. We built a BGE-M3 index of all 675,155 narratives (§6): 1.38 GB as fp16, about 20 min on an RTX 2070.

**Why primary:** it is the largest pool that combines four things: a license that allows copying and display (commercial too), attribution data per image, hosted copies, and scene-level human captions.

#### 2.2 COCO 2017 (recommended fallback)

- **Size:**
  - 118,287 train + 5,000 val images.
  - 591,753 + 25,014 English captions, five per image (verified, counted from the annotation files [7]).
  - Train images 19.3 GB, val 816 MB, annotations 253 MB (verified, HTTP sizes).
  - Every image is also fetchable alone from `images.cocodataset.org` (verified via its `coco_url` field).
- **Terms** [6] (verified, exact wording):
  - "The annotations in this dataset along with this website belong to the COCO Consortium and are licensed under a Creative Commons Attribution 4.0 License."
  - "The COCO Consortium does not own the copyright of the images. Use of the images must abide by the Flickr Terms of Use. The users of the images accept full responsibility for the use of the dataset…"
- **Per-image licenses** (verified, counted over all 123,287 images; all CC 2.0):

  | License | Images | Share |
  |---|---|---|
  | BY-NC-SA | 34,309 | 27.8% |
  | BY-NC-ND | 33,598 | 27.3% |
  | BY | 20,327 | 16.5% |
  | BY-NC | 17,027 | 13.8% |
  | BY-SA | 11,318 | 9.2% |
  | BY-ND | 6,238 | 5.1% |
  | No known copyright restrictions | 470 | 0.4% |

  - NonCommercial in total: 84,934 (68.9%).
  - NoDerivs in total: 39,836 (32.3%).
  - Licenses allowing commercial use and adaptation (BY, BY-SA, no known restrictions): 32,115 (26.0%).
- **Attribution gap:** the annotation file has `flickr_url` but **no author name** (verified). CC BY attribution would need the author from each Flickr page. Flickr's API needs an API key, which we did not check.
- **Caption style:** short, literal, crowd-written scene sentences. This is the best match in style to our example sentences.
- **Fit:** COCO's 80 object categories cover common objects in context, and many images show everyday indoor and street scenes (reported, general knowledge). The skew is Western, from Flickr.
- **Hazards:** people and faces; no NSFW statement on the terms page.
- **Ready-made assets:** COCO is a standard retrieval benchmark, so most CLIP-family models report results on it (reported).

#### 2.3 COCO-CN, Flickr30k, Flickr30k-CN, Flickr8k-CN

- **COCO-CN** [10]:
  - 20,341 COCO images with 22,218 manually written Chinese sentences, plus 5,000 manual translations (test split only) and machine translations (verified).
  - No data license is stated; the repository's MIT license covers the code (verified).
  - Access conflicts between sources. The GitHub page says the data is "freely available at HuggingFace" (verified). The Chinese-CLIP README says to email them "when you have finished applying for permission from the original author" (verified [11]). The Hugging Face copy couldn't be reached, so we couldn't confirm whether it is gated.
  - The images are COCO's, so the license mix in 2.2 applies.
- **Flickr30k** [8]: access is by request form, for "non-commercial research and/or educational purposes" (verified). **Gated, so skipped.**
- **Flickr30k-CN and Flickr8k-CN** [9]:
  - Hosted on Google Drive (236 MB and 59 MB); no license stated (verified).
  - Flickr30k-CN's train and val captions are **machine-translated**; only the test captions are human-translated (verified).
  - Flickr8k-CN has human-written Chinese captions (verified).
  - The images are Flickr30k's, gated as above.

#### 2.4 Crossmodal-3600 (XM3600)

- 3,600 images and human captions in 36 languages; captions CC BY 4.0 (verified [16]).
- **Chinese is included:** 7,174 Chinese captions, and 100 images were chosen for the Chinese locale (verified, counted from `captions.jsonl`).
- The images download from the Open Images S3 bucket (302 MB), with an attributions CSV. The page doesn't state an image license (verified).
- Far too small to cover 1,400 sentences. It is useful only as a Chinese-captioned test set.

#### 2.5 Visual Genome

- 108,077 images and 5.4 million region descriptions (verified [17]).
- The site footer links CC BY 4.0, but there is no license text beyond the link (verified).
- The images come from the intersection of YFCC100M and COCO (reported, paper via search), so their licenses are the Flickr ones.
- Images are 9.2 + 5.47 GB, and the region descriptions are 712 MB zipped (verified).
- **Caption style is wrong for us:** short region phrases, not whole-scene sentences.
- `visualgenome.org` now serves an unrelated gambling site (observed 2026-11-03); the dataset pages live at `homes.cs.washington.edu/~ranjay/visualgenome/`.

#### 2.6 Unsplash Lite and Full

- **Size and fields:**
  - Lite: ~25,000 photos, ~700 MB compressed / ~1 GB raw (verified [1]).
  - Full: 7.4M+ photos, ~20 GB compressed, "available for non-commercial usage", by request at unsplash.com/data (verified [1]).
  - Both ship TSVs. `photos.tsv` has `photo_description` ("written by the photographer"), `ai_description` ("generated by a 3rd party AI"), location (including country and city), and **`photo_image_url`: a URL, not the image** (verified [3]).
- **Terms** [2] (verified, exact wording):
  - Acceptance: "BY CLICKING 'I AGREE' OR DOWNLOADING OR OTHERWISE USING ANY DATASET, YOU … AGREE TO BE BOUND BY THESE TERMS." Downloading Lite is accepting the terms, so **we did not download it.**
  - Lite grant (§2.A): a license "to download and store any photos, images, or other data contained in the Lite Dataset … and internally use the Commercial Licensed Data to train machine learning models or algorithms for your internal business purposes."
  - Full grant (§2.B): the same, but "for non-commercial usage only".
  - Restrictions (§3): you must not "disclose, deliver, disseminate, or publish any portion of the Licensed Data in any manner" or "redistribute" it without written permission.
  - The README adds: "The Unsplash Dataset is made available for research purposes … To use the Unsplash library in a product, see the Unsplash API" (verified [1]).
- **The Unsplash License** (for photos taken from unsplash.com) grants "an irrevocable, nonexclusive, worldwide copyright license to download, copy, modify, distribute…" and forbids "Compiling images from Unsplash to replicate a similar or competing service" (verified [4]).
- **The API guidelines** require hotlinking ("All API uses must use the hotlinked image URLs returned by the API"), a download-tracking call, and attribution to the photographer and Unsplash (verified [5]). An API key needs a developer account, which counts as a sign-up.
- **Reading:**
  - The Lite grant covers storing photos and training models, not showing them in an app.
  - Displaying a photo in a single-user private app arguably isn't "publishing", but the README sends product use to the API, and the API forbids self-hosted copies.
  - The Unsplash License on individual photos would allow copying and display, but the dataset is a separate agreement.
  - This is unclear enough that it's the user's decision, not ours (Open questions).
- **Fit (reported, not checked):** high-quality, often staged stock photography; good everyday coverage; location fields could filter for China. `ai_description` gives literal captions.

#### 2.7 Pexels, Pixabay, Openverse (stock and aggregator APIs)

- **Pexels:**
  - The API key needs a Pexels account (verified [27]), so it is **gated**.
  - Each photo has an `alt` description (verified).
  - Terms: "You may not copy or replicate core functionality of Pexels"; show a prominent link to Pexels and credit photographers (verified).
- **Pixabay:**
  - The API key needs an account (verified [28]), so it is **gated**.
  - "Permanent hotlinking of images … is not allowed"; download images to your own server; "Systematic mass downloads are not allowed"; results carry tags only, no description (verified).
- **Openverse:**
  - Anonymous use is allowed and rate-limited: "Anonymous requests should be sufficient for most users" (verified [29]). A test query returned CC-licensed Flickr photos, each with title, tags, license and creator (verified 2026-11-03).
  - Its Terms of Service "disallow scraping under all circumstances", and pagination depth is limited.
  - Openverse "does not verify its licensing status" (verified).
  - Search is keyword search over titles and tags, not captions.
  - Usable as a per-card **candidate generator** (one query per card) for a reranker and gate, but not as a bulk pool.

#### 2.8 Wikimedia Commons, WIT, PD12M, DOCCI

- **Wikimedia Commons** [26]:
  - "Wikimedia Commons only accepts free content", and "Commercial use of the work must be allowed". Non-commercial-only and no-derivatives content isn't accepted (verified). Every file is hosted and has a license.
  - Anonymous search through the MediaWiki API works (tested). For "family eating dinner" the top hits were mostly historical archive scans (1839 painting, 1940 FSA photos). For "students classroom China" and "bus stop Beijing" the top hits were contemporary Chinese scenes (observed 2026-11-03).
  - Descriptions and multilingual "captions" vary in quality and coverage (reported).
  - **Best source for Chinese settings**, but keyword search plus archive skew means it needs the reranker and gate even more.
- **WIT (Wikipedia-based Image Text)** [25]:
  - 37.6M examples, 11.5M unique images, 108 languages; the data is CC BY-SA 3.0 (verified).
  - The captions are encyclopedic (entity-rich reference text), a poor fit for everyday sentences.
- **PD12M** [24]:
  - 12.4M images labeled Public Domain Mark or CC0, with synthetic captions from Florence-2.
  - The dataset is under CDLA-Permissive-2.0, the authors host copies, and NSFW is filtered (verified, paper).
  - Its sources are galleries, libraries, archives and museums, Wikimedia Commons and iNaturalist. The paper itself notes that public-domain content "over-represents Western geographic regions and cultures" and "older content" (verified).
  - Good licensing, poor fit for contemporary everyday life. The Hugging Face card couldn't be reached.
- **DOCCI** [30]:
  - 15k images taken by one researcher; images and descriptions both CC BY 4.0 (verified); 7.1 GB.
  - Very long English descriptions (136 words on average).
  - The photos were chosen to test spatial relations, counting and text rendering, not daily life (verified).

#### 2.9 Web-scale URL sets (out)

- **Conceptual Captions 3M / 12M** [18][19]:
  - The LICENSE says "The dataset may be freely used for any purpose, although acknowledgement of Google LLC … would be appreciated" (verified, both repos).
  - That covers the URL–caption pairs, not the images. The CC12M FAQ says "We do not own any of the images in the dataset and hence cannot legally provide them to you", and URLs die when owners delete images (verified).
  - CC3M captions are cleaned, "hypernymed" alt text (verified, title): for example, names are replaced by generic words.
  - CC12M is a 2.5 GB TSV (verified).
- **LAION / Re-LAION-5B** [20]:
  - Gated on Hugging Face: requesters submit affiliation information and consent to terms (verified).
  - Licensed Apache 2.0, "links and metadata" only, "released for research purposes".
  - LAION writes: "We strongly advise AGAINST using the datasets in industrial settings" (verified).
  - **Gated, so skipped.**
- **DataComp CommonPool** [21]:
  - "An index of image url-text pairs under a CC-BY-4.0 license", with NSFW filtering. The download tooling blurs detected faces (verified, paper).
  - URLs only; the images belong to third parties.
- **Wukong** [22]:
  - 100M Chinese pairs.
  - The terms say "By using or downloading the Datasets, you are agreeing", grant CC BY-NC-SA 4.0 "with the additional terms", and say the dataset "is used only for non-commercial purposes such as academic research, teaching, or scientific publications"; "We prohibits You from distributing this dataset or modified versions" (verified, exact wording including its grammar).
  - Distributed as CSV shards (verified); image URLs, not images (reported).
- **AI Challenger image Chinese captioning** [23]:
  - 300,000 images with 5 Chinese captions each. "The raw images are crawled from the Internet by querying label names in search engine" (verified, paper).
  - No license found anywhere. `challenger.ai` didn't respond on 2026-11-03, and older repos say registration was needed (reported). **Out.**

### 3. Comparison

| Dataset | Images | Captions | Image license | Caption license | Hosting | Access | Everyday-scene fit | Verdict |
|---|---|---|---|---|---|---|---|---|
| **Open Images V7 + Localized Narratives** | 671k with narratives (9.2M total) | en, long spoken scene narratives | Listed CC BY 2.0, author per image (verified) | CC BY 4.0 (verified) | CVDF S3 copies, per-image GET | Open | Good (untested); Western skew | **Primary** |
| **COCO 2017** | 123k | en, 5 short literal sentences | Mixed Flickr CC: 69% NC, 32% ND; no author names (verified) | CC BY 4.0 (verified) | Hosted, per-image GET | Open | Good (untested); Western skew | **Fallback** (non-commercial only) |
| Wikimedia Commons | Millions | Mixed descriptions, multilingual | Free licenses only (verified) | Per file | Hosted | Open API | Keyword search; strong on China scenes, archive skew | Secondary source for China scenes |
| Unsplash Lite | 25k | en, photographer + AI descriptions | Dataset terms: store + internal ML training (verified) | Same | URLs only | Downloading = accepting terms | Likely good (not checked) | User's call |
| Unsplash Full | 7.4M | same | Non-commercial ML training (verified) | Same | URLs only | Request form | — | Out (gated) |
| COCO-CN | 20k | zh, human | COCO's mix | Not stated | COCO images | Unclear (verified conflict) | As COCO | Test set at most |
| Flickr30k / -CN | 31.8k | en / zh (train machine-translated) | Flickr ToS; research/education only (verified) | Not stated (CN) | Request form | Gated | — | Out |
| Crossmodal-3600 | 3,600 | 36 languages incl. 7,174 zh | Not stated (attributions CSV) | CC BY 4.0 (verified) | S3 | Open | Too small | Test set |
| Visual Genome | 108k | Region phrases | Flickr (via COCO/YFCC) | CC BY 4.0 link (verified) | Zips | Open | Wrong caption style | Out |
| PD12M | 12.4M | en, Florence-2 synthetic | PD/CC0 (verified) | CDLA-Permissive-2.0 (verified) | Hosted copies | HF (unreachable) | Museum, archive, nature skew | Out (fit) |
| DOCCI | 15k | en, very long | CC BY 4.0 (verified) | CC BY 4.0 | Hosted | Open | Not everyday | Out (fit) |
| WIT | 11.5M | 108 langs, encyclopedic | Per Wikimedia file | CC BY-SA 3.0 (verified) | Wikimedia | Open | Wrong caption style | Out |
| Pexels / Pixabay | Large | Alt text / tags | Own licenses | — | API | Account needed (verified) | Good | Out (gated) |
| Openverse | Aggregator | Titles, tags | Per item, unverified by Openverse | — | Source hosts | Anonymous, no scraping | Mixed | Per-card candidate source at most |
| CC3M / CC12M | 3.3M / 12M | Alt text | Third-party copyright | "Freely used for any purpose" (verified) | URLs only | Open | Mixed | Out |
| Re-LAION-5B | 5B | Alt text | Third-party | Apache 2.0, research (verified) | URLs only | Gated | Mixed, NSFW risk | Out |
| DataComp | 12.8B | Alt text | Third-party | CC BY 4.0 index (verified) | URLs only | Open | Mixed | Out |
| Wukong | 100M | zh alt text | Third-party | CC BY-NC-SA 4.0 + research terms (verified) | URLs | Terms on download | Chinese web | Out |
| AI Challenger | 300k | zh, 5 per image | Search-engine crawl, none stated | None found | Site down | Registration (reported) | Chinese daily life | Out |

### 4. Matching and gating

#### 4.1 Two retrieval routes

- **Caption route (text to text):**
  - Embed every caption once, embed the sentence, and take the nearest captions.
  - Needs only the caption text, which matters most for Open Images: 180 MB of text versus 561 GB of images.
  - The weak points are the captions themselves. A caption can omit what the sentence is about, and Localized Narratives are long and wordy. We truncated them to 128 tokens.
- **Image route (text to image):**
  - Embed every image with a CLIP-family model and query with the sentence.
  - Sees the actual pixels, but needs every image downloaded and embedded: fine for COCO's 19 GB, impractical for Open Images.
- **Recommended hybrid:**
  1. The caption route returns the top ~20 images.
  2. Only those images are downloaded and reranked by an image–text model.
  3. The VLM gate checks the leader.

  That costs about 1,400 × 20 = 28k downloaded images (several GB, transient) rather than the whole pool. This is a design proposal; it is untested.

#### 4.2 Models

| Role | Model | Chinese input | Size | License | Notes |
|---|---|---|---|---|---|
| Caption embedder | **BGE-M3** [31] | Yes (100+ languages) | 2.27 GB fp32 checkpoint (~568M params); ~3.9 GB GPU memory in use while encoding in fp16 (nvidia-smi, whole GPU) | MIT (verified) | Used in the spike. Cross-lingual: a zh query against en captions. That this works well here is **untested**. |
| Caption embedder (alt) | Qwen3-Embedding-0.6B [33] | Yes (100+ languages) | 0.6B | Apache 2.0 (verified) | Not tested |
| Image–text (zh) | **Chinese-CLIP** [11] | Chinese only | ViT-B/16 188M, ViT-L/14 406M, ViT-H/14 958M (verified) | Not confirmed (the repo's LICENSE URL returned 404) | ViT-L/14 embedded 5,000 COCO images in the spike; text side hit a transformers 4.57 bug (worked around in code, not rerun) |
| Image–text (multilingual) | **SigLIP 2** base-patch16-256 [32] | Yes (multilingual per paper title) | 1.5 GB fp32 checkpoint (~375M params) | Apache 2.0 (verified card) | Downloaded, not run |
| Fit gate (VLM) | **Qwen3-VL-2B-Instruct** [34] | Yes | 4.26 GB bf16 weights | Apache 2.0 (verified card) | Fits an 8 GB laptop GPU in fp16 (expected, not confirmed). Download stopped partway, so not run. |

- **Query language:** query in English when matching English captions. The card's own translation is the natural query, and the zh-versus-en question was one of the spike's open measurements.
- **Chinese-CLIP** is the strongest option only if image-route queries are in Chinese.

#### 4.3 The automatic gate

Raw cosine scores aren't calibrated across queries: a "good" score for "cooking in the kitchen" differs from one for "it's seven o'clock". So a single similarity threshold alone is weak (reported, a widely observed property of embedding scores; we didn't measure it here). Proposed gate, all automatic:

1. **Retrieval floor:** drop candidates below a low cosine floor, set from data.
2. **VLM verdict:** ask a VLM "Does this photo clearly show the situation the sentence describes?" and read P(yes) from the first token's logits. That makes the gate deterministic and thresholdable (implemented in `gate.py`, not run). Take the first reranked candidate that passes.
3. **Hazard checks on the passing image:**
   - The VLM, or a classifier, flags NSFW content, a recognizable public figure or brand, a watermark, or a large area of text.
   - Text inside the photo matters most for a reading-practice app: English signs on a Chinese card confuse, and Chinese signs are unvetted text.
4. **Thresholds are set once, from a labeled sample.** Set them to favor precision: a missing image costs little, a wrong one teaches a wrong association.

Setting the thresholds from that labeled sample is a one-off calibration of an automatic check, not per-card curation, so it stays within the no-manual-curation rule.

#### 4.4 When nothing fits

- **Default: no image.** The card back already has the word, sentence and translation. Record `image: none` with a reason (`no_candidate`, `gate_failed`, `hazard`), so later runs can retry.
- **Retry options, all automatic (COULD):**
  - Have an LLM rewrite the sentence as a short visual description ("Happy birthday! This is your cake." → "a birthday cake with lit candles on a table") and search again.
  - Try a secondary source (Wikimedia Commons, or Openverse per card) through the same rerank and gate.
- **Changing the sentence** to a more picturable one is tempting, but example sentences may be tied to native audio (AISHELL; synthesis Native audio row). So that has to be the sentence pipeline's decision, not the image pipeline's.

### 5. Licensing in this app

- **CC BY 2.0** (Open Images) allows copying, distributing and adapting, commercially too, with attribution. A private bucket plus a Credits page meets this, consistent with doc 05 §5's practical stance.
- **COCO's NC images** stay usable only while the app is non-commercial (synthesis open decision 12).
- **ND images:** resizing for display may be a permitted format change, but we haven't checked CC 2.0's wording. Excluding ND is the simple choice.
- **"Listed as" licenses:** Open Images and Openverse both disclaim license accuracy. Store the source license URL and author per image, as doc 05 already requires, so a bad item can be traced and removed.

### 6. Feasibility test: partial, stopped before results

The spike is in `sandbox/spikes/image-retrieval/`; its README lists exactly what ran. In brief:

- **Test set:** 30 beginner sentences across food, family, weather, transport, shopping, school, daily actions, feelings, animals and one clock time (`sentences.tsv`). One reviewer was to judge them blind from shuffled contact sheets.
- **Finished:**
  - BGE-M3 embeddings of all 616,767 COCO 2017 captions (about 7 min on an RTX 2070, fp16, 1.26 GB index).
  - BGE-M3 embeddings of all 675,155 Open Images narratives (about 20 min, 1.38 GB).
  - Chinese-CLIP ViT-L/14 embeddings of the 5,000 COCO val images.
- **Not finished:** **zero of 30 sentences** were retrieved, reviewed or gated.
  - No Chinese-CLIP or SigLIP 2 queries ran, and the Qwen3-VL gate never ran.
  - Chinese-CLIP's text side hit a bug in transformers 4.57 (`get_text_features` reads a pooler the checkpoint lacks). It is worked around in `retrieve.py` but wasn't rerun.
- **Learned anyway:**
  - The caption route over 1.3M captions builds in under 30 minutes on the laptop GPU. The resulting indexes fit in memory, so the pipeline is a cheap, offline build step.
  - Model weights had to come from ModelScope because Hugging Face was unreachable. The CDN dropped long transfers, so the fetcher needs resume support.

## Implications for the app

- **MUST** keep "no image" a normal card state. Store the reason (`no_candidate`, `gate_failed`, `hazard`) and never fill the slot with the best of the bad matches.
- **MUST** select images automatically: retrieval, rerank and gate run in the content build with no hand-picking. Thresholds come from one labeled calibration sample, not per-card review.
- **MUST** store per image: source dataset, source id, author, license URL and landing URL. Show them on the Credits page (doc 05). For Open Images train-split images, take these from `image_ids_and_rotation.csv`.
- **MUST** copy chosen images into the private bucket, resized for the card. No hotlinking: link rot, and a public third-party URL leaks what the card shows.
- **MUST NOT** use URL-only web-scale sets (CC3M/12M, LAION, DataComp, Wukong), gated sets (Flickr30k, Re-LAION, Unsplash Full), or the Pexels/Pixabay APIs (accounts) as image sources.
- **MUST** gate for hazards on every chosen image: NSFW, recognizable public figures, watermarks, and prominent text.
- **SHOULD** use Open Images V7 with Localized Narratives as the primary pool, and COCO 2017 as the fallback. From COCO, prefer the BY, BY-SA and no-known-restrictions images (32,115), and use NC images only while the app is non-commercial.
- **SHOULD** use the hybrid matcher: BGE-M3 caption retrieval (top ~20), then SigLIP 2 (or Chinese-CLIP) rerank on just those images, then a Qwen3-VL-2B yes/no gate with a P(yes) threshold.
- **SHOULD** finish the spike before building: retrieval for the 30 sentences, the blind review, gate calibration, and a COCO-versus-Open Images comparison. That gives real fit rates and thresholds.
- **SHOULD** query with the card's English translation when matching English captions. Keep the Chinese query as a measured alternative.
- **COULD** add an automatic retry: an LLM-written visual description of the sentence, then search again.
- **COULD** add Wikimedia Commons (free licenses only) as a secondary source for China-specific scenes, through the same rerank and gate.
- **COULD** use Crossmodal-3600's Chinese captions (7,174) as a small test set for the Chinese-query path.

## Open questions

1. **Unsplash Lite:** would the user accept the Unsplash Dataset Terms, whose grant covers storing photos and training models, and whose README sends product use to the API? If yes, a bigger question follows: does a private single-user app fall within "internal" use? We can't settle that without asking Unsplash, and contacting them is the user's call.
2. **Fit quality is unmeasured.** How many of the ~1,400 sentences will get a passing image from Open Images or COCO, and is caption retrieval or image retrieval better here? The stopped spike was meant to answer this.
3. **COCO attribution:** COCO ships no author names. Is fetching each chosen image's Flickr page acceptable, and robust enough to automate? Or should COCO be limited to "no known copyright restrictions" images?
4. **Cultural fit:** Open Images and COCO skew Western (reported, not measured). Does the user want China-specific settings enough to add Wikimedia Commons as a source?
5. **Fallback visual:** when no photo passes, should the card show nothing (recommended), or a parts-library figure? The parts library is the separate lesson-figure decision.
6. **Hugging Face:** it was unreachable on 2026-11-03. Still unchecked: whether COCO-CN, PD12M and the DataComp pools on Hugging Face are gated, and their card licenses.
7. **Open Images "listed as" CC BY 2.0:** Google says to verify each image's license. Is spot-checking the Flickr landing URLs of chosen images needed, or does the per-image metadata suffice for a private app?

## Sources

All checked 2026-11-03 unless marked otherwise.

1. Unsplash Datasets README: https://github.com/unsplash/datasets (Lite/Full sizes, commercial wording, "made available for research purposes", "To use the Unsplash library in a product, see the Unsplash API") (verified)
2. Unsplash Dataset Terms: https://github.com/unsplash/datasets/blob/master/TERMS.md (acceptance by downloading; §2.A/§2.B grants; §3 restrictions) (verified)
3. Unsplash Dataset docs: https://github.com/unsplash/datasets/blob/master/DOCS.md (fields; `photo_image_url` only) (verified)
4. Unsplash License: https://unsplash.com/license (grant; no compiling to replicate a similar or competing service) (verified)
5. Unsplash API guidelines: https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines (hotlinking, download tracking, attribution) (verified)
6. COCO Terms of Use: https://cocodataset.org/#termsofuse, source text at https://github.com/cocodataset/cocodataset.github.io/blob/master/dataset/termsofuse.htm (annotation and image terms) (verified)
7. COCO 2017 downloads: http://images.cocodataset.org/annotations/annotations_trainval2017.zip, `zips/train2017.zip`, `zips/val2017.zip` (sizes by HTTP; per-image license counts, caption counts, absence of author names from `captions_*2017.json`) (verified)
8. Flickr30k: https://shannon.cs.illinois.edu/DenotationGraph/ (request form; non-commercial research/education) (verified)
9. Flickr8k-CN / Flickr30k-CN: https://github.com/li-xirong/cross-lingual-cap (splits, machine vs human captions, no license stated) (verified)
10. COCO-CN: https://github.com/li-xirong/coco-cn (counts; data "freely available at HuggingFace"; MIT on the repo) (verified); the Hugging Face copy was unreachable
11. Chinese-CLIP README: https://github.com/OFA-Sys/Chinese-CLIP/blob/master/README_En.md (model sizes; ModelScope links; COCO-CN permission note) (verified)
12. Open Images V7 facts and figures: https://storage.googleapis.com/openimages/web/factsfigures_v7.html (licenses, image counts, narrative counts) (verified)
13. Open Images V7 download page: https://storage.googleapis.com/openimages/web/download_v7.html (image-information columns, downloader) and the validation/test image CSVs (license and author counts) (verified)
14. CVDF Open Images mirror: https://github.com/cvdfoundation/open-images-dataset (561 GB, ≤1024 px, `--no-sign-request`) (verified)
15. Localized Narratives: https://google.github.io/localized-narratives/ (CC BY 4.0, counts, captions-only files; file sizes by HTTP) (verified)
16. Crossmodal-3600: https://google.github.io/crossmodal-3600/ (CC BY 4.0 captions; downloads; Chinese caption counts from `captions.jsonl`) (verified)
17. Visual Genome: https://homes.cs.washington.edu/~ranjay/visualgenome/ (108,077 images, CC BY 4.0 footer link, file sizes) (verified); image provenance from arXiv 1602.07332 via search (reported)
18. Conceptual Captions 3M: https://github.com/google-research-datasets/conceptual-captions (LICENSE text, URL-only, "Hypernymed, Image Alt-text" title) (verified)
19. Conceptual 12M: https://github.com/google-research-datasets/conceptual-12m (LICENSE text, 2.5 GB TSV, FAQ on image ownership and link rot) (verified)
20. LAION, "Releasing Re-LAION-5B": https://laion.ai/blog/relaion-5b/ (gated access, Apache 2.0, links only, research purposes, advice against industrial use) (verified)
21. DataComp paper: https://arxiv.org/abs/2304.14108 (CC-BY-4.0 URL index, NSFW filtering, face blurring) (verified)
22. Noah-Wukong terms and downloads: https://wukong-dataset.github.io/wukong-dataset/terms_of_use.html and `download.html` (CC BY-NC-SA 4.0 plus terms; non-commercial; no distribution) (verified)
23. AI Challenger paper: https://arxiv.org/abs/1711.06475 (300k images, 5 Chinese captions each, search-engine crawl) (verified); site status and registration (reported)
24. PD12M paper: https://arxiv.org/abs/2410.23144 (PD/CC0, CDLA-Permissive-2.0, Florence-2 captions, sources, bias statement) (verified)
25. WIT: https://github.com/google-research-datasets/wit (size, languages, CC BY-SA 3.0) (verified)
26. Wikimedia Commons: https://commons.wikimedia.org/wiki/Commons:Licensing (free content only; no NC/ND) (verified); search behavior via the MediaWiki API (observed)
27. Pexels API documentation: https://www.pexels.com/api/documentation/ (key, limits, attribution, `alt`, no replicating core functionality) (verified)
28. Pixabay API documentation: https://pixabay.com/api/docs/ (key, no permanent hotlinking, no systematic mass downloads, tags only) (verified)
29. Openverse API schema https://api.openverse.org/v1/schema/ and Terms of Service https://docs.openverse.org/terms_of_service.html (anonymous access, no scraping, no license verification) (verified)
30. DOCCI: https://google.github.io/docci/ (15k images, CC BY 4.0, sizes, purpose) (verified)
31. BGE-M3 model card (ModelScope copy of the BAAI card): https://www.modelscope.cn/models/BAAI/bge-m3 and https://github.com/FlagOpen/FlagEmbedding (MIT, 100+ languages, 1024-d; checkpoint size from file listing) (verified)
32. SigLIP 2 model card (ModelScope mirror): https://www.modelscope.cn/models/google/siglip2-base-patch16-256 (Apache 2.0; cites "SigLIP 2: Multilingual Vision-Language Encoders…", arXiv 2502.14786; checkpoint size from file listing) (verified)
33. Qwen3-Embedding-0.6B model card: https://www.modelscope.cn/models/Qwen/Qwen3-Embedding-0.6B (Apache 2.0, 0.6B, 100+ languages) (verified)
34. Qwen3-VL-2B-Instruct model card: https://www.modelscope.cn/models/Qwen/Qwen3-VL-2B-Instruct (Apache 2.0; weight size from file listing) (verified)
35. Spike: `sandbox/spikes/image-retrieval/` (README, scripts, sentence set; partial run 2026-11-03)
