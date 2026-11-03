// Pure derive over a set of events: card states, mastery, lesson status, provisional days, closed days.
import { byTime, type Credit, type Ev } from './events.ts'
import { applyReview, newCardState, type CardState, type DueMode, type Scheduler, scheduler } from './srs.ts'

export const DAY = 86_400_000
export const RULES = { xp: 'v1', consistency: 'v1', mastery: 'v1', fsrs: 'ts-fsrs@6.0.0/FSRS-7' } as const

export interface DeriveCfg {
  dueMode: DueMode
  dayStartHour: number
  /** 'synced': study tz comes from a synced setting event. 'local': the deriving device's own tz (naive). */
  tzMode: 'synced' | 'local'
  defaultTzMin: number
  localTzMin?: number
}

export const defaultCfg: DeriveCfg = { dueMode: 'recorded', dayStartHour: 4, tzMode: 'synced', defaultTzMin: -300 }

export interface DaySummary { day: number; minutes: number; xp: number; credit: Credit }
export interface Mastery { n: number; score: number; state: 'learning' | 'mastered' }

export interface Derived {
  cards: Map<string, CardState>
  mastery: Map<string, Mastery>
  lessons: Map<string, 'in_progress' | 'complete'>
  days: Map<number, DaySummary> // provisional, from raw events
  closed: Map<number, Ev> // day_closed events by study day
  tzMin: number
  firstActivityDay: number | null
  /** Devices with any event in [from, to). */
  devicesInWindow: (from: number, to: number) => Set<string>
  /** Latest occurredAt per device. */
  deviceLastAt: Map<string, number>
}

export const studyDay = (ms: number, tzMin: number, startH: number) => Math.floor((ms + tzMin * 60_000 - startH * 3_600_000) / DAY)
export const dayEnd = (day: number, tzMin: number, startH: number) => (day + 1) * DAY - tzMin * 60_000 + startH * 3_600_000
export const dayName = (day: number) => new Date(day * DAY).toISOString().slice(0, 10)
export const dayFromName = (s: string) => Math.round(Date.parse(s + 'T00:00:00Z') / DAY)

export function creditFor(minutes: number): Credit {
  return minutes >= 30 ? 'stretch' : minutes >= 15 ? 'standard' : minutes >= 8 ? 'floor' : 'none'
}

export function derive(events: Iterable<Ev>, cfg: DeriveCfg = defaultCfg, s: Scheduler = scheduler): Derived {
  const all = [...events]
  const voided = new Set<string>()
  for (const e of all) if (e.p.kind === 'void') voided.add(e.p.target)
  const live = all.filter((e) => !voided.has(e.id) || e.p.kind === 'day_closed')
  live.sort(byTime)

  let tzMin = cfg.defaultTzMin
  for (const e of live) if (e.p.kind === 'setting' && e.p.key === 'tzMin') tzMin = e.p.value as number
  if (cfg.tzMode === 'local') tzMin = cfg.localTzMin ?? tzMin
  const tzOf = (_e: Ev) => tzMin

  const cards = new Map<string, CardState>()
  const trials = new Map<string, { n: number; score: number; lessonId: string }>()
  const minutesByDay = new Map<number, number>()
  const closed = new Map<number, Ev>()
  const deviceTimes = new Map<string, number[]>()
  const deviceLastAt = new Map<string, number>()
  let firstActivityDay: number | null = null
  const activity = (e: Ev, ms: number) => {
    const d = studyDay(e.occurredAt, tzOf(e), cfg.dayStartHour)
    minutesByDay.set(d, (minutesByDay.get(d) ?? 0) + ms)
    if (firstActivityDay === null || d < firstActivityDay) firstActivityDay = d
  }

  for (const e of live) {
    let ts = deviceTimes.get(e.deviceId)
    if (!ts) deviceTimes.set(e.deviceId, (ts = []))
    ts.push(e.occurredAt)
    deviceLastAt.set(e.deviceId, e.occurredAt) // live is time-sorted
    const p = e.p
    switch (p.kind) {
      case 'review': {
        const st = cards.get(p.cardId) ?? newCardState(p.cardId, e.occurredAt, s)
        cards.set(p.cardId, applyReview(st, e, cfg.dueMode, s))
        activity(e, p.durationMs)
        break
      }
      case 'trial': {
        const t = trials.get(p.itemId) ?? { n: 0, score: 0, lessonId: p.lessonId }
        t.n++
        t.score = t.n === 1 ? +p.correct : 0.7 * t.score + 0.3 * +p.correct
        trials.set(p.itemId, t)
        activity(e, p.durationMs)
        break
      }
      case 'span':
        activity(e, p.durationMs)
        break
      case 'day_closed': {
        const d = dayFromName(p.date)
        const prev = closed.get(d)
        if (!prev || e.id < prev.id) closed.set(d, e) // deterministic even if two ids ever exist for one date
        break
      }
    }
  }

  const mastery = new Map<string, Mastery>()
  const lessonItems = new Map<string, { total: number; mastered: number }>()
  for (const [itemId, t] of trials) {
    const state = t.n >= 3 && t.score >= 0.8 ? 'mastered' : 'learning'
    mastery.set(itemId, { n: t.n, score: Math.round(t.score * 1e6) / 1e6, state })
    const l = lessonItems.get(t.lessonId) ?? { total: 0, mastered: 0 }
    l.total++
    if (state === 'mastered') l.mastered++
    lessonItems.set(t.lessonId, l)
  }
  const lessons = new Map<string, 'in_progress' | 'complete'>()
  for (const [id, l] of lessonItems) lessons.set(id, l.mastered / l.total >= 0.8 ? 'complete' : 'in_progress')

  const days = new Map<number, DaySummary>()
  for (const [day, ms] of minutesByDay) {
    const minutes = Math.round((ms / 60_000) * 100) / 100
    days.set(day, { day, minutes, xp: Math.floor(minutes), credit: creditFor(minutes) })
  }

  const devicesInWindow = (from: number, to: number) => {
    const out = new Set<string>()
    for (const [dev, ts] of deviceTimes) if (ts.some((t) => t >= from && t < to)) out.add(dev)
    return out
  }
  return { cards, mastery, lessons, days, closed, tzMin, firstActivityDay, devicesInWindow, deviceLastAt }
}

/** Comparable snapshot of everything that must converge across devices. */
export function snapshot(d: Derived) {
  const sorted = <K extends string | number, V>(m: Map<K, V>) => [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return JSON.stringify({
    cards: sorted(d.cards).map(([k, v]) => [k, v.lastReviewId, { ...v.card, dueAt: +v.card.dueAt, lastReviewAt: v.card.lastReviewAt ? +v.card.lastReviewAt : null }]),
    mastery: sorted(d.mastery),
    lessons: sorted(d.lessons),
    closed: sorted(d.closed).map(([k, e]) => [k, e.id, e.p]),
    openDays: sorted(d.days).filter(([k]) => !d.closed.has(k)),
  })
}
