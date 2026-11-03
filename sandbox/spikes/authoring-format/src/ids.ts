// The id grammar (architecture §6 "Ids"). parseId() is the only place that knows it.
//
// Language-scoped ids: <lang>:<kind>:<key>   zh:w:行:hang2 · zh:g:le-completion · zh:les:bu-vs-mei
// Global ids:          <kind>:<key>          media:… · clip:… · spk:… · lic:…
//
// Contract: an authored id must already be NFC. parseId() reports a non-NFC id as an error
// instead of silently normalizing it, so a grep over the repo finds every use of an id.

export const LANG_KINDS = ['w', 'g', 'c', 'cmp', 'sc', 'sr', 'les', 'unit', 'stage'] as const
export const GLOBAL_KINDS = ['media', 'clip', 'spk', 'lic'] as const
export const ITEM_KINDS = ['w', 'g', 'c', 'cmp', 'sc', 'sr'] as const
export const LANGS = ['zh'] as const

export type LangKind = (typeof LANG_KINDS)[number]
export type GlobalKind = (typeof GLOBAL_KINDS)[number]
export type Kind = LangKind | GlobalKind

export interface ParsedId {
  id: string
  lang?: string
  kind: Kind
  key: string
}

export type IdResult = { ok: true; value: ParsedId } | { ok: false; error: string }

const SLUG = /^[a-z0-9][a-z0-9-]*$/
// A word key is <lemma>:<reading>; the reading grammar belongs to the language pack (itemKey).
const WORD_KEY = /^[^:\s]+:[a-z]+[1-5](?:[a-z]+[1-5])*$/

export function parseId(raw: string, expect?: readonly Kind[]): IdResult {
  if (raw !== raw.normalize('NFC')) {
    const bad = [...raw].filter((ch) => ch !== ch.normalize('NFC'))
    const cps = bad.map((ch) => `U+${ch.codePointAt(0)!.toString(16).toUpperCase()} → U+${ch.normalize('NFC').codePointAt(0)!.toString(16).toUpperCase()}`)
    return { ok: false, error: `id "${raw}" is not NFC-normalized (${cps.join(', ')}; it looks identical but won't match). Retype it` }
  }
  const parts = raw.split(':')
  let parsed: ParsedId | undefined
  if ((LANGS as readonly string[]).includes(parts[0]) && parts.length >= 3) {
    const kind = parts[1] as LangKind
    if (!(LANG_KINDS as readonly string[]).includes(kind)) return { ok: false, error: `unknown id kind "${parts[1]}" in "${raw}"` }
    const key = parts.slice(2).join(':')
    if (kind === 'w' && !WORD_KEY.test(key)) {
      return { ok: false, error: `word id "${raw}" must be <lang>:w:<lemma>:<pinyin with a tone digit 1–5 after each syllable, ü as v>` }
    }
    if (kind === 'c' && [...key].length !== 1) return { ok: false, error: `character id "${raw}" must hold exactly one character` }
    if (!['w', 'c', 'cmp'].includes(kind) && !SLUG.test(key)) return { ok: false, error: `"${key}" in "${raw}" must be a lowercase slug` }
    parsed = { id: raw, lang: parts[0], kind, key }
  } else if ((GLOBAL_KINDS as readonly string[]).includes(parts[0]) && parts.length === 2) {
    if (!SLUG.test(parts[1])) return { ok: false, error: `"${parts[1]}" in "${raw}" must be a lowercase slug` }
    parsed = { id: raw, kind: parts[0] as GlobalKind, key: parts[1] }
  } else if ((LANG_KINDS as readonly string[]).includes(parts[0])) {
    return { ok: false, error: `id "${raw}" is missing its language prefix (e.g. "zh:${raw}")` }
  } else {
    return { ok: false, error: `"${raw}" is not an id (<lang>:<kind>:<key> or <kind>:<key>)` }
  }
  if (expect && !expect.includes(parsed.kind)) {
    return { ok: false, error: `"${raw}" is a ${parsed.kind} id; expected ${expect.join(' or ')}` }
  }
  return { ok: true, value: parsed }
}

export function isItemKind(k: Kind): boolean {
  return (ITEM_KINDS as readonly string[]).includes(k)
}
