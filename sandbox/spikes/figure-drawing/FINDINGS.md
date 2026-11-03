# Spike F: Lesson figure drawing without image models

Run on 2026-11-03. Run `npm i`, then `node src/build.mjs`, and open `index.html`. The subagent wrote this report; the orchestrator saved it, because subagents can't write report files in this harness.

## Question
Lesson figures (spatial words, 没/不 contrasts, people doing things, vocabulary nouns) are drawn by an LLM as inline SVG. Today's drawings are crude. What makes LLMs "draw" better with vector or programmatic output only, and which approach fits this project?

Constraints:
- automated pipeline, with a human only spot-checking;
- local runtime;
- open licenses;
- light and dark themes through CSS variables;
- all labels go through `t()`.

## Verdict (TL;DR)
- **Use a scene spec, a parts library and deterministic layout (approach B).**
  - The agent writes objects plus relations (`on`, `in`, `under`, `beside`, `heldBy`) with no coordinates.
  - Code owns the geometry and the draw order.
  - Each object kind is drawn once by an LLM in a render-and-critique loop, then reused everywhere.
  - An automatic checker gates every figure.
- **Use the render-and-critique loop when drawing a new part, not for every figure.**
  - One critique round fixed most problems. A second round gave little more.
- **Emoji are a vocabulary-card backend only, not a scene backend.**
  - Fluent Emoji Flat (MIT) looks good for single nouns in both themes.
  - For scenes it fails: no table emoji, no open box for 里, no "person drinking", no consistent scale, front-facing views.
- **SVG-specialized models are not worth it here.**
  - OmniSVG needs 17–26 GB of GPU memory, more than the RTX 2070's 8 GB.
  - StarVector is image-to-SVG for icons, and its model card says it does not work for illustrations.
  - Chat2SVG's quality stage uses diffusion, which is ruled out.
- **Frontier LLMs are already decent at one-shot SVG.** The real problems are:
  - consistency across figures;
  - dark-mode bugs;
  - spatial ambiguity;
  - no reuse.

  Structure (a spec, parts and a checker) fixes these better than more drawing rounds.

## Research survey
Dates checked as of November 2026. "Claimed" means a paper's own result I did not reproduce.

**Render-and-critique loops**
- **Chat2SVG** (CVPR 2025, arXiv 2411.16602). An LLM writes an SVG template of simple shapes, a vision model checks it, then SDEdit diffusion refines it. The first stage is allowed for us; the diffusion stage is not.
- **IntroSVG** (arXiv 2603.09312, March 2026, CVPR 2026). One vision-language model acts as both generator and critic (generate, review, refine), trained with SFT and DPO. It claims state of the art. It is a trained model, not a prompt technique.
- **Vision-guided iterative refinement for frontend code** (arXiv 2604.05839, ICLR 2026 workshop). Visual critique helps, but each round is expensive. A secondary summary reports that refining without a critic adds only 1–2%: the critic is what helps, not extra rounds.
- **PlotGen** (arXiv 2502.00988, Feb 2025). Multimodal feedback agents improve plot generation by a claimed 4–6% on MatPlotBench.
- **Visual Sketchpad** (NeurIPS 2024). Models that can see their own intermediate drawings reason better (claimed +8.6% on vision tasks). This supports "let the model see the PNG."
- **RLRF** (NeurIPS 2025, arXiv 2505.20793). Rendering feedback used as a reinforcement-learning reward improves SVG generators. It is training-time only and needs supervised fine-tuning first.
- **Simon Willison's "pelican on a bicycle" test** (2024–2026). Frontier models now draw good one-shot SVGs. A Hugging Face OpenEnv write-up calls the canonical prompt saturated: 136 of 139 frontier samples scored perfectly on its structural layer. One-shot drawing is no longer the bottleneck.

