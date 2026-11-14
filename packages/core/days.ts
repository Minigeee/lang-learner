// Study days (architecture §5, Frozen history): the synced study clock, minutes and credit per day,
// and the settled close. Derive never reads a device's own time zone, so every device puts an event
// on the same day.
import { RULES } from './derive.ts'
import { byTime, type DayCredit, type EventDraft, type EventEnvelope, type EventOf } from './events.ts'
import { deterministicUuid, type LessonId } from './ids.ts'
import { settingsOf, type StudyClock } from './settings.ts'
import type { EventLog, FlushResult, LocalStore } from './sync.ts'

export type { StudyClock } from './settings.ts'

const HOUR = 3_600_000
const DAY = 24 * HOUR

const formats = new Map<string, Intl.DateTimeFormat>()
/** The zone's offset from UTC at an instant, in ms. */
function offset(ms: number, tz: string): number {
  let f = formats.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
    formats.set(tz, f)
  }
  const p = Object.fromEntries(f.formatToParts(ms).map((x) => [x.type, Number(x.value)]))
  return Date.UTC(p.year!, p.month! - 1, p.day!, p.hour!, p.minute!, p.second!) - (ms - (((ms % 1000) + 1000) % 1000))
}

/** The study day an instant falls on, as YYYY-MM-DD. */
export function studyDate(ms: number, clock: StudyClock): string {
  return new Date(ms + offset(ms, clock.tz) - clock.dayStartHour * HOUR).toISOString().slice(0, 10)
}

/** The instants a study day starts and ends at (half-open). */
export function dayBounds(date: string, clock: StudyClock): { start: number; end: number } {
  const startOf = (d: string) => {
    const wall = Date.parse(`${d}T00:00:00Z`) + clock.dayStartHour * HOUR
    let at = wall - offset(wall, clock.tz)
    at = wall - offset(at, clock.tz)
    return at
  }
  const next = new Date(Date.parse(`${date}T00:00:00Z`) + DAY).toISOString().slice(0, 10)
  return { start: startOf(date), end: startOf(next) }
}

/** The synced study clock (settings.ts). */
export const studyClockOf = (events: readonly EventEnvelope[]): StudyClock => settingsOf(events).clock

/** credit@v1: the minutes a day needs for each credit (README Motivation row; "Tonight counts" is the floor). */
export const CREDIT_V1 = { floor: 8, standard: 15, stretch: 30 } as const

export function creditFor(minutes: number): DayCredit {
  return minutes >= CREDIT_V1.stretch ? 'stretch' : minutes >= CREDIT_V1.standard ? 'standard' : minutes >= CREDIT_V1.floor ? 'floor' : 'none'
}

/**
 * minutes@v1 (README Tracking row): time comes from estimates, never a stopwatch. A lesson step counts
 * its share of the lesson's estimate the first time a run reaches it; a review counts its template's
 * estimate; a first look at a feed word counts `firstLookSec`; a video started outside a lesson counts
 * its whole length (one inside a lesson is part of the lesson's estimate); a watch log counts its
 * minutes on the day it names. (Watch logs joined in Phase 4 as a new kind, so no earlier day changes.)
 */
export const MINUTES_V1 = { reviewSec: { vocab: 8, skill: 20 }, firstLookSec: 20 } as const

/** A lesson's estimate and step count, from the build. Undefined for a lesson the build doesn't have. */
export type LessonCredit = (lesson: LessonId) => { estimateSec: number; steps: number } | undefined

export interface DayView {
  date: string
  /** Two decimals. */
  minutes: number
  xp: number
  credit: DayCredit
  /** True once the day is frozen: its numbers then come from its `day_closed`, never the log. */
  closed: boolean
}

/** Where a minute went, for the time split: in-app lessons, cards, or watching (videos and logs). */
export type Bucket = 'lessons' | 'cards' | 'watching'

/** consistency@v1 (README Motivation row): days studied in a trailing window, never a streak. */
export const CONSISTENCY_V1 = { windowDays: 30 } as const

export interface Days {
  clock: StudyClock
  day(date: string): DayView
  today(now: number): DayView
  /** Days with study that aren't closed, oldest first. */
  open(): string[]
  /**
   * A day's minutes by bucket (two decimals), live from the log. A closed day's `day()` stays frozen,
   * so its split may include events that synced after it closed.
   */
  split(date: string): Record<Bucket, number>
  /** The `n` study days ending with today, oldest first. A day with minutes above zero was studied. */
  recent(now: number, n: number): DayView[]
}

const round2 = (x: number) => Math.round(x * 100) / 100

function view(date: string, seconds: number): DayView {
  const minutes = round2(seconds / 60)
  return { date, minutes, xp: Math.floor(minutes), credit: creditFor(minutes), closed: false }
}

