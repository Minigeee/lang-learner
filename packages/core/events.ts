import type { ClipId } from './content.ts'
import type { CardId, ItemId, Lang, LessonId } from './ids.ts'

/**
 * One fact in the append-only log. TypeScript and the sync wire format are camelCase, and the
 * database is snake_case; only apps/server maps between them. `occurredAt` is integer milliseconds.
 */
export interface EventEnvelope<K extends string = string, P = unknown> {
  id: string
  kind: K
  v: number
  lang: Lang | null
  occurredAt: number
  deviceId: string
  deviceSeq: number
  build: string
  payload: P
  /** Server-assigned arrival order; absent until the event is pulled back. */
  seq?: number
}

/** Where a lesson step sits: the compiled lesson, its hash, and one run of it. */
interface LessonRef {
  lessonId: LessonId
  /** The manifest's hash of the compiled lesson the learner saw. */
  lessonHash: string
  /** The id of the run: the first `lesson_cursor` event of one pass through the lesson. */
  run: string
}

export type ExposurePayload =
  | { type: 'clip'; clipId: ClipId; speaker: string; lessonId: LessonId | null }
  /** A video counts at its full length once it starts (`played`) or is marked watched (`marked`). */
  | { type: 'video'; youtubeId: string; role: 'main' | 'supplemental'; durationSec: number; lessonId: LessonId | null; via: 'played' | 'marked' }

/** A review grade. The app's two buttons record Again (1) and Good (3). */
export type Rating = 1 | 2 | 3 | 4
/** A day's consistency credit, from its minutes (derive's `credit` rule). */
export type DayCredit = 'none' | 'floor' | 'standard' | 'stretch'
/** Which card face an item gets: a word's vocab card, or a lesson skill's practice burst. */
export type CardTemplate = 'vocab' | 'skill'

/** The synced settings. Derive reads the latest of each key by (occurredAt, id); settings.ts owns the defaults. */
export type SettingPayload =
  /** The IANA zone study days are counted in. Derive never reads a device's own zone. */
  | { key: 'studyTz'; value: string }
  /** The local hour, 0–23, a study day starts at. */
  | { key: 'dayStartHour'; value: number }
  /** The support language: a locale column of the string tables, such as `en` or `zh-Hans`. */
  | { key: 'supportLocale'; value: string }
  /** The daily review time the queue fills, in whole minutes from 5 to 60. */
  | { key: 'reviewBudgetMin'; value: number }
  /** The owner's own plan for when to study, shown on Today. */
  | { key: 'intention'; value: string }
  /** First-run setup is finished, so no device shows it again. */
  | { key: 'setupDone'; value: true }

/** What a claim is about. Unit and stage ids are the curriculum's (`1.4`, `S0`). */
export type ClaimTarget = { scope: 'lesson'; id: LessonId } | { scope: 'unit'; id: string } | { scope: 'stage'; id: string }

/**
 * Watching outside the app, logged by hand. `date` is the study day it counts on; any day may be
 * logged (README Tracking row). `minutes` is whole.
 */
export interface WatchPayload {
  title: string
  episode?: string
  minutes: number
  date: string
  subtitles: 'none' | 'zh' | 'dual' | 'en'
  attention: 'straight' | 'pausing' | 'half'
  followed: 'little' | 'some' | 'most'
}

/** What a caller records. Unknown kinds pulled from a newer build are stored as they arrive. */
export type EventDraft =
  /**
   * `hello` registers the device before any study, so other devices wait for it before closing a
   * day. `day` proves the device has flushed every earlier study day: at most one per device and day.
   */
  | { kind: 'device'; v: 1; payload: { reason: 'hello' | 'day' } }
  | { kind: 'setting'; v: 1; payload: SettingPayload }
  /** `target` names what the note is about: `<lessonId>@<lessonHash>#<step>` for a lesson step. */
  | { kind: 'flag'; v: 1; payload: { note: string; target?: string } }
  /** The learner reached a step of a run: an index into the lesson's steps, or `done` when practice ended. */
  | { kind: 'lesson_cursor'; v: 1; payload: LessonRef & { step: number | 'done' } }
  /**
   * One scored response in a run's practice step. `key` is the practice item, `attempt` counts its
   * retries from 1, and `mode` says whether it's checkpoint evidence. `recycled` marks a stimulus
   * reused because the pool ran dry, which is practice, not transfer evidence.
   */
  | { kind: 'trial'; v: 1; payload: LessonRef & {
      step: number; key: string; attempt: number; itemId: ItemId; widget: `${string}@${number}`
      mode: 'lesson' | 'checkpoint'; correct: boolean; recycled: boolean } }
  | { kind: 'exposure'; v: 1; payload: ExposurePayload }
  /**
   * A card joins the reviews. `via` says how the learner met the item: a lesson's end card (with
   * `lessonId`), or a first look at a prep or frequency-queue word (with none). Its id is derived from
   * the card, so a repeat or a second device adds nothing.
   */
  | { kind: 'card_added'; v: 1; payload: {
      cardId: CardId; itemId: ItemId; template: CardTemplate; via: 'lesson' | 'prep' | 'queue'; lessonId: LessonId | null } }
  /**
   * One graded review. `dueAt` (integer ms) is the due date this device chose after load balancing,
   * and `prevReviewId` the review it treated as the card's previous one; replay keeps `dueAt` only when
   * that still holds. `durationMs` tunes estimates and never decides credit.
   */
  | { kind: 'review'; v: 1; payload: { cardId: CardId; rating: Rating; durationMs: number; dueAt: number; prevReviewId: string | null } }
  /**
   * The owner says a lesson is done, or a lesson, unit or stage is known (README Completion &
   * test-out); `none` withdraws. The latest claim on a target wins. Claims credit no minutes.
   */
  | { kind: 'claim'; v: 1; payload: ClaimTarget & { as: 'done' | 'known' | 'none' } }
  | { kind: 'watch'; v: 1; payload: WatchPayload }
  /**
   * A finished study day, frozen. Its id is derived from the date, so two closes are one event.
   * `minutes` has at most 2 decimals. `basis` says whether every device had synced or the grace ran out.
   */
  | { kind: 'day_closed'; v: 1; payload: {
      date: string; xp: number; credit: DayCredit; rules: Record<string, string>; minutes: number; basis: 'settled' | 'grace' } }