**Intermediate representations (scene graph or layout, then a renderer)**
- **SceneCraft** (arXiv 2403.01248, 2024). An LLM builds a scene graph, turns it into constraints, writes Blender code, then a vision model critiques the render. This is the closest analogue to approach B.
- **LayoutGPT** (NeurIPS 2023; not re-verified for this spike) and the LayoutLLM family. LLMs emit layouts or constraints, and solvers or renderers do the geometry.
- **SVGCraft** (2024). LLM bounding boxes, then a raster optimization step.
- **SketchAgent** (CVPR 2025, arXiv 2411.17673). Training-free stroke-by-stroke drawing in a string-based sketching language.
  - From my recollection of the paper body (not re-checked in this spike): it uses a labeled grid canvas and Claude 3.5 Sonnet as the backbone.
  - The repo needs an Anthropic key.
  - Takeaway: a constrained drawing vocabulary beats free-form coordinates.

**Benchmarks**
- **SVGenius** (arXiv 2506.03139, June 2025): 22 models tested.
  - Proprietary models are far ahead of open ones.
  - All models degrade as complexity rises.
  - Reasoning-focused training beats scaling.
- **SGP-GenBench** (arXiv 2509.05208, Sept 2025). Includes spatial-relation and numeracy prompts. Claude 3.7 and Gemini 2.5 Pro led, and performance tracked general coding ability.
- **VGBench** (2024). SVG, TikZ and Graphviz generation, scored with CLIP and FID.

**SVG-specialized models (local use)**
- **StarVector** (1B and 8B, Apache 2.0). Image-to-SVG and text-to-SVG for icons, logos and diagrams. Its model card says it does not work for natural images or illustrations.
- **OmniSVG** (NeurIPS 2025; code Apache 2.0, weights license not stated on the README). The README lists 17 GB for the 3B and 4B models and 26 GB for the 8B. That is too much for an 8 GB RTX 2070 without quantization, which I did not test. Its MMSVG dataset is CC BY-NC-SA.
- **LLM4SVG** (CVPR 2025). Fine-tuned LLMs with SVG tokens. Weight availability is unclear.
- None of these solves "compose a scene that teaches 上 vs 里." All are trained on icon-like data.

**Asset libraries (licenses checked through Iconify package metadata)**

| Library | License | Notes |
|---|---|---|
| Fluent Emoji Flat / High Contrast | MIT | Microsoft. 3,174 and 1,594 glyphs. |
| Twemoji (jdecked fork) | CC BY 4.0 | Graphics need attribution; code is MIT. 4,169 glyphs. |
| Noto Emoji | Apache 2.0 | 3,819 glyphs. |
| OpenMoji | **CC BY-SA 4.0 — flag** | ShareAlike. |
| Tabler | MIT | Already used by the app. |
| Streamline emojis | CC BY 4.0 | |
| Open Peeps | CC0 (per its site) | Hand-drawn people with mix-and-match poses. Not tested; a candidate for people. |
| Humaaans | **License inconsistent — avoid** | |
| unDraw | **Custom license — exclude** | Forbids redistribution in packs and any AI or ML use. |

- Naive HSK 2025 L1–3 noun coverage (`src/coverage.mjs`, 460 nouns, matching English glosses to icon names):

  | Set | Coverage |
  |---|---|
  | Fluent Emoji Flat | 45% |
  | Twemoji | 48% |
  | Noto | 47% |
  | OpenMoji | 52% |
  | Tabler | 48% |

  These numbers are noisy in both directions.
- My hand check of the 121 L1 nouns:
  - About 47 are imageable objects, places or roles. About 40 of those (~85%) have a fitting emoji.
  - Missing: 桌子 (table), 房间, 书店, 饭店, 超市, and 包子 / 电影院 only via weak stand-ins.
  - About 12 are kinship or social words (妈妈, 哥哥, 朋友…). They need relational figures.
  - About 25 are time words. They need timeline or calendar diagrams.
  - The rest are abstract.
- Emoji people cover few HSK verbs. Fluent has running, walking, biking, swimming, in bed and bathing, but nothing for 喝, 吃, 看, 读, 写, 买 or 坐.

