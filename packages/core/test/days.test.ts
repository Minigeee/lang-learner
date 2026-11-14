import { describe, expect, it } from 'vitest'
import {
  buildSession, cardAdded, cardIdOf, closableDays, createEventLog, dayBounds, deriveDays, planFeed, studyClockOf, studyDate, syncAndClose,
  type CurriculumStage, type DayQueue, type EventDraft, type EventEnvelope, type FeedEntry, type ItemId, type LessonCredit, type LessonId, type Remote,
} from '../index.ts'
import { MemoryStore } from '../testing.ts'

const H = 3_600_000
const NY = { tz: 'America/New_York', dayStartHour: 4 }

let n = 0
const env = (draft: EventDraft, at: number, deviceId = 'phone', id = `e${++n}`): EventEnvelope =>
  ({ ...draft, id, lang: null, occurredAt: at, deviceId, deviceSeq: n, build: 'b' }) as EventEnvelope
const lesson = 'xx:les:a' as LessonId
const credit: LessonCredit = (id) => (id === lesson ? { estimateSec: 600, steps: 4 } : undefined)
const cursor = (run: string, step: number | 'done', at: number, deviceId = 'phone') =>
  env({ kind: 'lesson_cursor', v: 1, payload: { lessonId: lesson, lessonHash: 'h', run, step } }, at, deviceId)
const video = (sec: number, at: number, deviceId = 'phone') =>
  env({ kind: 'exposure', v: 1, payload: { type: 'video', youtubeId: 'y', role: 'supplemental', durationSec: sec, lessonId: null, via: 'played' } }, at, deviceId)
const tz = (value: string, at = 0) => env({ kind: 'setting', v: 1, payload: { key: 'studyTz', value } }, at)

describe('the study clock', () => {
  it('counts days in the synced zone from the start hour, across a DST change', () => {
    // 2026-03-08 is the US spring-forward day: 04:00 local is 08:00 UTC that day, but 09:00 the day before.
    expect(studyDate(Date.UTC(2026, 2, 8, 7, 59), NY)).toBe('2026-03-07')
    expect(studyDate(Date.UTC(2026, 2, 8, 8, 0), NY)).toBe('2026-03-08')
    expect(dayBounds('2026-03-07', NY)).toEqual({ start: Date.UTC(2026, 2, 7, 9), end: Date.UTC(2026, 2, 8, 8) })
  })

  it('takes the latest setting of each key', () => {
    expect(studyClockOf([tz('Asia/Tokyo', 5), tz('Europe/Paris', 9), tz('UTC', 7)]).tz).toBe('Europe/Paris')
    expect(studyClockOf([])).toEqual({ tz: 'UTC', dayStartHour: 4 })
  })
})

describe('minutes and credit', () => {
  const T = Date.UTC(2026, 10, 2, 12)
  it('credit a lesson step once per run, a review by template, a first look, and a video outside a lesson', () => {
    const skill = cardIdOf('xx:g:a' as ItemId, 'skill')
    const events = [
      cursor('r1', 0, T), cursor('r1', 1, T + 1), cursor('r1', 1, T + 2), cursor('r1', 'done', T + 3),
      env(cardAdded({ item: 'xx:g:a' as ItemId, template: 'skill', via: 'lesson', lesson }).draft, T + 4),
      env({ kind: 'review', v: 1, payload: { cardId: skill, rating: 3, durationMs: 999_000, dueAt: T, prevReviewId: null } }, T + 5),
      env(cardAdded({ item: 'xx:w:b' as ItemId, template: 'vocab', via: 'queue' }).draft, T + 6),
      video(95, T + 7),
    ]
    // 2 steps of 150 s, one skill review at 20 s (not its logged 999 s), a 20 s first look, 95 s of video.
    expect(deriveDays(events, credit).today(T)).toEqual({ date: '2026-11-02', minutes: 7.25, xp: 7, credit: 'none', closed: false })
  })

  it('names the floor, standard and stretch by minutes, and a closed day keeps its frozen numbers', () => {
    expect(deriveDays([video(8 * 60, T)], credit).today(T).credit).toBe('floor')
    expect(deriveDays([video(15 * 60, T)], credit).today(T).credit).toBe('standard')
    expect(deriveDays([video(30 * 60, T)], credit).today(T).credit).toBe('stretch')
    const frozen = env({ kind: 'day_closed', v: 1, payload: { date: '2026-11-02', xp: 3, credit: 'none', rules: {}, minutes: 3.5, basis: 'settled' } }, T + 99)
    expect(deriveDays([video(30 * 60, T), frozen], credit).day('2026-11-02')).toMatchObject({ minutes: 3.5, credit: 'none', closed: true })
  })
})

