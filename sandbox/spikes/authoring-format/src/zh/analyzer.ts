// The zh pack's analyze(): segmentation plus in-context readings, with an item id per token.
//
// Contract:
// - `reading` is the CITATION reading (tone digits 1–5, 5 = neutral, ü as v), never the spoken one:
//   不是 is bu4 shi4, 一个 is yi1 ge4, 你好 is ni3 hao3. Sandhi is a display concern (see displayTones()).
// - `itemId` is set only when the token's lemma + reading is a CC-CEDICT entry (zh:w:<itemKey>).
// - Tokens cover the sentence exactly, in order (their surfaces concatenate back to the input).
import { pinyin } from 'pinyin-pro'
import { itemKey, keySyllable, syllables, type Lexicon, type LexEntry } from './cedict.ts'

export type Segmenter = 'icu' | 'fmm' | 'bimm' | 'hybrid' | 'hybrid-merge3'
export type ReadingStrategy = 'pinyin-pro' | 'pinyin-pro-per-token' | 'cedict-guided' | 'cedict-guided+particles'

export interface Token {
  surface: string
  reading: string // citation reading joined, e.g. "na3r5"; "" for punctuation and non-Han text
  itemId?: string
  /** How many distinct CC-CEDICT readings this surface has (≥2 means the reading needed context). */
  readings: number
  isHan: boolean
}

const HAN = /\p{Script=Han}/u
const icu = new Intl.Segmenter('zh', { granularity: 'word' })

// ---- segmentation --------------------------------------------------------------------------------
function inDict(lex: Lexicon, s: string): boolean {
  return lex.bySimp.has(s) && (lex.bySimp.get(s) ?? []).some((e) => itemKey(e) !== null)
}

