// npm run eval:analyzer [-- --errors]
// Scores segmentation (span F1) and readings (per Han character) against eval/gold.txt, for each
// segmenter × reading strategy, and prints an error taxonomy for the configuration we'd ship.
import { readFileSync } from 'node:fs'
import { loadCedict, itemKey, syllables } from '../src/zh/cedict.ts'
import { analyze, displayTones, type Segmenter, type ReadingStrategy, type Token } from '../src/zh/analyzer.ts'
import { pinyin } from 'pinyin-pro'

const POLY = new Set([...'行了得着还长好都地的为觉重只和便'])
const HAN = /\p{Script=Han}/u
const lex = loadCedict()

interface GoldTok { surface: string; reading: string }
interface Gold { text: string; toks: GoldTok[]; low?: string; line: number }

const gold: Gold[] = readFileSync(new URL('./gold.txt', import.meta.url), 'utf8').split('\n')
  .map((l, i) => ({ l, i }))
  .filter(({ l }) => l.trim() && !l.startsWith('#'))
  .map(({ l, i }) => {
    const [body, low] = l.split(/\s+# low: /)
    const toks = body.trim().split(/\s+/).map((t) => { const [surface, reading = ''] = t.split('/'); return { surface, reading } })
    return { text: toks.map((t) => t.surface).join(''), toks, low, line: i + 1 }
  })

const spans = (toks: string[]) => { let o = 0; return new Set(toks.map((t) => { const s = `${o}:${o + [...t].length}`; o += [...t].length; return s })) }
const charReadings = (toks: GoldTok[] | Token[]) => toks.flatMap((t) => (HAN.test(t.surface) ? padTo(t.surface, syllables(t.reading)) : [...t.surface].map(() => '')))
function padTo(surface: string, syl: string[]): string[] {
  const n = [...surface].length
  return syl.length === n ? syl : [...Array(n)].map((_, i) => syl[i] ?? '?')
}

// ---- 1. gold sanity: which gold tokens are not CC-CEDICT entries with that reading? ---------------
if (process.argv.includes('--gold')) {
  console.log('Gold tokens whose surface+reading is not a CC-CEDICT key:')
  for (const g of gold) for (const t of g.toks) {
    if (!HAN.test(t.surface)) continue
    const keys = [...new Set((lex.bySimp.get(t.surface) ?? []).map(itemKey).filter(Boolean))]
    if (!keys.includes(`${t.surface}:${t.reading}`)) console.log(`  line ${g.line}: ${t.surface}/${t.reading}  CC-CEDICT: ${keys.join(' ') || '(none)'}`)
  }
}

// ---- 2. scores ----------------------------------------------------------------------------------------
interface Score { p: number; r: number; f1: number; chars: number; charOk: number; poly: number; polyOk: number; sent: number; sentOk: number; ids: number; idsOk: number }
function score(seg: Segmenter | 'gold', reading: ReadingStrategy): Score {
  let tp = 0, np = 0, ng = 0, chars = 0, charOk = 0, poly = 0, polyOk = 0, sentOk = 0, ids = 0, idsOk = 0
  for (const g of gold) {
    const pred = seg === 'gold' ? analyzeWithSegments(g, reading) : analyze(g.text, lex, { segmenter: seg, reading })
    const ps = spans(pred.map((t) => t.surface)), gs = spans(g.toks.map((t) => t.surface))
    np += ps.size; ng += gs.size; for (const s of ps) if (gs.has(s)) tp++
    const pc = charReadings(pred), gc = charReadings(g.toks), cs = [...g.text]
    let allOk = true
    cs.forEach((c, i) => {
      if (!HAN.test(c)) return
      chars++; const ok = pc[i] === gc[i]; if (ok) charOk++; else allOk = false
      if (POLY.has(c)) { poly++; if (ok) polyOk++ }
    })
    if (allOk) sentOk++
    // item ids: a gold token that is a CC-CEDICT key counts as right if a predicted token has the same span and id.
    const predIds = new Map<string, string | undefined>(); { let o = 0; for (const t of pred) { predIds.set(`${o}:${o + [...t.surface].length}`, t.itemId); o += [...t.surface].length } }
    let o = 0
    for (const t of g.toks) {
      const span = `${o}:${o + [...t.surface].length}`; o += [...t.surface].length
      if (!HAN.test(t.surface)) continue
      ids++; if (predIds.get(span) === `zh:w:${t.surface}:${t.reading}`) idsOk++
    }
  }
  const p = tp / np, r = tp / ng
  return { p, r, f1: (2 * p * r) / (p + r), chars, charOk, poly, polyOk, sent: gold.length, sentOk, ids, idsOk }
}

/** Run readings over the gold segmentation, to separate reading errors from segmentation errors. */
function analyzeWithSegments(g: Gold, reading: ReadingStrategy): Token[] {
  return analyze(g.text, lex, { segments: g.toks.map((t) => t.surface), reading })
}

const pct = (a: number, b: number) => `${((100 * a) / b).toFixed(1)}%`
const rows: string[] = []
for (const seg of ['icu', 'fmm', 'bimm', 'hybrid', 'hybrid-merge3', 'gold'] as const) {
  for (const rd of ['pinyin-pro', 'pinyin-pro-per-token', 'cedict-guided', 'cedict-guided+particles'] as const) {
    const s = score(seg, rd)
    rows.push(`| ${seg} | ${rd} | ${seg === 'gold' ? '—' : `${(s.p * 100).toFixed(1)} / ${(s.r * 100).toFixed(1)} / **${(s.f1 * 100).toFixed(1)}**`} | ${pct(s.charOk, s.chars)} | ${pct(s.polyOk, s.poly)} (${s.poly}) | ${pct(s.sentOk, s.sent)} | ${pct(s.idsOk, s.ids)} |`)
  }
}
console.log(`${gold.length} sentences, ${gold.reduce((n, g) => n + g.toks.filter((t) => HAN.test(t.surface)).length, 0)} Han tokens, ${gold.filter((g) => g.low).length} flagged low-confidence\n`)
console.log('| Segmenter | Readings | Seg P / R / F1 | Char reading acc. | Polyphone acc. (n) | Sentences all-correct | Token item id acc. |')
console.log('|---|---|---|---|---|---|---|')
console.log(rows.join('\n'))

// ---- 3. error taxonomy for the shipped configuration ----------------------------------------------------
const SHIP: { seg: Segmenter; rd: ReadingStrategy } = { seg: (process.env.SEG as Segmenter) ?? 'hybrid-merge3', rd: (process.env.RD as ReadingStrategy) ?? 'cedict-guided+particles' }
const segErr: Record<string, string[]> = { 'over-merge (granularity)': [], 'over-split (granularity)': [], crossing: [] }
const rdErr: Record<string, string[]> = {}
for (const g of gold) {
  const pred = analyze(g.text, lex, { segmenter: SHIP.seg, reading: SHIP.rd })
  const ps = [...spans(pred.map((t) => t.surface))].map((s) => s.split(':').map(Number) as [number, number])
  const gs = [...spans(g.toks.map((t) => t.surface))].map((s) => s.split(':').map(Number) as [number, number])
  const cps = [...g.text]
  const str = ([a, b]: [number, number]) => cps.slice(a, b).join('')
  const gSet = new Set(gs.map((x) => x.join(':')))
  for (const p of ps) {
    if (gSet.has(p.join(':'))) continue
    const inside = gs.filter(([a, b]) => a >= p[0] && b <= p[1])
    const container = gs.find(([a, b]) => a <= p[0] && b >= p[1])
    const ctx = `${g.text}  [${str(p)}]`
    if (inside.length > 1 && inside[0][0] === p[0] && inside[inside.length - 1][1] === p[1]) segErr['over-merge (granularity)'].push(`${ctx} gold: ${inside.map(str).join(' ')}${g.low ? ' (low)' : ''}`)
    else if (container) { if (container[0] === p[0]) segErr['over-split (granularity)'].push(`${g.text}  [${str(container)}] → split${g.low ? ' (low)' : ''}`) }
    else segErr.crossing.push(`${ctx}${g.low ? ' (low)' : ''}`)
  }
  const pc = charReadings(pred), gc = charReadings(g.toks)
  cps.forEach((c, i) => {
    if (!HAN.test(c) || pc[i] === gc[i]) return
    const a = pc[i], b = gc[i]
    const type = a.replace(/\d/, '') !== b.replace(/\d/, '')
      ? (b.startsWith('r') || a.startsWith('er') ? 'erhua (er2 vs r5)' : 'wrong polyphone reading')
      : a.endsWith('5') || b.endsWith('5') ? 'neutral vs full tone' : 'wrong tone'
    ;(rdErr[type] ??= []).push(`${c} got ${a}, gold ${b} in ${g.text}${g.low ? ' (low)' : ''}`)
  })
}
console.log(`\nShipped config ${SHIP.seg} + ${SHIP.rd}: segmentation errors`)
for (const [k, v] of Object.entries(segErr)) { console.log(`  ${k}: ${v.length}`); if (process.argv.includes('--errors')) v.forEach((x) => console.log(`     ${x}`)) }
console.log('Reading errors (per character):')
for (const [k, v] of Object.entries(rdErr)) { console.log(`  ${k}: ${v.length}`); if (process.argv.includes('--errors')) v.forEach((x) => console.log(`     ${x}`)) }

// ---- 4. display sandhi sanity: our displayTones() vs pinyin-pro's own toneSandhi on the gold sentences --
let agree = 0, total = 0
const diffs: string[] = []
for (const g of gold) {
  const toks: Token[] = g.toks.map((t) => ({ surface: t.surface, reading: t.reading, readings: 0, isHan: HAN.test(t.surface) }))
  const ours = displayTones(toks)
  const theirs = (pinyin(g.text, { type: 'all', toneType: 'num', toneSandhi: true }) as any[]).filter((x) => x.isZh).map((x) => String(x.pinyin).replace(/0$/, '5').replace(/ü/g, 'v'))
  const cit = toks.flatMap((t) => (t.isHan ? syllables(t.reading) : []))
  ours.forEach((o, i) => {
    if (o === cit[i] || !['bu', 'yi'].includes(cit[i].slice(0, -1))) return // pinyin-pro's toneSandhi covers only 一 and 不
    total++; if (theirs[i]?.slice(-1) === o.slice(-1)) agree++; else diffs.push(`${g.text}: syllable ${i + 1} ours ${o}, pinyin-pro ${theirs[i]}`)
  })
}
const third = gold.reduce((n, g) => {
  const t: Token[] = g.toks.map((x) => ({ surface: x.surface, reading: x.reading, readings: 0, isHan: HAN.test(x.surface) }))
  const c = t.flatMap((x) => (x.isHan ? syllables(x.reading) : []))
  return n + displayTones(t).filter((o, i) => o !== c[i] && !['bu', 'yi'].includes(c[i].slice(0, -1))).length
}, 0)
console.log(`\nDisplay sandhi: 一/不 changes ${total}, pinyin-pro toneSandhi agrees on ${agree}. Third-tone changes (pinyin-pro has no equivalent): ${third}.`)
if (process.argv.includes('--errors')) diffs.forEach((d) => console.log(`   ${d}`))