/** A recorded event of one kind. */
export type EventOf<K extends EventDraft['kind']> = EventEnvelope<K, Extract<EventDraft, { kind: K }>['payload']>

export interface DeviceMeta {
  deviceId: string
  /** The last deviceSeq used; 0 before the first event. */
  deviceSeq: number
  /** The last occurredAt stamped on this device. */
  lastStamp: number
}

export interface StampOptions {
  id: string
  now: number
  build: string
  lang?: Lang | null
  /** The event can't be stamped before this time, such as a card's last review. */
  notBefore?: number
}

/** Derive's total order. Never `seq`, which only says when the server saw the event. */
export const byTime = (a: EventEnvelope, b: EventEnvelope): number =>
  a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** The `occurredAt` a draft stamped now gets: never before `notBefore` or the device's last stamp. */
export const stampTime = (meta: DeviceMeta, o: Pick<StampOptions, 'now' | 'notBefore'>): number =>
  Math.max(o.now, o.notBefore ?? -Infinity, meta.lastStamp)

/** Stamps a draft. A device's stamps never go backwards, even when its clock does. */
export function stamp(meta: DeviceMeta, draft: EventDraft, o: StampOptions): { event: EventEnvelope; meta: DeviceMeta } {
  const occurredAt = stampTime(meta, o)
  const deviceSeq = meta.deviceSeq + 1
  return {
    event: { ...draft, id: o.id, lang: o.lang ?? null, occurredAt, deviceId: meta.deviceId, deviceSeq, build: o.build },
    meta: { ...meta, deviceSeq, lastStamp: occurredAt },
  }
}

// Boundary validation. Each check returns null when the value fits, else what's wrong.
type Check = (x: unknown) => string | null
type Obj = Record<string, unknown>

const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)
const str: Check = (x) => (typeof x === 'string' && x.length > 0 && x.length <= 2000 ? null : 'a non-empty string')
const int: Check = (x) => (Number.isSafeInteger(x) ? null : 'an integer')
const bool: Check = (x) => (typeof x === 'boolean' ? null : 'a boolean')
const nat: Check = (x) => (Number.isSafeInteger(x) && (x as number) >= 0 ? null : 'a whole number')
const nullable = (c: Check): Check => (x) => (x === null ? null : c(x))
const oneOf = (...values: unknown[]): Check => (x) => (values.includes(x) ? null : `one of ${values.join(', ')}`)
const prefixed = (prefix: string): Check => (x) => (typeof x === 'string' && x.startsWith(prefix) && x.length > prefix.length ? null : `a ${prefix} id`)
const either = (a: Check, b: Check): Check => (x) => (a(x) === null || b(x) === null ? null : `${a(x)} or ${b(x)}`)

function shape(fields: Record<string, Check>, optional: Record<string, Check> = {}): Check {
  return (x) => {
    if (!isObj(x)) return 'an object'
    for (const [k, c] of Object.entries(fields)) {
      const e = c(x[k])
      if (e) return `${k} must be ${e}`
    }
    for (const [k, c] of Object.entries(optional)) {
      const e = k in x ? c(x[k]) : null
      if (e) return `${k} must be ${e}`
    }
    return null
  }
}

