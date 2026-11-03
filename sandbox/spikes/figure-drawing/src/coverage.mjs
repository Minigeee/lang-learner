// Rough coverage of HSK 2025 L1–3 nouns (名) by open icon/emoji sets, via naive English-gloss matching.
// Lower bound on what an agent could find (no synonyms), upper bound on quality (token matches can be loose).
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const hskDir = new URL('../../clip-coverage/data/hsk/', import.meta.url)

const nouns = []
for (const L of [1, 2, 3]) for (const line of readFileSync(new URL(`words_L${L}.txt`, hskDir), 'utf8').split('\n')) {
  const c = line.split('\t'); if (c.length < 8 || !c[5].includes('名')) continue
  const glosses = [...c[7].matchAll(/<li>([^<]*)<\/li>/g)].map((m) => m[1])
    .filter((g) => !/surname|variant|abbr|used in|old |^CL:/i.test(g))
    .map((g) => g.replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/^(a|an|the|to) /i, '').split(/[;,]/)[0].trim().toLowerCase()).filter(Boolean)
  if (glosses.length) nouns.push({ zh: c[0], level: L, glosses, gloss: glosses[0] })
}
const sets = ['fluent-emoji-flat', 'twemoji', 'noto', 'openmoji', 'tabler']
const names = Object.fromEntries(sets.map((s) => { const j = require(`@iconify-json/${s}/icons.json`); return [s, Object.keys(j.icons).concat(Object.keys(j.aliases ?? {}))] }))
// Exact slug, else a single word that is a whole token of the icon name.
const match = (s, g) => {
  const slug = g.replace(/[^a-z ]/g, '').trim().replace(/ +/g, '-')
  if (!slug) return null
  return names[s].find((n) => n === slug) ?? (slug.includes('-') ? null : names[s].find((n) => n.split('-').includes(slug)))
}
const rows = nouns.map((n) => ({ ...n, hits: Object.fromEntries(sets.map((s) => [s, n.glosses.map((g) => match(s, g)).find(Boolean)])) }))
console.log(`HSK 2025 L1–3 nouns: ${rows.length}`)
for (const s of sets) {
  const hit = rows.filter((r) => r.hits[s])
  console.log(`${s.padEnd(18)} ${hit.length}/${rows.length} (${Math.round(100 * hit.length / rows.length)}%)`)
}
if (process.argv.includes('-v')) for (const r of rows) console.log(r.level, r.zh, r.gloss, '->', r.hits['fluent-emoji-flat'] ?? '-')