describe('watch logs, the split and recent days', () => {
  const T = Date.UTC(2026, 10, 2, 12)
  const watch = (minutes: number, date: string, at: number) =>
    env({ kind: 'watch', v: 1, payload: { title: 'Show', minutes, date, subtitles: 'en', attention: 'straight', followed: 'some' } }, at)

  it('counts a watch log in full on the day it names, in the watching bucket', () => {
    const days = deriveDays([cursor('r1', 0, T), watch(20, '2026-11-01', T + 1), video(60, T + 2)], credit)
    expect(days.day('2026-11-01')).toMatchObject({ minutes: 20, credit: 'standard' })
    expect(days.split('2026-11-02')).toEqual({ lessons: 2.5, cards: 0, watching: 1 })
    expect(days.split('2026-11-01')).toEqual({ lessons: 0, cards: 0, watching: 20 })
    expect(days.open()).toEqual(['2026-11-01', '2026-11-02'])
  })

  it('lists the days ending today, oldest first, studied or not', () => {
    const recent = deriveDays([watch(5, '2026-10-31', T)], credit).recent(T, 3)
    expect(recent.map((d) => [d.date, d.minutes])).toEqual([['2026-10-31', 5], ['2026-11-01', 0], ['2026-11-02', 0]])
  })
})

describe('the settled close', () => {
  const D = Date.UTC(2026, 10, 2, 12) // study day 2026-11-02 in UTC from 04:00
  const end = Date.UTC(2026, 10, 3, 4)
  const closes = (events: EventEnvelope[], now: number) => closableDays({ events, days: deriveDays(events, credit), deviceId: 'phone', now })

  it('waits for every recently active device to show it synced past the day', () => {
    const events = [video(600, D), video(60, D - 86_400_000, 'laptop')]
    expect(closes(events, end + H)).toEqual([])
    const settled = closes([...events, env({ kind: 'device', v: 1, payload: { reason: 'day' } }, end + 60_000, 'laptop')], end + H)
    expect(settled.map((c) => (c.draft.payload as { date: string }).date)).toEqual(['2026-11-01', '2026-11-02'])
    expect(settled[1]!.draft.payload).toMatchObject({ date: '2026-11-02', minutes: 10, xp: 10, credit: 'floor', basis: 'settled' })
  })

  it('closes on the grace after 72 hours, and never closes today or a day with no study', () => {
    const events = [video(600, D), video(60, D - 86_400_000, 'laptop')]
    expect(closes(events, end + 72 * H)[0]!.draft.payload).toMatchObject({ basis: 'grace' })
    expect(closes([video(600, D)], D + H)).toEqual([])
    expect(closes([env({ kind: 'device', v: 1, payload: { reason: 'hello' } }, D)], end + 80 * H)).toEqual([])
  })

  it('syncs, marks a new day once, and pushes its closes', async () => {
    const pushed: EventEnvelope[] = []
    const remote: Remote = { push: async (b) => { pushed.push(...b); return [] }, pull: async () => [] }
    let now = D
    const store = new MemoryStore('phone')
    const log = createEventLog({ store, remote, clock: () => now, build: 'b' })
    await log.hello()
    await log.record({ kind: 'exposure', v: 1, payload: { type: 'video', youtubeId: 'y', role: 'main', durationSec: 900, lessonId: null, via: 'played' } })
    now = end + H
    expect(await syncAndClose({ log, store, clock: () => now, lessons: credit })).toMatchObject({ ok: true })
    await syncAndClose({ log, store, clock: () => now, lessons: credit })
    const kinds = pushed.map((e) => (e.kind === 'device' ? `device:${(e.payload as { reason: string }).reason}` : e.kind))
    expect(kinds).toEqual(['device:hello', 'exposure', 'device:day', 'day_closed'])
  })
})

