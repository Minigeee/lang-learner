// The pinned CC-CEDICT and the zh pack's itemKey(). Node only.
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'

export interface LexEntry {
  trad: string
  simp: string
  /** As written in CC-CEDICT, such as "na3 r5", "Bei3 jing1" or "lu:4". */
  pinyin: string
  glosses: string[]
}

export interface Lexicon {
  bySimp: Map<string, LexEntry[]>
  /** The longest headword, in code points. */
  maxLen: number
  /** Traditional single characters to simplified, for characters that aren't simplified headwords. */
  toSimplified: Map<string, string>
}

const DATA = new URL('./data/cedict.txt.gz', import.meta.url)
const LINE = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/\s*$/

export function loadCedict(): Lexicon {
  const bySimp = new Map<string, LexEntry[]>()
  const toSimplified = new Map<string, string>()
  let maxLen = 1
  for (const raw of gunzipSync(readFileSync(DATA)).toString('utf8').split('\n')) {
    const m = raw.startsWith('#') ? null : LINE.exec(raw)
    if (!m) continue
    const [, trad = '', simpRaw = '', pinyin = '', glosses = ''] = m
    const simp = simpRaw.normalize('NFC')
    const entry = { trad, simp, pinyin, glosses: glosses.split('/') }
    bySimp.set(simp, [...(bySimp.get(simp) ?? []), entry])
    maxLen = Math.max(maxLen, [...simp].length)
    if ([...trad].length === 1 && trad !== simp) toSimplified.set(trad, simp)
  }
  for (const ch of toSimplified.keys()) if (bySimp.has(ch)) toSimplified.delete(ch)
  return { bySimp, maxLen, toSimplified }
}

/** One CC-CEDICT syllable as a key syllable ("lu:4" becomes "lv4"), or null if it isn't toned pinyin. */
function keySyllable(s: string): string | null {
  const k = s.toLowerCase().replace(/u:/g, 'v').replace(/ü/g, 'v')
  return /^[a-z]+[1-5]$/.test(k) ? k : null
}

/**
 * `<simplified>:<reading>`, the reading being toned syllables with no separator, lowercased, ü as v.
 * Null for entries whose reading isn't plain toned pinyin: those can't be word items. The key is
 * many-to-one: a word item bundles every entry that shares it.
 */
export function itemKey(e: Pick<LexEntry, 'simp' | 'pinyin'>): string | null {
  const syllables = e.pinyin.trim().split(/\s+/).map(keySyllable)
  return syllables.some((s) => s === null) ? null : `${e.simp}:${syllables.join('')}`
}

/** Splits a reading key into syllables: "na3r5" gives ["na3", "r5"]. */
export function syllables(reading: string): string[] {
  return reading.match(/[a-zv]+[1-5]/g) ?? []
}
