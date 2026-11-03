// Pilot clip catalog. Every clip uses the placeholder synth until real native recordings
// (spike A's output) are mapped in through `src`.
import type { Clip, ClipId, Speaker } from '../core/types'

export const SPEAKERS: Record<string, Speaker> = {
  v1: { id: 'v1', label: 'Voice 1', basePitch: 215 },
  v2: { id: 'v2', label: 'Voice 2', basePitch: 118 },
  v3: { id: 'v3', label: 'Voice 3', basePitch: 248 },
  v4: { id: 'v4', label: 'Voice 4', basePitch: 138 },
}
export const VOICES = Object.keys(SPEAKERS)

const catalog = new Map<ClipId, Clip>()

export function clip(id: ClipId): Clip {
  const c = catalog.get(id)
  if (!c) throw new Error(`Unknown clip ${id}`)
  return c
}

/** Tone numbers from tone-marked pinyin, one per syllable (neutral = 5). */
export function tonesOf(pinyin: string): number[] {
  const marks: Record<string, number> = { 'ā': 1, 'ē': 1, 'ī': 1, 'ō': 1, 'ū': 1, 'ǖ': 1, 'á': 2, 'é': 2, 'í': 2, 'ó': 2, 'ú': 2, 'ǘ': 2, 'ǎ': 3, 'ě': 3, 'ǐ': 3, 'ǒ': 3, 'ǔ': 3, 'ǚ': 3, 'à': 4, 'è': 4, 'ì': 4, 'ò': 4, 'ù': 4, 'ǜ': 4 }
  return pinyin
    .toLowerCase()
    .replace(/[^a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((syl) => [...syl].map((ch) => marks[ch]).find(Boolean) ?? 5)
}

function add(c: Clip): ClipId {
  catalog.set(c.id, c)
  return c.id
}

/** One syllable recorded by every voice. Returns clip ids in voice order. */
export function syllable(key: string, hanzi: string, pinyin: string, gloss: string): ClipId[] {
  const tone = tonesOf(pinyin)[0] as 1 | 2 | 3 | 4 | 5
  return VOICES.map((v) => add({ id: `${key}-${v}`, text: hanzi, pinyin, gloss, speaker: v, synth: { kind: 'syllable', tone } }))
}

/** One sentence recorded by every voice. Returns clip ids in voice order. */
export function sentence(key: string, text: string, pinyin: string, gloss: string, tokens?: string[]): ClipId[] {
  return VOICES.map((v) => add({ id: `${key}-${v}`, text, pinyin, gloss, tokens, speaker: v, synth: { kind: 'phrase', tones: tonesOf(pinyin) } }))
}
