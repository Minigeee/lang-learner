// CC-CEDICT loader and the zh pack's itemKey(). Build-time only (Node).
// Data: data/cedict/cedict.txt from MDBG (CC BY-SA 4.0), not committed.
import { readFileSync, existsSync } from 'node:fs'

export interface LexEntry {
  trad: string
  simp: string
  pinyin: string // as written in CC-CEDICT, e.g. "na3 r5", "Bei3 jing1", "lu:4"
  glosses: string[]
  line: number
}

export interface Lexicon {
  entries: LexEntry[]
  bySimp: Map<string, LexEntry[]>
  maxLen: number // longest headword, in code points
}

export const CEDICT_PATH = new URL('../../data/cedict/cedict.txt', import.meta.url)

const LINE = /^(\S+) (\S+) \[([^\]]*)\] \/(.*)\/\s*$/

export function loadCedict(path: URL | string = CEDICT_PATH): Lexicon {
  if (!existsSync(path)) throw new Error(`CC-CEDICT not found at ${path}. Download it into data/cedict/ (see FINDINGS.md).`)
  const entries: LexEntry[] = []
  const bySimp = new Map<string, LexEntry[]>()
  let maxLen = 1
  const lines = readFileSync(path, 'utf8').split('\n')
  lines.forEach((raw, i) => {
    if (raw.startsWith('#') || !raw.trim()) return
    const m = LINE.exec(raw)
    if (!m) return
    const e: LexEntry = { trad: m[1], simp: m[2].normalize('NFC'), pinyin: m[3], glosses: m[4].split('/'), line: i + 1 }
    entries.push(e)
    const list = bySimp.get(e.simp) ?? []
    list.push(e)
    bySimp.set(e.simp, list)
    maxLen = Math.max(maxLen, [...e.simp].length)
  })
  return { entries, bySimp, maxLen }
}

/** One CC-CEDICT syllable → key syllable ("lu:4" → "lv4", "Bei3" → "bei3"), or null if it isn't toned pinyin. */
export function keySyllable(s: string): string | null {
  const k = s.toLowerCase().replace(/u:/g, 'v').replace(/ü/g, 'v')
  return /^[a-z]+[1-5]$/.test(k) ? k : null
}

/**
 * The zh pack's itemKey(): `<simplified>:<reading>`, the reading being toned syllables joined with no
 * separator, lowercased, ü as v. Returns null for entries whose reading isn't plain toned pinyin
 * (letters, "xx5", punctuation): those entries can't be word items.
 */
export function itemKey(e: Pick<LexEntry, 'simp' | 'pinyin'>): string | null {
  const syl = e.pinyin.trim().split(/\s+/).map(keySyllable)
  if (syl.some((s) => s === null)) return null
  return `${e.simp}:${syl.join('')}`
}

/** Split a reading key back into syllables: "na3r5" → ["na3", "r5"]. */
export function syllables(reading: string): string[] {
  return reading.match(/[a-zv]+[1-5]/g) ?? []
}
