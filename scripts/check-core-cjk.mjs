// Rejects CJK text anywhere in packages/core, comments included, so a Chinese assumption can't creep in.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'packages/core'
const CJK = /[぀-ヿ㐀-鿿豈-﫿가-힯]/

function* sources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* sources(path)
    else if (entry.name.endsWith('.ts')) yield path
  }
}

const hits = []
for (const path of sources(ROOT)) {
  readFileSync(path, 'utf8').split('\n').forEach((line, i) => {
    if (CJK.test(line)) hits.push(`${path}:${i + 1}: ${line.trim()}`)
  })
}
if (hits.length) {
  console.error(`CJK text in ${ROOT}:\n${hits.join('\n')}`)
  process.exit(1)
}
