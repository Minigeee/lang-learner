// Contact sheet: node src/sheet.mjs out.png a.png b.png ... (2 columns) for quick visual review.
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'
const [out, ...files] = process.argv.slice(2)
const W = 480, H = 300, cols = 2
const imgs = files.map((f, i) => `<image x="${(i % cols) * W}" y="${Math.floor(i / cols) * H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${readFileSync(f).toString('base64')}"/><rect x="${(i % cols) * W}" y="${Math.floor(i / cols) * H}" width="${W}" height="${H}" fill="none" stroke="#888"/>`).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * cols}" height="${Math.ceil(files.length / cols) * H}"><rect width="100%" height="100%" fill="#777"/>${imgs}</svg>`
writeFileSync(out, new Resvg(svg).render().asPng())