function fmm(lex: Lexicon, s: string): string[] {
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

function bmm(lex: Lexicon, s: string): string[] {
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

/** Classic bidirectional maximum matching: fewer tokens wins, then fewer single characters, then backward. */
function bimm(lex: Lexicon, s: string): string[] {
  const f = fmm(lex, s), b = bmm(lex, s)
  if (f.length !== b.length) return f.length < b.length ? f : b
  const singles = (t: string[]) => t.filter((x) => [...x].length === 1).length
  return singles(f) < singles(b) ? f : b
}

/** Split a string into Han runs and everything else, so dictionary matching never crosses punctuation. */
function hanRuns(s: string): { text: string; han: boolean }[] {
  return (s.match(/\p{Script=Han}+|[^\p{Script=Han}]+/gu) ?? []).map((t) => ({ text: t, han: HAN.test(t) }))
}

export function segment(sentence: string, lex: Lexicon, how: Segmenter): string[] {
  if (how === 'icu') return [...icu.segment(sentence)].map((x) => x.segment).filter((x) => x.trim())
  const dict = how === 'fmm' ? fmm : bimm
  if (how === 'fmm' || how === 'bimm') {
    return hanRuns(sentence).flatMap((r) => (r.han ? dict(lex, r.text) : splitOther(r.text)))
  }
  if (how === 'hybrid-merge3') return mergeLong(lex, segment(sentence, lex, 'hybrid'))
  // hybrid: trust ICU where it produced a dictionary word; re-segment the rest with BiMM.
  return [...icu.segment(sentence)].map((x) => x.segment).filter((x) => x.trim()).flatMap((seg) => {
    if (!HAN.test(seg)) return splitOther(seg)
    return inDict(lex, seg) || [...seg].length === 1 ? [seg] : bimm(lex, seg)
  })
}

/** Re-join adjacent tokens when together they form a CC-CEDICT word of 3+ characters (自行车, 一点儿, 怎么样). */
function mergeLong(lex: Lexicon, toks: string[]): string[] {
  const out: string[] = []
  for (let i = 0; i < toks.length;) {
    let best = 1
    for (let j = i + 2; j <= Math.min(toks.length, i + 4); j++) {
      const s = toks.slice(i, j).join('')
      if ([...s].length >= 3 && [...s].length <= lex.maxLen && inDict(lex, s) && HAN.test(s)) best = j - i
    }
    out.push(toks.slice(i, i + best).join(''))
    i += best
  }
  return out
}

function splitOther(s: string): string[] {
  return (s.match(/[A-Za-z0-9]+|\S/gu) ?? [])
}

// ---- readings ------------------------------------------------------------------------------------
function ppSyllable(p: string): string {
  // pinyin-pro gives "men0" for neutral and "nü3" for ü.
  return p.replace(/0$/, '5').replace(/ü/g, 'v')
}

/** pinyin-pro over the whole sentence, one citation syllable per code point ("" for non-Han). */
function sentenceReadings(sentence: string): string[] {
  return pinyin(sentence, { type: 'all', toneType: 'num', toneSandhi: false }).map((x: any) => (x.isZh ? ppSyllable(x.pinyin) : ''))
}

function entryKeys(lex: Lexicon, surface: string): string[] {
  const keys = (lex.bySimp.get(surface) ?? []).map((e: LexEntry) => itemKey(e)).filter((k): k is string => !!k)
  return [...new Set(keys.map((k) => k.slice(surface.length + 1)))]
}

const toneless = (r: string) => r.replace(/[1-5]/g, '')
const neutralFree = (r: string) => syllables(r).map((s) => (s.endsWith('5') ? toneless(s) : s)).join('')
const erhuaFold = (r: string) => r.replace(/er2$/, 'r5')

/** Pick a CC-CEDICT reading consistent with pinyin-pro's contextual guess, loosening the match step by step. */
function chooseReading(candidates: string[], guess: string): string {
  if (candidates.length === 0) return guess
  if (candidates.includes(guess)) return guess
  for (const f of [erhuaFold, (r: string) => neutralFree(r), (r: string) => toneless(r)]) {
    const hit = candidates.filter((c) => f(c) === f(guess) || f(c) === neutralFree(guess))
    if (hit.length === 1) return hit[0]
  }
  return candidates.length === 1 ? candidates[0] : guess
}

/** `segments` (evaluation only) supplies a segmentation instead of running a segmenter. */
export function analyze(sentence: string, lex: Lexicon, opts: { segmenter?: Segmenter; reading?: ReadingStrategy; segments?: string[] } = {}): Token[] {
  const s = sentence.normalize('NFC')
  const segs = opts.segments ?? segment(s, lex, opts.segmenter ?? 'hybrid')
  const strategy = opts.reading ?? 'cedict-guided'
  const per = strategy === 'pinyin-pro-per-token' ? null : sentenceReadings(s)
  let cp = 0
  return segs.map((surface) => {
    const n = [...surface].length
    const isHan = HAN.test(surface)
    const guess = per ? per.slice(cp, cp + n).join('') : sentenceReadings(surface).join('')
    cp += n
    if (!isHan) return { surface, reading: '', readings: 0, isHan }
    const candidates = entryKeys(lex, surface)
    const reading = strategy === 'cedict-guided+particles' && PARTICLE[surface]
      ? PARTICLE[surface]
      : strategy.startsWith('cedict-guided') ? chooseReading(candidates, guess) : guess
    const itemId = candidates.includes(reading) ? `zh:w:${surface}:${reading}` : undefined
    return { surface, reading, itemId, readings: candidates.length, isHan }
  })
}

/** A standalone token that is almost always the structural or aspect particle at S1 level. */
const PARTICLE: Record<string, string> = { 了: 'le5', 着: 'zhe5', 过: 'guo5', 得: 'de5', 地: 'de5' }

// ---- display-time sandhi (not stored) ---------------------------------------------------------------
/**
 * Spoken tones for display, computed from citation readings at render time. Covers sr:bu-sandhi,
 * sr:yi-sandhi and sr:third-tone-sandhi (pairwise, right to left within the sentence). Returns one
 * syllable per Han code point. Third-tone grouping by prosodic word is approximated by token boundaries.
 */
export function displayTones(tokens: Token[]): string[] {
  const syl = tokens.flatMap((t) => (t.isHan ? syllables(t.reading) : []))
  const out = [...syl]
  const tone = (i: number) => Number(out[i]?.slice(-1))
  for (let i = out.length - 2; i >= 0; i--) {
    if (tone(i) === 3 && tone(i + 1) === 3) out[i] = out[i].slice(0, -1) + '2'
  }
  for (let i = 0; i < out.length - 1; i++) {
    const next = Number(syl[i + 1].slice(-1))
    if (syl[i] === 'bu4' && next === 4) out[i] = 'bu2'
    const ordinal = i > 0 && ['di4', 'shi2'].includes(syl[i - 1]) // 第一, 十一: 一 keeps yi1
    if (syl[i] === 'yi1' && !ordinal && next === 4) out[i] = 'yi2'
    else if (syl[i] === 'yi1' && !ordinal && [1, 2, 3].includes(next)) out[i] = 'yi4'
  }
  return out
}

export { keySyllable }
