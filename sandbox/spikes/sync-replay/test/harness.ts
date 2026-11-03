// Two-device scenario runner and fast-check generators.
import fc from 'fast-check'
import { Server, type ServerMode } from '../src/server.ts'
import { Device, type CloseRule } from '../src/device.ts'
import { cardIdOf, type Ev } from '../src/events.ts'
import { defaultCfg, derive, snapshot, type DeriveCfg } from '../src/derive.ts'

export interface Opts {
  serverMode: ServerMode
  replaceOnPull: boolean
  closeRule: CloseRule
  monotonic: boolean
  writeMarks: boolean
  causalClamp: boolean
  /** Each device writes and pushes a hello event at sign-in, before any study, so others know it exists. */
  register: boolean
  graceMs: number
  derive: DeriveCfg
}

export const FIXED: Opts = {
  serverMode: 'serialized',
  replaceOnPull: true,
  closeRule: 'settled',
  monotonic: true,
  writeMarks: true,
  causalClamp: true,
  register: true,
  graceMs: 72 * 3_600_000,
  derive: defaultCfg,
}
// Architecture rev 2.1 as written.
export const AS_WRITTEN: Opts = { ...FIXED, serverMode: 'identity', replaceOnPull: false, closeRule: 'naive', monotonic: false, writeMarks: false, causalClamp: true, register: false } // §14 states the clamp, so credit it

export type Step =
  | { t: 'review'; dev: number; card: number; rating: 1 | 2 | 3 | 4 }
  | { t: 'trial'; dev: number; item: number; correct: boolean }
  | { t: 'span'; dev: number; min: number }
  | { t: 'void'; dev: number; back: number }
  | { t: 'sync'; dev: number }
  | { t: 'commit' }
  | { t: 'net'; dev: number; online: boolean }
  | { t: 'lostAck'; dev: number }
  | { t: 'rePush'; dev: number }
  | { t: 'skew'; dev: number; ms: number }
  | { t: 'advance'; min: number }

const dev = fc.integer({ min: 0, max: 1 })
export const stepArb = (withVoids: boolean): fc.Arbitrary<Step> =>
  fc.oneof(
    { weight: 5, arbitrary: fc.record({ t: fc.constant('review' as const), dev, card: fc.integer({ min: 0, max: 3 }), rating: fc.constantFrom(1, 2, 3, 4) as fc.Arbitrary<1 | 2 | 3 | 4> }) },
    { weight: 3, arbitrary: fc.record({ t: fc.constant('trial' as const), dev, item: fc.integer({ min: 0, max: 4 }), correct: fc.boolean() }) },
    { weight: 2, arbitrary: fc.record({ t: fc.constant('span' as const), dev, min: fc.integer({ min: 1, max: 25 }) }) },
    { weight: withVoids ? 1 : 0, arbitrary: fc.record({ t: fc.constant('void' as const), dev, back: fc.integer({ min: 0, max: 5 }) }) },
    { weight: 4, arbitrary: fc.record({ t: fc.constant('sync' as const), dev }) },
    { weight: 2, arbitrary: fc.constant({ t: 'commit' as const }) },
    { weight: 2, arbitrary: fc.record({ t: fc.constant('net' as const), dev, online: fc.boolean() }) },
    { weight: 1, arbitrary: fc.record({ t: fc.constant('lostAck' as const), dev }) },
    { weight: 1, arbitrary: fc.record({ t: fc.constant('rePush' as const), dev }) },
    { weight: 1, arbitrary: fc.record({ t: fc.constant('skew' as const), dev, ms: fc.integer({ min: -120_000, max: 120_000 }) }) },
    { weight: 4, arbitrary: fc.record({ t: fc.constant('advance' as const), min: fc.constantFrom(1, 2, 5, 30, 180, 600, 1200, 1430) }) },
  )

export const scenarioArb = (withVoids = true, maxLength = 70) => fc.array(stepArb(withVoids), { minLength: 5, maxLength })

export const START = Date.UTC(2026, 2, 1, 8, 50) // 03:50 local at UTC-5, ten minutes before the 04:00 day boundary

export interface Run {
  server: Server
  devices: Device[]
  /** Longest true-time delay between recording an event and its commit on the server. */
  maxDelayMs: number
}

