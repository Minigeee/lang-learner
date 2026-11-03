// Quick tool for the critique loop: node src/rasterize-raw.mjs r0 -> out/png/raw-r0-*.png
import { readdirSync, readFileSync, mkdirSync } from 'node:fs'
import { fillMessages } from './i18n.mjs'
import { toPng } from './raster.mjs'
const round = process.argv[2]
const dir = new URL(`./raw/${round}/`, import.meta.url)
mkdirSync(new URL('../out/png/', import.meta.url), { recursive: true })
for (const f of readdirSync(dir)) {
  const svg = fillMessages(readFileSync(new URL(f, dir), 'utf8'))
  for (const th of ['light', 'dark']) toPng(svg, th, new URL(`../out/png/raw-${round}-${f.replace('.svg', '')}-${th}.png`, import.meta.url), 480)
}
console.log('ok')
