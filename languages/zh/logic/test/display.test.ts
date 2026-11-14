import { describe, expect, it } from 'vitest'
import { rubySegments, toneMarks, tonesOf } from '../index.ts'

describe('toneMarks', () => {
  it('places the mark by the standard rule', () => {
    expect(toneMarks('xue2sheng5')).toBe('xuésheng')
    expect(toneMarks('hao3')).toBe('hǎo')
    expect(toneMarks('gou3')).toBe('gǒu')
    expect(toneMarks('liu4')).toBe('liù')
    expect(toneMarks('gui4')).toBe('guì')
    expect(toneMarks('lv4')).toBe('lǜ')
    expect(toneMarks('Wang2')).toBe('Wáng')
    expect(toneMarks('er2')).toBe('ér')
  })

  it('keeps text with no tone digits', () => {
    expect(toneMarks('1+2')).toBe('1+2')
    expect(toneMarks('ma')).toBe('ma')
  })

  it('reads the tones of a numbered reading', () => {
    expect(tonesOf('ni3hao3')).toEqual([3, 3])
    expect(tonesOf('ma5')).toEqual([5])
  })
})

describe('rubySegments', () => {
  it('puts each syllable over its character', () => {
    expect(rubySegments({ s: '老师', r: 'lao3shi1' })).toEqual([{ s: '老', r: 'lǎo' }, { s: '师', r: 'shī' }])
    expect(rubySegments({ s: '名字', r: 'ming2zi5' })).toEqual([{ s: '名', r: 'míng' }, { s: '字', r: 'zi' }])
  })

  it('keeps a reading whole when it does not pair off, and gives punctuation none', () => {
    expect(rubySegments({ s: '哪儿', r: 'nar3' })).toEqual([{ s: '哪儿', r: 'nǎr' }])
    expect(rubySegments({ s: '，' })).toEqual([{ s: '，', r: '' }])
  })
})
