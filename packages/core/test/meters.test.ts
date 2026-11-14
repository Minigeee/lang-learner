import { describe, expect, it } from 'vitest'
import { inputHours, settingsOf, type EventDraft, type EventEnvelope } from '../index.ts'

let n = 0
const env = (draft: EventDraft, at = ++n): EventEnvelope =>
  ({ ...draft, id: `e${++n}`, lang: null, occurredAt: at, deviceId: 'd', deviceSeq: n, build: 'b' }) as EventEnvelope
const watch = (minutes: number, subtitles: 'none' | 'zh' | 'dual' | 'en') =>
  env({ kind: 'watch', v: 1, payload: { title: 'S', minutes, date: '2026-11-02', subtitles, attention: 'straight', followed: 'most' } })

describe('input hours', () => {
  it('weighs English subtitles at half, counts videos in full, and names the next mark', () => {
    const video = env({ kind: 'exposure', v: 1, payload: { type: 'video', youtubeId: 'y', role: 'main', durationSec: 1800, lessonId: 'xx:les:a', via: 'played' } })
    expect(inputHours([watch(60, 'zh'), watch(60, 'en'), video])).toEqual({ hours: 2, nextMark: 50 })
    expect(inputHours([watch(1440, 'none'), watch(1440, 'none'), watch(1440, 'none')])).toEqual({ hours: 72, nextMark: 150 })
    expect(inputHours([])).toEqual({ hours: 0, nextMark: 50 })
  })
})

describe('settings', () => {
  it('takes the latest of each key over the defaults', () => {
    const s = settingsOf([
      env({ kind: 'setting', v: 1, payload: { key: 'reviewBudgetMin', value: 20 } }, 5),
      env({ kind: 'setting', v: 1, payload: { key: 'reviewBudgetMin', value: 15 } }, 9),
      env({ kind: 'setting', v: 1, payload: { key: 'setupDone', value: true } }, 7),
    ])
    expect(s).toMatchObject({ reviewBudgetMin: 15, setupDone: true, supportLocale: 'en', intention: '', clock: { tz: 'UTC', dayStartHour: 4 } })
    expect(settingsOf([]).reviewBudgetMin).toBe(10)
  })
})
