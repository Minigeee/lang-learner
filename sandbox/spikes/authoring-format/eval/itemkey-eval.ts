// npm run eval:itemkey
// Is `<simplified>:<reading>` (the zh pack's itemKey) a stable, unique key over CC-CEDICT?
import { loadCedict, itemKey, type LexEntry } from '../src/zh/cedict.ts'

const lex = loadCedict()
const show = process.argv.includes('--examples')
const ex = (label: string, list: string[], n = 8) => console.log(`  ${label}: ${list.length}${show || list.length ? `\n${list.slice(0, n).map((x) => `      ${x}`).join('\n')}` : ''}`)

const byKey = new Map<string, LexEntry[]>()
const invalid: LexEntry[] = []
for (const e of lex.entries) {
  const k = itemKey(e)
  if (!k) { invalid.push(e); continue }
  byKey.set(k, [...(byKey.get(k) ?? []), e])
}
const fmt = (e: LexEntry) => `${e.trad} ${e.simp} [${e.pinyin}] /${e.glosses.slice(0, 2).join('/')}/`

console.log(`CC-CEDICT entries: ${lex.entries.length}`)
console.log(`Entries with a valid key: ${lex.entries.length - invalid.length}; distinct keys: ${byKey.size}`)

// 1. Entries that can't get a key at all.
const invalidKinds = new Map<string, LexEntry[]>()
for (const e of invalid) {
  const why = /[A-Za-z]/.test(e.simp) ? 'Latin letters in headword' : /xx5/.test(e.pinyin) ? 'xx5 placeholder reading' : /[,·]/.test(e.pinyin) ? 'punctuation in reading' : /\d/.test(e.simp) ? 'digits in headword' : 'other'
  invalidKinds.set(why, [...(invalidKinds.get(why) ?? []), e])
}
console.log('\n1. Entries with no valid key (reading is not plain toned pinyin):')
for (const [k, v] of invalidKinds) ex(k, v.map(fmt), 3)

// 2. Collisions: several entries share one key.
const coll = [...byKey.entries()].filter(([, v]) => v.length > 1)
const kinds = { 'case only (proper noun vs common word)': [] as string[], 'different traditional form': [] as string[], 'same trad + simp (split senses)': [] as string[] }
for (const [k, v] of coll) {
  const s = `${k}: ${v.map(fmt).join('  |  ')}`
  if (new Set(v.map((e) => e.pinyin)).size > 1 && new Set(v.map((e) => e.pinyin.toLowerCase())).size === 1 && new Set(v.map((e) => e.trad)).size === 1) kinds['case only (proper noun vs common word)'].push(s)
  else if (new Set(v.map((e) => e.trad)).size > 1) kinds['different traditional form'].push(s)
  else kinds['same trad + simp (split senses)'].push(s)
}
console.log(`\n2. Keys shared by 2+ entries: ${coll.length} keys covering ${coll.reduce((n, [, v]) => n + v.length, 0)} entries`)
for (const [k, v] of Object.entries(kinds)) ex(k, v, 5)
// Of the trad-form collisions, which merge two real words (neither entry is a variant/see-also pointer)?
const isPointer = (e: LexEntry) => e.glosses.every((g) => /variant of|^see |^used in |^surname /.test(g))
const realHomographs = coll.filter(([, v]) => new Set(v.map((e) => e.trad)).size > 1 && v.filter((e) => !isPointer(e)).length > 1)
const common = ['后', '里', '面', '干', '发', '台', '系', '只', '才', '几', '么', '听', '钟', '准', '复', '历', '松', '表', '饥', '冲', '划', '奸', '叶', '恶', '范', '云', '谷', '丑', '刮', '胡', '回', '获', '借', '卷', '据', '了', '蒙', '面', '弥', '辟', '朴', '仆', '曲', '舍', '沈', '升', '适', '术', '体', '涂', '团', '洼', '向', '须', '御', '郁', '余', '愿', '岳', '折', '征', '症', '致', '制', '种', '筑', '着', '咸', '纤', '尽', '斗', '当', '党', '冬', '恶']
ex('…of which merge two real words (neither entry is only a variant/see pointer)', realHomographs.map(([k, v]) => `${k}: ${v.filter((e) => !isPointer(e)).map((e) => `${e.trad} /${e.glosses[0]}/`).join('  |  ')}`).sort((a, b) => Number(common.includes(b.split(':')[0])) - Number(common.includes(a.split(':')[0]))), 12)

// 3. Ambiguity from the learner's side: one surface, several keys.
const keysBySimp = new Map<string, Set<string>>()
for (const k of byKey.keys()) { const simp = k.slice(0, k.lastIndexOf(':')); keysBySimp.set(simp, (keysBySimp.get(simp) ?? new Set()).add(k)) }
const multi = [...keysBySimp.entries()].filter(([, v]) => v.size > 1)
console.log(`\n3. Surfaces with 2+ keys (the analyzer must pick one from context): ${multi.length} of ${keysBySimp.size}`)
const neutralPairs = multi.filter(([, v]) => {
  const arr = [...v].map((k) => k.slice(k.lastIndexOf(':') + 1))
  return arr.some((a) => arr.some((b) => a !== b && a.replace(/5/g, 'X') !== b.replace(/5/g, 'X') && a.replace(/[1-5]/g, '') === b.replace(/[1-5]/g, '') && differOnlyByNeutral(a, b)))
})
function differOnlyByNeutral(a: string, b: string): boolean {
  const sa = a.match(/[a-zv]+[1-5]/g) ?? [], sb = b.match(/[a-zv]+[1-5]/g) ?? []
  if (sa.length !== sb.length) return false
  let diff = 0
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) { if (!(sa[i].endsWith('5') || sb[i].endsWith('5'))) return false; diff++ }
  return diff > 0
}
ex('…of which differ only by a neutral vs full tone (東西-style or CC-CEDICT variance)', neutralPairs.map(([s, v]) => `${s}: ${[...v].join(' ')}`), 10)
const s1 = ['得', '了', '着', '还', '长', '好', '都', '地', '的', '为', '觉', '重', '只', '和', '便', '行', '不', '一', '个', '东西', '地方', '大意', '多少', '不是']
console.log('  S1 examples: ' + s1.map((s) => `${s}(${keysBySimp.get(s)?.size ?? 0})`).join(' '))

// 4. Stability hazards inside CC-CEDICT itself.
const alsoPr = lex.entries.filter((e) => e.glosses.some((g) => /also pr\./.test(g)))
const variantOf = lex.entries.filter((e) => e.glosses.some((g) => /^(old )?variant of|^see |^erhua variant of/.test(g)))
const erhua = [...byKey.keys()].filter((k) => /r5$/.test(k))
const bu = [...byKey.keys()].filter((k) => /不/.test(k.split(':')[0]) && [...k.split(':')[0]].length > 1)
const buNeutral = bu.filter((k) => { const [h, r] = k.split(':'); const i = [...h].indexOf('不'); return (r.match(/[a-zv]+[1-5]/g) ?? [])[i] === 'bu5' })
console.log('\n4. Stability hazards')
ex('entries noting "also pr." (a second reading that a future edit could split into its own key)', alsoPr.map(fmt), 4)
ex('variant / see-also entries (a key that may be redirected rather than taught)', variantOf.map(fmt), 3)
console.log(`  erhua keys ending in r5: ${erhua.length} (e.g. ${erhua.slice(0, 4).join(', ')})`)
console.log(`  multi-character keys containing 不: ${bu.length}; with 不 as bu5: ${buNeutral.length} (e.g. ${buNeutral.slice(0, 4).join(', ')})`)