const itemId: Check = (x) => (typeof x === 'string' && x.split(':').length >= 3 ? null : 'an item id')
const lessonId: Check = (x) => (typeof x === 'string' && /^[a-z]{2,3}:les:./.test(x) ? null : 'a lesson id')
const widget: Check = (x) => (typeof x === 'string' && /^[a-z0-9-]+@\d+$/.test(x) ? null : 'a widget@version')
const lessonRef = { lessonId, lessonHash: str, run: str }
const date: Check = (x) => (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x)) ? null : 'a YYYY-MM-DD date')
const twoDp: Check = (x) => (typeof x === 'number' && x >= 0 && Number.isSafeInteger(Math.round(x * 100)) && Math.abs(Math.round(x * 100) - x * 100) < 1e-6 ? null : 'a number with at most 2 decimals')
const strings: Check = (x) => (isObj(x) && Object.values(x).every((v) => str(v) === null) ? null : 'a map of strings')
const zone: Check = (x) => {
  if (str(x)) return 'an IANA time zone'
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: x as string })
    return null
  } catch {
    return 'an IANA time zone'
  }
}

const intIn = (min: number, max: number): Check => (x) => (Number.isSafeInteger(x) && (x as number) >= min && (x as number) <= max ? null : `a whole number from ${min} to ${max}`)
const shortStr = (max: number): Check => (x) => (typeof x === 'string' && x.trim().length > 0 && x.length <= max ? null : `a non-empty string of at most ${max} characters`)

const SETTINGS: Record<SettingPayload['key'], Check> = {
  studyTz: zone,
  dayStartHour: intIn(0, 23),
  supportLocale: (x) => (typeof x === 'string' && /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(x) ? null : 'a locale such as en or zh-Hans'),
  reviewBudgetMin: intIn(5, 60),
  intention: shortStr(200),
  setupDone: oneOf(true),
}

const setting: Check = (x) => {
  if (!isObj(x)) return 'an object'
  const value = Object.hasOwn(SETTINGS, x.key as string) ? SETTINGS[x.key as SettingPayload['key']] : undefined
  return value ? shape({ value })(x) : `key must be one of ${Object.keys(SETTINGS).join(', ')}`
}

const claim: Check = (x) => {
  if (!isObj(x)) return 'an object'
  const id = x.scope === 'lesson' ? lessonId : x.scope === 'unit' || x.scope === 'stage' ? shortStr(40) : null
  if (!id) return 'scope must be one of lesson, unit, stage'
  return shape({ id, as: oneOf('done', 'known', 'none') })(x)
}

const watch = shape(
  {
    title: shortStr(200), minutes: intIn(1, 1440), date, subtitles: oneOf('none', 'zh', 'dual', 'en'),
    attention: oneOf('straight', 'pausing', 'half'), followed: oneOf('little', 'some', 'most'),
  },
  { episode: shortStr(200) },
)

const cardAdded: Check = (x) => {
  const bad = shape({ cardId: prefixed('card:'), itemId, template: oneOf('vocab', 'skill'), via: oneOf('lesson', 'prep', 'queue'), lessonId: nullable(lessonId) })(x)
  if (bad) return bad
  const p = x as Obj
  return (p.via === 'lesson') === (p.lessonId !== null) ? null : 'lessonId must be set exactly when via is lesson'
}

const clipExposure = shape({ type: oneOf('clip'), clipId: prefixed('clip:'), speaker: str, lessonId: nullable(lessonId) })
const videoExposure = shape({
  type: oneOf('video'), youtubeId: str, role: oneOf('main', 'supplemental'), durationSec: int,
  lessonId: nullable(lessonId), via: oneOf('played', 'marked'),
})

/** One payload check per kind, so a kind can't be added to the union without one. */
const PAYLOADS: { [K in EventDraft['kind']]: Check } = {
  device: shape({ reason: oneOf('hello', 'day') }),
  setting,
  flag: shape({ note: str }, { target: str }),
  lesson_cursor: shape({ ...lessonRef, step: either(int, oneOf('done')) }),
  trial: shape({
    ...lessonRef, step: int, key: str, attempt: int, itemId, widget,
    mode: oneOf('lesson', 'checkpoint'), correct: bool, recycled: bool,
  }),
  exposure: (x) => (isObj(x) && x.type === 'video' ? videoExposure(x) : clipExposure(x)),
  card_added: cardAdded,
  review: shape({ cardId: prefixed('card:'), rating: oneOf(1, 2, 3, 4), durationMs: nat, dueAt: int, prevReviewId: nullable(str) }),
  claim,
  watch,
  day_closed: shape({
    date, xp: nat, credit: oneOf('none', 'floor', 'standard', 'stretch'), rules: strings, minutes: twoDp, basis: oneOf('settled', 'grace'),
  }),
}

const envelope = shape({
  id: str, kind: oneOf(...Object.keys(PAYLOADS)), v: oneOf(1), lang: nullable(str),
  occurredAt: int, deviceId: str, deviceSeq: int, build: str,
})

/**
 * Null when `value` is an event this build knows: a well-formed envelope and a valid payload for its
 * kind and version. Otherwise what's wrong, for a rejection. `seq` is ignored, since the server sets it.
 */
export function validateEvent(value: unknown): string | null {
  const bad = envelope(value)
  if (bad) return bad
  const e = value as Obj
  const payloadError = PAYLOADS[e.kind as EventDraft['kind']](e.payload)
  return payloadError && `payload: ${payloadError}`
}
