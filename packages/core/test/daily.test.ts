// Spike D's two-device properties (sync-replay FINDINGS §2), run on the real code: the event log, the
// card cache and live review recording, derive, and the settled day close. Two devices study, sync
// over a server whose commits can overlap, lose acks and skew their clocks; after a full sync they
// must hold the same log and derive the same cards, progress and days.
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  cardAdded, cardIdOf, CLOSE_RULE, createCardIndex, createSrs, deriveDays, deriveProgress, reviewOf, studyDate, syncAndClose,
  type CardIndex, type EventEnvelope, type EventOf, type ItemId, type LessonCredit, type LessonId, type Rating,
} from '../index.ts'
import { Device, MemoryServer, tick, type Mutations } from './harness.ts'

const RUNS = Number(process.env.RUNS ?? 300)
const srs = await createSrs()
const lesson = 'xx:les:order' as LessonId
const credit: LessonCredit = (id) => (id === lesson ? { estimateSec: 600, steps: 4 } : undefined)
const ZONE = 'America/New_York'
const MIN = 60_000

interface DailyMutations extends Mutations {
  /** Stamp a review from the device clock alone, not after the card's last known review (spike D C6). */
  noClamp?: boolean
  /** Skip the device hello, so a device that never synced is unknown to the others (C4). */
  noHello?: boolean
}

class StudyDevice extends Device {
  readonly cards: CardIndex = createCardIndex(srs)
  private readonly m: DailyMutations

  constructor(id: string, server: MemoryServer, clock: () => number, m: DailyMutations) {
    super(id, server, clock, m)
    this.m = m
  }

  async review(k: number, rating: Rating) {
    this.cards.update(await this.store.events())
    const item = `xx:w:${k}` as ItemId
    const card = cardIdOf(item, 'vocab')
    if (!this.cards.get(card)) {
      const add = cardAdded({ item, template: 'vocab', via: 'queue' })
      await this.log.record(add.draft, { id: add.id })
      this.cards.update(await this.store.events())
    }
    const { draft, notBefore } = reviewOf(this.cards, srs, { card, rating, durationMs: 8000 })
    await this.log.record(draft, this.m.noClamp ? {} : { notBefore })
  }

  sync() {
    return syncAndClose({ log: this.log, store: this.store, clock: this.now, lessons: credit })
  }
}

type Step =
  | { t: 'review'; dev: number; card: number; rating: Rating }
  | { t: 'lesson'; dev: number; run: number; step: number }
  | { t: 'trial'; dev: number; run: number; correct: boolean }
  | { t: 'video'; dev: number; min: number }
  | { t: 'sync'; dev: number }
  | { t: 'commit'; index: number; lostAck: boolean }
  | { t: 'net'; dev: number; online: boolean }
  | { t: 'rePush'; dev: number }
  | { t: 'skew'; dev: number; ms: number }
  | { t: 'advance'; min: number }

const dev = fc.integer({ min: 0, max: 1 })
const stepArb: fc.Arbitrary<Step> = fc.oneof(
  { weight: 5, arbitrary: fc.record({ t: fc.constant('review' as const), dev, card: fc.integer({ min: 0, max: 3 }), rating: fc.constantFrom<Rating>(1, 3) }) },
  { weight: 3, arbitrary: fc.record({ t: fc.constant('lesson' as const), dev, run: fc.integer({ min: 0, max: 2 }), step: fc.integer({ min: 0, max: 3 }) }) },
  { weight: 2, arbitrary: fc.record({ t: fc.constant('trial' as const), dev, run: fc.integer({ min: 0, max: 2 }), correct: fc.boolean() }) },
  { weight: 2, arbitrary: fc.record({ t: fc.constant('video' as const), dev, min: fc.integer({ min: 1, max: 25 }) }) },
  { weight: 4, arbitrary: fc.record({ t: fc.constant('sync' as const), dev }) },
  { weight: 3, arbitrary: fc.record({ t: fc.constant('commit' as const), index: fc.integer({ min: 0, max: 1 }), lostAck: fc.boolean() }) },
  { weight: 2, arbitrary: fc.record({ t: fc.constant('net' as const), dev, online: fc.boolean() }) },
  { weight: 1, arbitrary: fc.record({ t: fc.constant('rePush' as const), dev }) },
  { weight: 1, arbitrary: fc.record({ t: fc.constant('skew' as const), dev, ms: fc.integer({ min: -120_000, max: 120_000 }) }) },
  { weight: 4, arbitrary: fc.record({ t: fc.constant('advance' as const), min: fc.constantFrom(1, 2, 5, 30, 180, 600, 1200, 1430) }) },
)
const scenarioArb = fc.array(stepArb, { minLength: 5, maxLength: 60 })

