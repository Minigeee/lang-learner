import type { ItemId } from '@lang-learner/core'
import { describe, expect, it } from 'vitest'
import { pack } from '../index.ts'

const surfaces = (line: string) => pack.analyze(line).map((t) => t.s)

describe('analyze', () => {
  it('covers the line exactly, in order', () => {
    const line = '我是学生，你呢？'
    expect(surfaces(line).join('')).toBe(line)
  })

  it('stores citation readings, never sandhi', () => {
    expect(pack.analyze('你好')[0]).toEqual({ s: '你好', r: 'ni3hao3', id: 'zh:w:你好:ni3hao3' })
    expect(pack.analyze('不是').map((t) => t.r).join('')).toBe('bu4shi4')
  })

  it('reads a particle as a particle', () => {
    expect(pack.analyze('我吃了').at(-1)).toMatchObject({ s: '了', r: 'le5' })
  })

  it('never mints an id, and marks only words with a reading', () => {
    const tokens = pack.analyze('A，我')
    expect(tokens[0]).toEqual({ s: 'A' })
    expect(tokens[1]).toEqual({ s: '，' })
    for (const t of pack.analyze('我是学生')) if (t.id) expect(pack.wordExists(t.id)).toBe(true)
  })
})

describe('the dictionary', () => {
  it('knows word ids and their senses', () => {
    expect(pack.wordIds('行')).toContain('zh:w:行:xing2')
    expect(pack.wordExists('zh:w:学生:xue2sheng5')).toBe(true)
    expect(pack.wordExists('zh:w:学生:xue2sheng1')).toBe(false)
    expect(pack.dictionarySenses('zh:w:学生:xue2sheng5')).toContain('student')
  })

  it('splits a word id into a token', () => {
    expect(pack.wordToken('zh:w:哪儿:na3r5' as ItemId)).toEqual({ s: '哪儿', r: 'na3r5', id: 'zh:w:哪儿:na3r5' })
  })

  it('folds traditional characters, leaving simplified ones alone', () => {
    expect(pack.simplify('學生們')).toBe('学生们')
    expect(pack.simplify('后面')).toBe('后面')
  })

  it('rejects a word key with no reading', () => {
    expect(pack.wordKeyError('学生:xue2sheng5')).toBeNull()
    expect(pack.wordKeyError('学生')).toContain('tone digit')
  })
})
