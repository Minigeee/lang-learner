import type { LanguagePack, Token } from '@lang-learner/core'

const MARKS: Record<string, string> = {
  a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ',
  A: 'ĀÁǍÀ', E: 'ĒÉĚÈ', I: 'ĪÍǏÌ', O: 'ŌÓǑÒ', U: 'ŪÚǓÙ', Ü: 'ǕǗǙǛ',
}

/** One numbered syllable (`hao3`, `lv4`, `ma5`) in tone marks. Tone 5 is neutral and gets none. */
function markSyllable(letters: string, tone: number): string {
  const s = letters.replace(/v/g, 'ü').replace(/V/g, 'Ü')
  if (tone < 1 || tone > 4) return s
  // The standard placement: a or e takes the mark, then the o of ou, else the last vowel.
  const lower = s.toLowerCase()
  let at = lower.search(/[ae]/)
  if (at < 0) at = lower.indexOf('ou')
  if (at < 0) at = Math.max(...[...'iouü'].map((v) => lower.lastIndexOf(v)))
  if (at < 0) return s
  const ch = s[at]!
  return s.slice(0, at) + MARKS[ch]![tone - 1] + s.slice(at + 1)
}

/** Numbered pinyin (`xue2sheng5`) as tone-marked pinyin (`xuésheng`). Text with no tone digits is kept. */
export function toneMarks(reading: string): string {
  return reading.replace(/([a-zA-ZüÜvV]+)([1-5])/g, (_m, letters: string, tone: string) => markSyllable(letters, Number(tone)))
}

/** The tone digits of a numbered reading, in order: `ni3hao3` gives [3, 3]. */
export function tonesOf(reading: string): number[] {
  return [...reading.matchAll(/[a-zA-ZüÜvV]+([1-5])/g)].map((m) => Number(m[1]))
}

/**
 * A word's characters, each under its own syllable in tone marks. A reading whose syllables don't
 * pair off with the characters (such as an erhua or a Latin letter) stays whole over the word.
 */
export function rubySegments(token: Token): { s: string; r: string }[] {
  const chars = [...token.s]
  const syllables = [...(token.r ?? '').matchAll(/[a-zA-ZüÜvV]+[1-5]/g)].map((m) => m[0])
  if (syllables.length !== chars.length) return [{ s: token.s, r: token.r ? toneMarks(token.r) : '' }]
  return chars.map((s, i) => ({ s, r: toneMarks(syllables[i]!) }))
}

export const zh: LanguagePack = {
  code: 'zh',
  name: 'Mandarin',
  normalize: (s) => s,
  itemKinds: ['c', 'cmp'],
  // Citation tones: display-time sandhi (architecture §6) comes with the lessons that teach it.
  displayReading: toneMarks,
  rubySegments,
}
