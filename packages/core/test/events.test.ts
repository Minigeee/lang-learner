import { describe, expect, it } from 'vitest'
import { validateEvent, type EventEnvelope } from '../index.ts'

const base: EventEnvelope = {
  id: 'e1', kind: 'flag', v: 1, lang: null, occurredAt: 1000, deviceId: 'd', deviceSeq: 1, build: 'b', payload: { note: 'n' },
}
const ref = { lessonId: 'xx:les:order', lessonHash: 'h', run: 'r' }

describe('validateEvent', () => {
  it('accepts every kind the app records', () => {
    const payloads: [string, unknown][] = [
      ['device', { reason: 'hello' }],
      ['flag', { note: 'n', target: 'xx:les:order@h#2' }],
      ['lesson_cursor', { ...ref, step: 2 }],
      ['lesson_cursor', { ...ref, step: 'done' }],
      ['trial', { ...ref, step: 3, key: '1', attempt: 1, itemId: 'xx:g:order', widget: 'pick@1', mode: 'checkpoint', correct: false, recycled: false }],
      ['exposure', { type: 'clip', clipId: 'clip:a', speaker: 'spk:a', lessonId: 'xx:les:order' }],
      ['exposure', { type: 'video', youtubeId: 'abc', role: 'supplemental', durationSec: 95, lessonId: null, via: 'marked' }],
      ['device', { reason: 'day' }],
      ['setting', { key: 'studyTz', value: 'America/Chicago' }],
      ['setting', { key: 'dayStartHour', value: 4 }],
      ['card_added', { cardId: 'card:a', itemId: 'xx:w:a', template: 'vocab', via: 'lesson', lessonId: 'xx:les:order' }],
      ['card_added', { cardId: 'card:a', itemId: 'xx:w:a', template: 'vocab', via: 'queue', lessonId: null }],
      ['review', { cardId: 'card:a', rating: 3, durationMs: 8000, dueAt: 5000, prevReviewId: null }],
      ['day_closed', { date: '2026-11-02', xp: 12, credit: 'floor', rules: { xp: 'v1' }, minutes: 12.25, basis: 'settled' }],
      ['setting', { key: 'supportLocale', value: 'zh-Hans' }],
      ['setting', { key: 'reviewBudgetMin', value: 15 }],
      ['setting', { key: 'intention', value: 'After I get into bed' }],
      ['setting', { key: 'setupDone', value: true }],
      ['claim', { scope: 'lesson', id: 'xx:les:order', as: 'done' }],
      ['claim', { scope: 'stage', id: 'S0', as: 'known' }],
      ['claim', { scope: 'unit', id: '1.4', as: 'none' }],
      ['watch', { title: 'Word Party', minutes: 12, date: '2026-11-02', subtitles: 'en', attention: 'straight', followed: 'some' }],
      ['watch', { title: 'Word Party', episode: 'S1 E4', minutes: 12, date: '2026-11-02', subtitles: 'zh', attention: 'half', followed: 'little' }],
    ]
    for (const [kind, payload] of payloads) expect(validateEvent({ ...base, kind, payload }), kind).toBeNull()
  })

  it('names what is wrong', () => {
    expect(validateEvent(null)).toMatch(/object/)
    expect(validateEvent({ ...base, occurredAt: 1.5 })).toMatch(/occurredAt/)
    expect(validateEvent({ ...base, kind: 'nope' })).toMatch(/kind/)
    expect(validateEvent({ ...base, v: 2 })).toMatch(/v must/)
    expect(validateEvent({ ...base, payload: { note: '' } })).toMatch(/payload: note/)
    expect(validateEvent({ ...base, kind: 'lesson_cursor', payload: { ...ref, step: 'later' } })).toMatch(/step/)
    expect(validateEvent({ ...base, kind: 'trial', payload: { ...ref, step: 3, key: '1', attempt: 1, itemId: 'xx:g:order', widget: 'pick', mode: 'lesson', correct: true, recycled: false } })).toMatch(/widget/)
    expect(validateEvent({ ...base, kind: 'exposure', payload: { type: 'video', youtubeId: 'a', role: 'main', durationSec: 1, lessonId: null } })).toMatch(/via/)
    expect(validateEvent({ ...base, kind: 'setting', payload: { key: 'studyTz', value: 'Mars/Olympus' } })).toMatch(/time zone/)
    expect(validateEvent({ ...base, kind: 'setting', payload: { key: 'theme', value: 'dark' } })).toMatch(/key/)
    expect(validateEvent({ ...base, kind: 'card_added', payload: { cardId: 'card:a', itemId: 'xx:w:a', template: 'vocab', via: 'queue', lessonId: 'xx:les:order' } })).toMatch(/lessonId/)
    expect(validateEvent({ ...base, kind: 'review', payload: { cardId: 'card:a', rating: 5, durationMs: 1, dueAt: 1, prevReviewId: null } })).toMatch(/rating/)
    expect(validateEvent({ ...base, kind: 'setting', payload: { key: 'reviewBudgetMin', value: 2 } })).toMatch(/5 to 60/)
    expect(validateEvent({ ...base, kind: 'setting', payload: { key: 'setupDone', value: false } })).toMatch(/value/)
    expect(validateEvent({ ...base, kind: 'claim', payload: { scope: 'lesson', id: '1.4', as: 'known' } })).toMatch(/lesson id/)
    expect(validateEvent({ ...base, kind: 'claim', payload: { scope: 'unit', id: '1.4', as: 'maybe' } })).toMatch(/as must/)
    expect(validateEvent({ ...base, kind: 'claim', payload: { scope: 'topic', id: 'x', as: 'known' } })).toMatch(/scope/)
    expect(validateEvent({ ...base, kind: 'watch', payload: { title: 'W', minutes: 0, date: '2026-11-02', subtitles: 'en', attention: 'straight', followed: 'some' } })).toMatch(/minutes/)
    expect(validateEvent({ ...base, kind: 'watch', payload: { title: 'W', minutes: 5, date: 'yesterday', subtitles: 'en', attention: 'straight', followed: 'some' } })).toMatch(/date/)
    expect(validateEvent({ ...base, kind: 'day_closed', payload: { date: '2026-11-02', xp: 1, credit: 'none', rules: {}, minutes: 1.234, basis: 'grace' } })).toMatch(/minutes/)
  })
})