describe('the new-card feed', () => {
  const curriculum: CurriculumStage[] = [
    { id: 'S1', title: 'One', assumes: [], units: [
      { id: '1.1', title: 'a', prereqs: [], lessons: [{ id: 'xx:les:a', label: '1.1a', title: 'a', shape: 'pattern', minutes: 5, skill: null, authored: true }] },
      { id: '1.2', title: 'b', prereqs: [], lessons: [{ id: 'xx:les:b', label: '1.2a', title: 'b', shape: 'pattern', minutes: 5, skill: null, authored: true }] },
    ] },
  ]
  const w = (k: string) => `xx:w:${k}` as ItemId
  const feed: FeedEntry[] = [
    { tier: 'queue', word: 'q2', card: w('q2'), stage: 'S1', rank: 2 },
    { tier: 'queue', word: 'q1', card: w('q1'), stage: 'S1', rank: 1 },
    { tier: 'queue', word: 'q3', stage: 'S1', rank: 3 },
    { tier: 'prep', word: 'p1', card: w('p1'), during: '1.1', dueBy: '1.2' },
    { tier: 'prep', word: 'p2', card: w('p2'), during: '1.2', dueBy: '1.2' },
  ]
  const plan = (started: string[], quota: number, carded: string[] = []) =>
    planFeed({ feed, curriculum, carded: new Set(carded.map(w)), started: new Set(started as LessonId[]), quota })

  it('feeds nothing before the path reaches it', () => {
    expect(plan([], 10)).toEqual({ next: [], waiting: 0 })
  })

  it('feeds prep before the queue, the queue by rank, within the quota, and counts words with no card yet', () => {
    expect(plan(['xx:les:a'], 2)).toEqual({ next: [{ item: w('p1'), via: 'prep' }, { item: w('q1'), via: 'queue' }], waiting: 1 })
    expect(plan(['xx:les:a'], 10, ['q1', 'p1']).next.map((x) => x.item)).toEqual([w('q2')])
  })

  it('brings overdue prep in even with no quota, while the gate holds everything else', () => {
    expect(plan(['xx:les:a', 'xx:les:b'], 0).next).toEqual([{ item: w('p1'), via: 'prep' }, { item: w('p2'), via: 'prep' }])
  })
})

describe('the session builder', () => {
  const card = (k: number) => cardIdOf(`xx:w:${k}` as ItemId, 'vocab')
  const queue = (count: number, seconds = 10): DayQueue => ({ cards: Array.from({ length: count }, (_, k) => ({ id: card(k), seconds })), newQuota: 0 })
  const lessons = [
    { id: 'xx:les:done' as LessonId, estimateSec: 300, open: false, done: true },
    { id: 'xx:les:a' as LessonId, estimateSec: 360, open: false, done: false },
    { id: 'xx:les:b' as LessonId, estimateSec: 420, open: true, done: false },
    { id: 'xx:les:c' as LessonId, estimateSec: 960, open: false, done: false },
  ]
  const feed = { next: [], waiting: 0 }

  it('gives 15 minutes a capped review batch, then lessons that fit, an open one first', () => {
    const plan = buildSession({ minutes: 15, queue: queue(100), feed, lessons })
    expect(plan.blocks.map((b) => (b.kind === 'reviews' ? `reviews:${b.cards.length}` : b.lesson))).toEqual(['reviews:45', 'xx:les:b'])
  })

  it('gives 5 minutes to reviews, and a lesson only when there are none', () => {
    expect(buildSession({ minutes: 5, queue: queue(100), feed, lessons }).blocks.map((b) => b.kind)).toEqual(['reviews'])
    expect(buildSession({ minutes: 5, queue: queue(0), feed, lessons: [{ id: 'xx:les:t' as LessonId, estimateSec: 300, open: false, done: false }] }).blocks.map((b) => b.kind)).toEqual(['lesson'])
  })

  it('stops at the first lesson that does not fit, keeping path order', () => {
    const plan = buildSession({ minutes: 15, queue: queue(0), feed, lessons })
    expect(plan.blocks.map((b) => (b.kind === 'lesson' ? b.lesson : b.kind))).toEqual(['xx:les:b', 'xx:les:a'])
  })
})