export function deriveDays(events: readonly EventEnvelope[], lessons: LessonCredit): Days {
  const clock = studyClockOf(events)
  const seconds = new Map<string, number>()
  const closed = new Map<string, EventOf<'day_closed'>['payload']>()
  const templates = new Map<string, 'vocab' | 'skill'>()
  const buckets = new Map<string, Record<Bucket, number>>()
  const reached = new Set<string>()
  const addOn = (d: string, bucket: Bucket, sec: number) => {
    seconds.set(d, (seconds.get(d) ?? 0) + sec)
    const b = buckets.get(d) ?? { lessons: 0, cards: 0, watching: 0 }
    b[bucket] += sec
    buckets.set(d, b)
  }
  const add = (e: EventEnvelope, bucket: Bucket, sec: number) => addOn(studyDate(e.occurredAt, clock), bucket, sec)
  for (const e of events.filter((x) => x.kind === 'card_added' && x.v === 1)) {
    const p = (e as EventOf<'card_added'>).payload
    templates.set(p.cardId, p.template)
  }
  for (const e of [...events].sort(byTime)) {
    if (e.v !== 1) continue
    if (e.kind === 'lesson_cursor') {
      const p = (e as EventOf<'lesson_cursor'>).payload
      const credit = lessons(p.lessonId)
      const key = `${p.run}#${p.step}`
      if (p.step === 'done' || !credit || reached.has(key)) continue
      reached.add(key)
      add(e, 'lessons', credit.estimateSec / Math.max(1, credit.steps))
    } else if (e.kind === 'review') {
      add(e, 'cards', MINUTES_V1.reviewSec[templates.get((e as EventOf<'review'>).payload.cardId) ?? 'vocab'])
    } else if (e.kind === 'card_added') {
      if ((e as EventOf<'card_added'>).payload.via !== 'lesson') add(e, 'cards', MINUTES_V1.firstLookSec)
    } else if (e.kind === 'exposure') {
      const p = (e as EventOf<'exposure'>).payload
      if (p.type === 'video' && p.lessonId === null) add(e, 'watching', p.durationSec)
    } else if (e.kind === 'watch') {
      const p = (e as EventOf<'watch'>).payload
      addOn(p.date, 'watching', p.minutes * 60)
    } else if (e.kind === 'day_closed') {
      const p = (e as EventOf<'day_closed'>).payload
      if (!closed.has(p.date)) closed.set(p.date, p)
    }
  }
  const day = (date: string): DayView => {
    const c = closed.get(date)
    return c ? { date, minutes: c.minutes, xp: c.xp, credit: c.credit, closed: true } : view(date, seconds.get(date) ?? 0)
  }
  return {
    clock,
    day,
    today: (now) => day(studyDate(now, clock)),
    open: () => [...seconds.keys()].filter((d) => !closed.has(d) && seconds.get(d)! > 0).sort(),
    split(date) {
      const b = buckets.get(date)
      return { lessons: round2((b?.lessons ?? 0) / 60), cards: round2((b?.cards ?? 0) / 60), watching: round2((b?.watching ?? 0) / 60) }
    },
    recent(now, n) {
      const today = studyDate(now, clock)
      const at = Date.parse(`${today}T00:00:00Z`)
      return Array.from({ length: n }, (_, i) => day(new Date(at - (n - 1 - i) * DAY).toISOString().slice(0, 10)))
    },
  }
}

/** When a finished day may close: once every other recently active device has synced past it, or after the grace. Owner-tunable. */
export const CLOSE_RULE = { graceMs: 72 * HOUR, activeWindowMs: 14 * DAY } as const

/** The rule versions a close freezes. */
const CLOSE_RULES = { minutes: RULES.minutes, xp: RULES.xp, credit: RULES.credit }

/**
 * The `day_closed` events this device may append now, for every open day before today. Call it only
 * right after a successful pull: the settled check trusts that this device holds everything the
 * server has. Ids come from the date, so two devices closing one day write one event.
 */
export function closableDays(o: { events: readonly EventEnvelope[]; days: Days; deviceId: string; now: number }): { id: string; draft: EventDraft }[] {
  const { days, now } = o
  const today = studyDate(now, days.clock)
  const lastAt = new Map<string, number>()
  for (const e of o.events) lastAt.set(e.deviceId, Math.max(lastAt.get(e.deviceId) ?? -Infinity, e.occurredAt))
  const out: { id: string; draft: EventDraft }[] = []
  for (const date of days.open()) {
    if (date >= today) continue
    const { end } = dayBounds(date, days.clock)
    let basis: 'settled' | 'grace' = 'grace'
    if (now < end + CLOSE_RULE.graceMs) {
      const active = new Set(o.events.filter((e) => e.deviceId !== o.deviceId && e.occurredAt >= end - CLOSE_RULE.activeWindowMs && e.occurredAt < end).map((e) => e.deviceId))
      if (![...active].every((d) => lastAt.get(d)! >= end)) continue
      basis = 'settled'
    }
    const d = days.day(date)
    out.push({
      id: deterministicUuid('day-closed', date),
      draft: { kind: 'day_closed', v: 1, payload: { date, xp: d.xp, credit: d.credit, rules: { ...CLOSE_RULES }, minutes: d.minutes, basis } },
    })
  }
  return out
}

/**
 * One sync round (architecture §5): a `day` mark when this device has recorded nothing yet today,
 * then push and pull, then close every settled day and push the closes. Never rejects; nothing
 * closes when the round can't reach the server.
 */
export async function syncAndClose(o: {
  log: EventLog
  store: Pick<LocalStore, 'meta' | 'events'>
  clock: () => number
  lessons: LessonCredit
}): Promise<FlushResult> {
  try {
    const meta = await o.store.meta()
    const clock = studyClockOf(await o.store.events())
    const today = studyDate(o.clock(), clock)
    if (meta.deviceSeq > 0 && meta.lastStamp < dayBounds(today, clock).start) {
      await o.log.record({ kind: 'device', v: 1, payload: { reason: 'day' } }, { id: deterministicUuid('device-day', meta.deviceId, today) })
    }
  } catch (error) {
    return { ok: false, error }
  }
  const first = await o.log.flush()
  if (!first.ok) return first
  try {
    const events = await o.store.events()
    const { deviceId } = await o.store.meta()
    const closes = closableDays({ events, days: deriveDays(events, o.lessons), deviceId, now: o.clock() })
    if (closes.length === 0) return first
    for (const c of closes) await o.log.record(c.draft, { id: c.id })
  } catch (error) {
    return { ok: false, error }
  }
  const second = await o.log.flush()
  return second.ok ? { ok: true, pushed: first.pushed + second.pushed, pulled: first.pulled + second.pulled } : second
}
