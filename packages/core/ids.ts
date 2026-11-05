import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'

export type Lang = string
export type ItemId = `${Lang}:${string}:${string}`
export type LessonId = `${Lang}:les:${string}`
export type CardId = `card:${string}`
export type MediaId = `media:${string}`

export const CORE_ITEM_KINDS = ['w', 'g', 'sc', 'sr', 'v', 'l'] as const
const STRUCTURE_KINDS = ['les', 'unit', 'stage'] as const
const GLOBAL_KINDS: readonly string[] = ['media', 'clip', 'spk', 'lic', 'card']
/** Kinds whose keys are slugs. Lexical keys (`w` and pack kinds) belong to the language pack. */
const SLUG_KINDS: readonly string[] = ['g', 'sc', 'sr', 'v', 'l', ...STRUCTURE_KINDS]

const LANG = /^[a-z]{2,3}$/
const SLUG = /^[a-z0-9][a-z0-9-]*$/

export interface ParsedId {
  id: string
  lang?: Lang
  kind: string
  key: string
}

export type IdResult = { ok: true; value: ParsedId } | { ok: false; error: string }

/**
 * Builds the id parser for a pack's kinds: `<lang>:<kind>:<key>`, or `<kind>:<key>` for global ids.
 * An id must already be NFC. A non-NFC id is an error, never silently normalized, so that a search
 * over the repo finds every use of an id.
 */
export function createIdParser(packKinds: readonly string[]): (id: string) => IdResult {
  const langKinds: readonly string[] = [...CORE_ITEM_KINDS, ...STRUCTURE_KINDS, ...packKinds]
  return (id) => {
    if (id !== id.normalize('NFC')) return { ok: false, error: `id "${id}" is not NFC (${nonNfcCodePoints(id)}); retype it` }
    const [head = '', second = '', ...rest] = id.split(':')
    if (GLOBAL_KINDS.includes(head)) {
      const key = [second, ...rest].join(':')
      return SLUG.test(key) ? { ok: true, value: { id, kind: head, key } } : { ok: false, error: `"${key}" in "${id}" must be a lowercase slug` }
    }
    if (!LANG.test(head) || rest.length === 0) return { ok: false, error: `"${id}" is not an id (<lang>:<kind>:<key> or <kind>:<key>)` }
    if (!langKinds.includes(second)) return { ok: false, error: `unknown id kind "${second}" in "${id}"` }
    const key = rest.join(':')
    if (key === '' || /\s/.test(key)) return { ok: false, error: `"${id}" has an empty or spaced key` }
    if (SLUG_KINDS.includes(second) && !SLUG.test(key)) return { ok: false, error: `"${key}" in "${id}" must be a lowercase slug` }
    return { ok: true, value: { id, lang: head, kind: second, key } }
  }
}

function nonNfcCodePoints(id: string): string {
  const hex = (ch: string) => `U+${ch.codePointAt(0)!.toString(16).toUpperCase()}`
  return [...id].filter((ch) => /\p{M}/u.test(ch) || ch !== ch.normalize('NFC')).map(hex).join(', ')
}

/** A uuid v7 for an event. Uses getRandomValues, which also works outside a secure context. */
export function newEventId(nowMs: number): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  for (let i = 0; i < 6; i++) b[i] = Math.floor(nowMs / 2 ** (8 * (5 - i))) % 256
  b[6] = (b[6]! & 0x0f) | 0x70
  b[8] = (b[8]! & 0x3f) | 0x80
  return uuidString(b)
}

/**
 * A uuid derived from its parts: the first 16 bytes of SHA-256 over the parts joined by U+0000, with
 * the uuid v8 version and variant bits set. Two devices derive the same id for the same fact.
 * Frozen: card ids and FSRS fuzz will depend on this output, so changing it orphans history.
 */
export function deterministicUuid(...parts: string[]): string {
  const b = sha256(utf8ToBytes(parts.join('\u0000'))).slice(0, 16)
  b[6] = (b[6]! & 0x0f) | 0x80
  b[8] = (b[8]! & 0x3f) | 0x80
  return uuidString(b)
}

function uuidString(b: Uint8Array): string {
  const h = bytesToHex(b)
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
