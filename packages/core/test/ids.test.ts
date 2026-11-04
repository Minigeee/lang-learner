import { describe, expect, it } from 'vitest'
import { toy } from '@lang-learner/lang-_toy'
import { createIdParser, deterministicUuid, newEventId, type LanguagePack } from '../index.ts'

const pack: LanguagePack = toy
const parse = createIdParser(pack.itemKinds)

describe('id grammar', () => {
  it('parses language-scoped, pack-kind and global ids', () => {
    expect(parse('xx:g:word-order')).toEqual({ ok: true, value: { id: 'xx:g:word-order', lang: 'xx', kind: 'g', key: 'word-order' } })
    expect(parse('xx:glyph:a:b')).toMatchObject({ ok: true, value: { kind: 'glyph', key: 'a:b' } })
    expect(parse('media:clip-1')).toEqual({ ok: true, value: { id: 'media:clip-1', kind: 'media', key: 'clip-1' } })
  })

  it('rejects ids outside the grammar', () => {
    for (const bad of ['xx:nope:key', 'xx:g:Not-A-Slug', 'xx:w: spaced', 'xx:g', 'nonsense', 'media:Bad Slug']) {
      expect(parse(bad).ok, bad).toBe(false)
    }
  })

  it('rejects a non-NFC id rather than normalizing it, and names the code points', () => {
    const result = parse('xx:w:é')
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('U+')
  })
})

describe('event ids', () => {
  it('makes a well-formed uuid v7 that starts with the timestamp', () => {
    const id = newEventId(0x0123456789ab)
    expect(id).toMatch(/^01234567-89ab-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('never repeats', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newEventId(1)))
    expect(ids.size).toBe(1000)
  })
})

describe('deterministicUuid', () => {
  // Golden vectors. These outputs are frozen: changing one orphans every card built on it.
  it.each([
    [['a'], 'ca978112-ca1b-8dca-bac2-31b39a23dc4d'],
    [['device-hello', 'phone'], '9128b7bc-6569-8852-93d3-19ddfd4f3f12'],
    [['xx:w:word', 'recognition'], '2caedc0e-57df-85d1-bc03-fdaee082f321'],
  ])('%j', (parts, expected) => {
    expect(deterministicUuid(...parts)).toBe(expected)
  })

  it('keeps part boundaries apart', () => {
    expect(deterministicUuid('ab', 'c')).not.toBe(deterministicUuid('a', 'bc'))
  })
})