**Other code-drawing routes (not prototyped)**
- TikZ needs a LaTeX toolchain and does not theme with CSS variables.
- Mermaid and Graphviz suit diagrams (timelines, trees), not scenes.
- rough.js (MIT) could give a hand-drawn look over the parts; I did not test it.
- An Excalidraw-style look has the same trade-off.
- D3 or p5 add nothing over a small layout module.

## Prototype results
Run `npm i`, then `node src/build.mjs`. Open `index.html`: each cell shows the same SVG in light and dark, links to the PNGs, and lists the checker's findings. The PNGs are rasterized locally with @resvg/resvg-js into `out/png/`. I checked the page in the browser pane.

Variants, each run on figures a–d plus a bonus figure e:

**A0. Raw SVG, one shot.** I wrote each figure as an LLM would.
- Surprisingly usable, but:
  - the book was a red slab;
  - the drinking arm was a black wedge;
  - the tea cup was a square;
  - the 里 ball read as "on the front of the box";
  - the person's legs (and the dog's) were black strokes that vanish in dark mode.
- The checker caught the dark-mode legs automatically.

**A2. Raw SVG after critique.** I acted as the vision model by reading the PNGs.
- Round 1 rewrote all four figures and was a large improvement in every one: a book with pages, a seated profile person with a working drinking pose, a front-sitting cat, a side-view dog, a sedan, a 3/4 box.
- Round 2 touched only the box figure (里 opening, right-edge clipping), a small gain. 里 is still only moderately clear.
- The checker still flagged the apple stem as invisible in dark mode.
- Every new figure is a fresh drawing, so a cat in one lesson does not match the cat in another.

**B. Scene spec plus parts library.** The best result.
- Parts were harvested once from the A2 drawings, with anchors added (`top`, `under`, `inner`, `hand`).
- The same specs produced all five figures with consistent art.
- Fixing the apple stem once in the library fixed it everywhere.
- The bonus figure ("狗在桌子下面" and "猫在桌子下面") needed no new drawing, only a spec. The checker reported that the dog was shrunk to 74% to fit under the table.
- Its quality equals A2's by construction. The gains are consistency, reuse and checkability, not prettier art.

**C1. Same specs with Fluent Emoji Flat.**
- Noun grid: excellent in both themes.
- Scenes: wrong relative scale (chair tiny, tea cup huge), an upright book, and procedural fallbacks for the table and person that clash in style.
- 里 cannot be expressed: the `package` emoji has no interior, and the spec was rejected.

**C2. Same specs with Fluent High Contrast (mono, `currentColor`).**
- Themes correctly.
- Reads like UI icons. Some glyphs are odd (hatched apple).

**What the checker caught (no vision model needed)**
- Unknown kind, relation or target, and relation cycles.
- Relations that cannot be satisfied: no surface, interior or hand.
- Overlaps between unrelated objects.
- Things that do not fit under furniture (it shrinks them and warns if the shrink is more than 20%).
- Hard-coded colors.
- Thick stroke-only marks with less than 1.6:1 contrast in either theme. It caught two real bugs; one false-positive pattern, outlined double strokes, is now exempt.
- Baked English text, and an `aria-label` that is not a message key (raw SVGs).
- Caption wider than its panel.
- Missing message keys.
- Emoji fallback causing a style mismatch.

**What the checker cannot catch**
- Whether a part looks like its object.
- Whether a pose reads as "drinking."
- Relative real-world scale between parts.
- Visual ambiguity, such as 里 vs 上.

## Recommendation
**Pipeline**
1. The lesson-authoring agent writes a figure spec in the lesson file.
   - It uses only the library's closed vocabulary of kinds, poses and relations.
   - The validator returns errors that list the valid options, so the agent self-corrects in text.
2. Unknown kind → the agent asks for a new part in a separate step:
   - draw the SVG part;
   - render it to light and dark PNGs;
   - critique 1–2 rounds by looking at the PNGs;
   - run the checker;
   - commit it to the library with a "needs spot-check" flag.

   A human spot-checks each new part once, not each figure.