export function runScenario(steps: Step[], o: Opts): Run {
  let T = START
  const server = new Server(o.serverMode)
  const devOpts = (localTzMin: number) => ({ userId: 'u1', derive: { ...o.derive, localTzMin }, closeRule: o.closeRule, graceMs: o.graceMs, replaceOnPull: o.replaceOnPull, monotonic: o.monotonic, writeMarks: o.writeMarks, causalClamp: o.causalClamp })
  // Device-local time zones differ by an hour (e.g. a laptop left on another zone after travel); only 'local' tz mode uses them.
  const devices = [new Device('phone', server, () => T, devOpts(-300)), new Device('laptop', server, () => T, devOpts(-360))]
  const recordedAt = new Map<string, number>()
  let maxDelayMs = 0
  for (const d of devices) {
    d.onRecord = (e) => recordedAt.set(e.id, T)
    d.onCommit = (ids) => { for (const id of ids) maxDelayMs = Math.max(maxDelayMs, T - (recordedAt.get(id) ?? T)) }
  }
  const sync = (d: Device, autoCommit: boolean) => d.sync(autoCommit)
  if (o.register) {
    for (const d of devices) { d.record(() => ({ kind: 'mark' })); d.sync(true) }
    for (const d of devices) d.sync(true)
  }
  const commitInflight = (d: Device) => d.completePush()

  for (const s of steps) {
    switch (s.t) {
      case 'review': { const d = devices[s.dev]; d.review(cardIdOf(`zh:w:${s.card}`, 'recog'), s.rating); T += 8000; break }
      case 'trial': devices[s.dev].record(() => ({ kind: 'trial', itemId: `zh:w:${s.item}`, lessonId: `zh:les:${s.item % 2}`, correct: s.correct, durationMs: 10_000 })); T += 10_000; break
      case 'span': devices[s.dev].record(() => ({ kind: 'span', mediaId: 'media:x', durationMs: s.min * 60_000 })); T += s.min * 60_000; break
      case 'void': {
        const d = devices[s.dev]
        const mine = [...d.log.values()].filter((e) => e.deviceId === d.id && (e.p.kind === 'review' || e.p.kind === 'trial'))
        const target = mine[mine.length - 1 - s.back]
        if (target) d.record(() => ({ kind: 'void', target: target.id }))
        break
      }
      case 'sync': sync(devices[s.dev], false); break
      case 'commit': { const d = devices.find((x) => x.inflight); if (d) commitInflight(d); break }
      case 'net': devices[s.dev].online = s.online; break
      case 'lostAck': devices[s.dev].dropNextAck = true; break
      case 'rePush': {
        const d = devices[s.dev]
        if (d.online) server.push([...d.log.values()].filter((e) => e.deviceId === d.id && !d.outbox.includes(e.id)).slice(-5))
        break
      }
      case 'skew': devices[s.dev].skewMs = s.ms; break
      case 'advance': T += s.min * 60_000; break
    }
  }
  // Full sync: everything lands, everyone pulls, closes, pushes, pulls again.
  for (const d of devices) { d.online = true; commitInflight(d) }
  for (let round = 0; round < 3; round++) for (const d of devices) sync(d, true)
  return { server, devices, maxDelayMs }
}

export function logIds(d: Device) { return [...d.log.keys()].sort().join(',') }

export function compare(run: Run) {
  const [a, b] = run.devices
  const sa = snapshot(a.derived()), sb = snapshot(b.derived())
  return { sameLog: logIds(a) === logIds(b), sameDerived: sa === sb, sa, sb }
}

/** Closed days whose frozen XP differs from what the complete log says for that day. */
export function incompleteCloses(run: Run, cfg: DeriveCfg) {
  const full = derive(run.server.all().filter((e: Ev) => e.p.kind !== 'void'), cfg)
  const bad: string[] = []
  for (const [day, e] of full.closed) {
    if (e.p.kind !== 'day_closed') continue
    const truth = full.days.get(day)?.xp ?? 0
    if (truth !== e.p.xp) bad.push(`${e.p.date}: frozen xp ${e.p.xp}, actual ${truth}`)
  }
  return bad
}