/** 03:50 in New York, ten minutes before the 04:00 day boundary. */
const START = Date.UTC(2026, 2, 1, 8, 50)

interface Run { server: MemoryServer; devices: StudyDevice[] }

async function runScenario(steps: Step[], m: DailyMutations = {}): Promise<Run> {
  let now = START
  const server = new MemoryServer(m.serverMode ?? 'serialized')
  const devices = ['phone', 'laptop'].map((id) => new StudyDevice(id, server, () => now, m))
  const settle = async () => {
    await tick()
    while (server.pending > 0) {
      server.commit(0)
      await tick()
    }
  }
  // Each device registers before any study, the way the app does on first launch.
  await devices[0]!.log.record({ kind: 'setting', v: 1, payload: { key: 'studyTz', value: ZONE } })
  for (const d of devices) {
    if (!m.noHello) await d.log.hello()
    void d.sync()
    await settle()
  }

  for (const s of steps) {
    switch (s.t) {
      case 'review': await devices[s.dev]!.review(s.card, s.rating); now += 8000; break
      case 'lesson': {
        const d = devices[s.dev]!
        await d.log.record({ kind: 'lesson_cursor', v: 1, payload: { lessonId: lesson, lessonHash: 'h', run: `${s.dev}-${s.run}`, step: s.step } })
        now += 2 * MIN
        break
      }
      case 'trial': {
        const d = devices[s.dev]!
        await d.log.record({ kind: 'trial', v: 1, payload: {
          lessonId: lesson, lessonHash: 'h', run: `${s.dev}-${s.run}`, step: 3, key: '1', attempt: 1, itemId: 'xx:g:order',
          widget: 'pick@1', mode: 'lesson', correct: s.correct, recycled: false,
        } })
        now += 10_000
        break
      }
      case 'video': {
        await devices[s.dev]!.log.record({ kind: 'exposure', v: 1, payload: { type: 'video', youtubeId: 'y', role: 'supplemental', durationSec: s.min * 60, lessonId: null, via: 'played' } })
        now += s.min * MIN
        break
      }
      case 'sync': void devices[s.dev]!.sync(); await tick(); break
      case 'commit': server.commit(s.index, s.lostAck); await tick(); break
      case 'net': devices[s.dev]!.online = s.online; break
      case 'rePush': {
        const d = devices[s.dev]!
        if (!d.online) break
        const pending = new Set((await d.store.outbox(10_000)).map((e) => e.id))
        const { deviceId } = await d.store.meta()
        const sent = (await d.store.events()).filter((e) => e.deviceId === deviceId && !pending.has(e.id)).slice(-5)
        server.repush(sent)
        break
      }
      case 'skew': devices[s.dev]!.skewMs = s.ms; break
      case 'advance': now += s.min * MIN; break
    }
  }

  // Full sync: everything lands, then both devices catch up, close and push.
  for (const d of devices) d.online = true
  await settle()
  for (let round = 0; round < 3; round++) {
    for (const d of devices) {
      void d.sync()
      await settle()
    }
  }
  return { server, devices }
}

/** Everything that must converge: card states, progress, and every day, open or frozen. */
async function snapshot(d: StudyDevice) {
  const events = await d.store.events()
  const cards = createCardIndex(srs)
  cards.update(events)
  const progress = deriveProgress(events, [])
  const days = deriveDays(events, credit)
  const dates = [...new Set(events.map((e) => studyDate(e.occurredAt, days.clock)))].sort()
  return JSON.stringify({
    cards: [...cards.all()].sort((a, b) => (a.id < b.id ? -1 : 1)),
    mastery: progress.mastery('xx:g:order' as ItemId),
    status: progress.lessonStatus({ id: lesson, skill: 'xx:g:order' as ItemId }),
    days: dates.map((date) => days.day(date)),
  })
}

const canonical = (events: EventEnvelope[]) => JSON.stringify([...events].sort((a, b) => (a.id < b.id ? -1 : 1)))

async function converged(run: Run) {
  const server = canonical(run.server.rows)
  const views = []
  for (const d of run.devices) {
    if (canonical(await d.store.events()) !== server) return false
    views.push(await snapshot(d))
  }
  return views[0] === views[1]
}

/** Closed days whose frozen minutes differ from what the complete log says for that day. */
function incompleteCloses(rows: EventEnvelope[]) {
  const truth = deriveDays(rows.filter((e) => e.kind !== 'day_closed'), credit)
  return rows.filter((e) => e.kind === 'day_closed').map((e) => (e as EventOf<'day_closed'>).payload)
    .filter((p) => truth.day(p.date).minutes !== p.minutes).map((p) => `${p.date}: frozen ${p.minutes}, actual ${truth.day(p.date).minutes}`)
}

/**
 * A lower bound on how long an event sat unsynced: the latest stamp the server held when it arrived,
 * minus its own. A row that arrives after a grace close is behind that close's stamp by at least the grace.
 */
