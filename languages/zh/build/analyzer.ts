// analyze(): segmentation plus in-context readings, with an item id per word token.
//
// The spike's best configuration (FINDINGS §4): ICU segmentation, repaired by bidirectional matching
// over CC-CEDICT, re-joining 3+ character dictionary words; readings are chosen among a token's
// CC-CEDICT readings using pinyin-pro's in-sentence guess, with a particle default.
import type { ItemId, Token } from '@lang-learner/core'
import { pinyin } from 'pinyin-pro'
import { itemKey, syllables, type Lexicon } from './cedict.ts'

const HAN = /\p{Script=Han}/u
const icu = new Intl.Segmenter('zh', { granularity: 'word' })

function inDict(lex: Lexicon, s: string): boolean {
  return (lex.bySimp.get(s) ?? []).some((e) => itemKey(e) !== null)
}

function forward(lex: Lexicon, s: string): string[] {
  const cps = [...s]
  const out: string[] = []
  for (let i = 0; i < cps.length;) {
    let len = Math.min(lex.maxLen, cps.length - i)
    while (len > 1 && !inDict(lex, cps.slice(i, i + len).join(''))) len--
    out.push(cps.slice(i, i + len).join(''))
    i += len
  }
  return out
}

function backward(lex: Lexicon, s: string): string[] {
  const cps = [...s]
  const out: string[] = []
  for (let j = cps.length; j > 0;) {
    let len = Math.min(lex.maxLen, j)
    while (len > 1 && !inDict(lex, cps.slice(j - len, j).join(''))) len--
    out.unshift(cps.slice(j - len, j).join(''))
    j -= len
  }
  return out
}

/** Bidirectional maximum matching: fewer tokens wins, then fewer single characters, then backward. */
function bidirectional(lex: Lexicon, s: string): string[] {
  const f = forward(lex, s)
  const b = backward(lex, s)
  if (f.length !== b.length) return f.length < b.length ? f : b
  const singles = (t: string[]) => t.filter((x) => [...x].length === 1).length
  return singles(f) < singles(b) ? f : b
}

function splitOther(s: string): string[] {
  return s.match(/[A-Za-z0-9]+|\S/gu) ?? []
}

/** Re-joins adjacent tokens that together form a CC-CEDICT word of 3+ characters (自行车, 怎么样). */
function mergeLong(lex: Lexicon, tokens: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < tokens.length;) {
    let best = 1
    for (let j = i + 2; j <= Math.min(tokens.length, i + 4); j++) {
      const s = tokens.slice(i, j).join('')
      const n = [...s].length
      if (n >= 3 && n <= lex.maxLen && inDict(lex, s) && HAN.test(s)) best = j - i
    }
    out.push(tokens.slice(i, i + best).join(''))
    i += best
  }
  return out
}

function segment(sentence: string, lex: Lexicon): string[] {
  const parts = [...icu.segment(sentence)].map((x) => x.segment).filter((x) => x.trim())
  return mergeLong(lex, parts.flatMap((seg) => {
    if (!HAN.test(seg)) return splitOther(seg)
    return inDict(lex, seg) || [...seg].length === 1 ? [seg] : bidirectional(lex, seg)
  }))
}

/** pinyin-pro over the whole sentence: one citation syllable per code point, "" for non-Han. */
function sentenceReadings(sentence: string): string[] {
  return pinyin(sentence, { type: 'all', toneType: 'num', toneSandhi: false })
    .map((x) => (x.isZh ? x.pinyin.replace(/0$/, '5').replace(/ü/g, 'v') : ''))
}

function entryReadings(lex: Lexicon, surface: string): string[] {
  const keys = (lex.bySimp.get(surface) ?? []).map(itemKey).filter((k) => k !== null)
  return [...new Set(keys.map((k) => k.slice(surface.length + 1)))]
}

const toneless = (r: string) => r.replace(/[1-5]/g, '')
const neutralFree = (r: string) => syllables(r).map((s) => (s.endsWith('5') ? toneless(s) : s)).join('')
const erhuaFold = (r: string) => r.replace(/er2$/, 'r5')

/** Picks a CC-CEDICT reading consistent with the contextual guess, loosening the match step by step. */
function chooseReading(candidates: string[], guess: string): string {
  if (candidates.length === 0 || candidates.includes(guess)) return guess
  for (const fold of [erhuaFold, neutralFree, toneless]) {
    const hit = candidates.filter((c) => fold(c) === fold(guess) || fold(c) === neutralFree(guess))
    if (hit.length === 1) return hit[0]!
  }
  return candidates.length === 1 ? candidates[0]! : guess
}

/** A standalone token that is almost always the structural or aspect particle at this level. */
const PARTICLE: Record<string, string> = { 了: 'le5', 着: 'zhe5', 过: 'guo5', 得: 'de5', 地: 'de5' }

/**
 * Tokens cover the line exactly, in order. `r` is the citation reading, present on Han tokens only.
 * `id` is set only when the surface and reading are a CC-CEDICT key: this never mints an id.
 */
export function analyze(line: string, lex: Lexicon): Token[] {
  const s = line.normalize('NFC')
  const readings = sentenceReadings(s)
  let cp = 0
  return segment(s, lex).map((surface) => {
    const n = [...surface].length
    const guess = readings.slice(cp, cp + n).join('')
    cp += n
    if (!HAN.test(surface)) return { s: surface }
    const candidates = entryReadings(lex, surface)
    const r = PARTICLE[surface] ?? chooseReading(candidates, guess)
    const id = candidates.includes(r) ? (`zh:w:${surface}:${r}` as ItemId) : undefined
    return id ? { s: surface, r, id } : { s: surface, r }
  })
}
