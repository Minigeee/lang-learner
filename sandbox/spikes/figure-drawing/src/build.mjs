// Builds every variant of the four figures into out/svg + out/png and writes index.html.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { renderFigure } from './scene/scene.mjs'
import { specs } from './scene/specs.mjs'
import { fillMessages } from './i18n.mjs'
import { checkSvg, checkTemplate } from './check.mjs'
import { toPng } from './raster.mjs'
import { cssVars } from './theme.mjs'

const root = new URL('../', import.meta.url)
mkdirSync(new URL('out/svg/', root), { recursive: true }); mkdirSync(new URL('out/png/', root), { recursive: true })
const figures = Object.keys(specs)

const variants = [
  { id: 'raw-r0', title: 'A0 · Raw SVG, one shot', note: 'LLM writes the whole SVG in one pass.',
    make: (f) => fromRaw('r0', f) },
  { id: 'raw-r2', title: 'A2 · Raw SVG after critique', note: 'Same, after render → look → revise (2 rounds; round 2 only touched the box figure).',
    make: (f) => fromRaw(existsSync(new URL(`src/raw/r2/${f}.svg`, root)) ? 'r2' : 'r1', f) },
  { id: 'scene', title: 'B · Scene spec + parts library', note: 'Agent writes objects + relations; layout code places the parts drawn once in A2.',
    make: (f) => renderFigure(specs[f]) },
  { id: 'emoji-flat', title: 'C1 · Scene spec + Fluent Emoji Flat (MIT)', note: 'Same specs, parts swapped for emoji; procedural fallback where the set has no glyph.',
    make: (f) => renderFigure(specs[f], { emoji: 'fluent-emoji-flat', size: 56 }) },
  { id: 'emoji-mono', title: 'C2 · Scene spec + Fluent Emoji High Contrast (MIT, mono)', note: 'Monochrome glyphs in currentColor, so they theme.',
    make: (f) => renderFigure(specs[f], { emoji: 'fluent-emoji-high-contrast', size: 56, mono: true }) },
]
function fromRaw(round, f) {
  if (f === 'e-bonus') throw new Error('not drawn: every new raw figure is a fresh drawing')
  const tpl = readFileSync(new URL(`src/raw/${round}/${f}.svg`, root), 'utf8')
  const svg = fillMessages(tpl)
  return { svg, issues: [...checkTemplate(tpl), ...checkSvg(svg)] }
}

const results = {}
for (const v of variants) for (const f of figures) {
  let svg, issues
  try { ({ svg, issues } = v.make(f)) } catch (e) { // the spec cannot be expressed with this backend
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80"><text x="150" y="45" text-anchor="middle" font-size="14" fill="var(--text-secondary)">✕ ${String(e.message).slice(0, 48).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '')}</text></svg>`
    issues = [{ level: 'error', msg: e.message }]
  }
  const name = `${v.id}-${f}`
  writeFileSync(new URL(`out/svg/${name}.svg`, root), svg)
  for (const th of ['light', 'dark']) toPng(svg, th, new URL(`out/png/${name}-${th}.png`, root), 480)
  results[name] = { svg, issues }
  if (process.argv.includes('-v')) console.log(name, issues.map((i) => i.msg))
}

// Static comparison page: rows = variants, columns = figures; light and dark side by side.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const cell = (v, f) => {
  const r = results[`${v.id}-${f}`]
  const iss = r.issues.length ? `<ul class="iss">${r.issues.map((i) => `<li class="${i.level}">${esc(i.msg)}</li>`).join('')}</ul>` : '<p class="ok">checker: no issues</p>'
  return `<td><div class="pair"><div class="th light">${r.svg}</div><div class="th dark">${r.svg}</div></div>
    <p class="png"><a href="out/png/${v.id}-${f}-light.png">PNG light</a> · <a href="out/png/${v.id}-${f}-dark.png">PNG dark</a></p>${iss}</td>`
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Figure Drawing Spike</title><style>
:root{color-scheme:light dark}
body{margin:0;padding:16px;font:14px/1.45 Segoe UI,system-ui,sans-serif;background:#ECEAE4;color:#1D1B18}
h1{font-size:20px;margin:0 0 4px} .lede{max-width:760px;margin:0 0 16px;color:#4a463f}
.wrap{overflow-x:auto} table{border-collapse:collapse} th,td{vertical-align:top;padding:8px;border-bottom:1px solid #d6d2c8}
th{text-align:left;font-size:13px;width:180px} th small{display:block;font-weight:400;color:#625D55;margin-top:4px}
thead th{width:auto}
.pair{display:flex;gap:6px} .th{width:200px;border-radius:12px;padding:8px;box-sizing:border-box}
.th svg{width:100%;height:auto;display:block}
.light{${cssVars('light')};background:var(--surface-2)} .dark{${cssVars('dark')};background:var(--surface-2)}
.png{margin:4px 0 0;font-size:12px} .iss{margin:4px 0 0;padding-left:16px;font-size:11px;max-width:406px;color:#7a4b00}
.iss .error{color:#a8361f} .ok{font-size:11px;color:#0f6a51;margin:4px 0 0}
</style></head><body>
<h1>Lesson figure drawing: approaches compared</h1>
<p class="lede">Same four figures, five ways. Each cell shows the identical SVG in the light and dark theme (CSS variables), links to resvg-rendered PNGs, and lists what the automatic checker flagged. Labels and aria-labels come from message keys. See FINDINGS.md for the verdict.</p>
<div class="wrap"><table><thead><tr><th></th>${figures.map((f) => `<th>${f}</th>`).join('')}</tr></thead><tbody>
${variants.map((v) => `<tr><th>${v.title}<small>${v.note}</small></th>${figures.map((f) => cell(v, f)).join('')}</tr>`).join('\n')}
</tbody></table></div></body></html>`
writeFileSync(new URL('index.html', root), html)
console.log('built', Object.keys(results).length, 'figures')