function maxSyncDelay(rows: EventEnvelope[]) {
  let latest = -Infinity
  let worst = 0
  for (const row of [...rows].sort((a, b) => a.seq! - b.seq!)) {
    worst = Math.max(worst, latest - row.occurredAt)
    latest = Math.max(latest, row.occurredAt)
  }
  return worst
}

const MARGIN = 10 * MIN

describe('two devices, on the real code', () => {
  it('end with identical logs, cards, progress and days after a full sync', async () => {
    await fc.assert(fc.asyncProperty(scenarioArb, async (steps) => converged(await runScenario(steps))), { numRuns: RUNS })
  })

  it('freeze every day with all of its study, unless a device held it back past the grace', async () => {
    await fc.assert(fc.asyncProperty(scenarioArb, async (steps) => {
      const run = await runScenario(steps)
      if (maxSyncDelay(run.server.rows) >= CLOSE_RULE.graceMs - MARGIN) return true
      return incompleteCloses(run.server.rows).length === 0
    }), { numRuns: RUNS })
  })
})

describe('directed: the laptop closes a day before the phone’s offline study for it arrives', () => {
  // The phone studies 20 min offline on Mar 1 and the laptop 5 min online; the laptop opens first next day.
  const scenario = (offlineHours: number): Step[] => [
    { t: 'advance', min: 600 }, // 13:50 on study day 2026-03-01
    { t: 'net', dev: 0, online: false },
    { t: 'video', dev: 0, min: 20 },
    { t: 'video', dev: 1, min: 5 },
    { t: 'sync', dev: 1 }, { t: 'commit', index: 0, lostAck: false },
    { t: 'advance', min: 60 * 20 },
    { t: 'sync', dev: 1 }, { t: 'commit', index: 0, lostAck: false }, { t: 'commit', index: 0, lostAck: false },
    { t: 'advance', min: Math.max(0, offlineHours * 60 - 60 * 20) },
    { t: 'sync', dev: 1 }, { t: 'commit', index: 0, lostAck: false }, { t: 'commit', index: 0, lostAck: false },
    { t: 'net', dev: 0, online: true },
  ]
  const frozen = async (hours: number) => {
    const run = await runScenario(scenario(hours))
    expect(await converged(run)).toBe(true)
    const close = run.server.rows.find((e) => e.kind === 'day_closed' && (e as EventOf<'day_closed'>).payload.date === '2026-03-01') as EventOf<'day_closed'> | undefined
    return close && { minutes: close.payload.minutes, credit: close.payload.credit, basis: close.payload.basis }
  }

  it('waits for the phone, which syncs 30 h later: the day closes with all 25 minutes', async () => {
    expect(await frozen(30)).toEqual({ minutes: 25, credit: 'standard', basis: 'settled' })
  })

  it('closes on the grace when the phone stays offline past 72 h (accepted and bounded)', async () => {
    expect(await frozen(100)).toEqual({ minutes: 5, credit: 'none', basis: 'grace' })
  })
})

describe('each guarantee is load-bearing', () => {
  const fails = async (m: DailyMutations, check: (run: Run) => Promise<boolean> | boolean) =>
    (await fc.check(fc.asyncProperty(scenarioArb, async (steps) => check(await runScenario(steps, m))), { numRuns: 2000, seed: 42 })).failed
  const complete = (run: Run) => maxSyncDelay(run.server.rows) >= CLOSE_RULE.graceMs - MARGIN || incompleteCloses(run.server.rows).length === 0

  it('an identity seq with a plain cursor loses rows, so derived state diverges', async () => {
    expect(await fails({ serverMode: 'identity' }, converged)).toBe(true)
  })

  it('keeping the local copy on pull leaves two different closes of one day', async () => {
    expect(await fails({ keepLocalOnPull: true }, converged)).toBe(true)
  })

  it('without the hello, a device that never synced is not waited for, and its study is frozen out', async () => {
    expect(await fails({ noHello: true }, complete)).toBe(true)
  })

  it('without the review clamp, a skewed device reviewing a card it pulled makes ts-fsrs throw', async () => {
    const steps: Step[] = [
      { t: 'skew', dev: 1, ms: 120_000 },
      { t: 'review', dev: 1, card: 0, rating: 3 },
      { t: 'sync', dev: 1 }, { t: 'commit', index: 0, lostAck: false }, { t: 'commit', index: 0, lostAck: false },
      { t: 'sync', dev: 0 },
      { t: 'review', dev: 0, card: 0, rating: 3 },
    ]
    await expect(runScenario(steps, { noClamp: true })).rejects.toThrow(/elapsedDays/)
    expect(await converged(await runScenario(steps))).toBe(true)
  })
})