3. Build step: compile the spec to SVG (Node), run the checker (errors fail the build), and write PNG previews for the spot-check page.
4. App: one `<LessonFigure>` component renders the compiled SVG.
   - Colors come only from tokens.
   - Glosses and `aria-label` come from `t()`.
   - Recommendation: render captions in HTML below the SVG so they wrap and use app fonts. SVG `<text>` does not wrap, and the overflow check is only an estimate.
5. Vocabulary noun cards: a separate `kind: icon` figure type backed by Fluent Emoji Flat (MIT). Use it only for whole emoji grids, never mixed into scenes.

**Spec example**
```js
{ aria: 'fig.tea.aria',
  panels: [
    { caption: { zh: '在喝茶', gloss: 'gloss.drinking' }, objects: [
      { id: 'man', kind: 'person', pose: 'drink' },
      { id: 'cup', kind: 'teacup', hot: true, heldBy: 'man' },
      { id: 'table', kind: 'sideTable', beside: 'man', side: 'right' } ] },
    { caption: { zh: '没喝茶', gloss: 'gloss.notDrinking' }, objects: [
      { id: 'man', kind: 'person', pose: 'rest' },
      { id: 'table', kind: 'sideTable', beside: 'man', side: 'right' },
      { id: 'cup', kind: 'teacup', hot: true, on: 'table' } ] } ] }
```
`focus: ['cat']` dims the other objects; this replaces SceneFigure's `highlight` prop.

**Theming**
- Parts use app tokens plus about 14 proposed `--fig-*` tokens (line, fill, shade, wood, wood-dark, fur, fur-dark, skin, hair, cloth, tea, accent, ground, bg), with light and dark values. They are in `src/theme.mjs` and would move to `tokens.css`.
- Dark mode keeps light "sticker" fills with dark outlines on the dark page. This reads well in the PNGs.
- Full-color emoji do not theme, which is acceptable for noun cards.

**Labels**
- Chinese caption text is lesson content.
- The gloss and `aria-label` are message keys.
- No English is ever baked into paths.

**Assets and licenses shipped**
- The parts library: LLM-drawn, project-owned.
- Fluent Emoji Flat: MIT, keep the license notice.
- Optional: Twemoji (CC BY 4.0, attribution) or Noto (Apache 2.0) as alternates.
- Avoid OpenMoji (CC BY-SA), unDraw and Humaaans.

**Cost and effort**
- Runtime cost is zero: static SVG, no GPU, no network.
- The spike is about 580 lines of JavaScript.
- Productionizing: a TypeScript layout and checker module (~600–800 lines), plus about 40–60 parts for the HSK 1–3 scenes. Each part is one agent loop of minutes.
- The hard part is a parametric person with roughly 10 poses: sit, stand, walk, drink, eat, read, write, phone, sleep, point. Open Peeps (CC0) is worth testing as a base.
- Estimate 3–5 days.
- Add a diagram renderer (timelines, calendars, clocks) for the roughly 25 time words; TimelineFigure is the seed.

**Automatic gates to keep**
- Every check listed under Prototype results.
- Add: a per-kind world-scale table, so the cup-vs-table proportion is checked.
- Add: an optional vision pass that asks "does this PNG depict ⟨caption⟩?" when a part is created. A local vision model on the 2070 is untested; a hosted one is fine at authoring time.

## Limits
- I was both the drawer and the critic, so the critique-loop results may be biased in its favor. A smaller local vision model would critique less well.
- Small sample: 4 figures plus 1 bonus.
- B's art comes from A2, so B vs A compares structure, not drawing skill.
- Coverage numbers are naive matching plus one hand count of L1 nouns.
- Not tested:
  - rough.js;
  - Open Peeps;
  - OmniSVG or StarVector locally;
  - a local vision critic;
  - a pseudo-locale for long glosses.
- `coverage.mjs` reads the HSK lists from `sandbox/spikes/clip-coverage/data/hsk/` (a sandbox-internal dependency).
