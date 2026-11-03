import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { AS_WRITTEN, compare, FIXED, incompleteCloses, runScenario, scenarioArb, type Opts, type Step } from './harness.ts'

const RUNS = Number(process.env.RUNS ?? 300)
const MARGIN = 10 * 60_000

const converges = (o: Opts, withVoids = true) =>
  fc.property(scenarioArb(withVoids), (steps) => {
    const c = compare(runScenario(steps, o))
    return c.sameLog && c.sameDerived
  })

const complete = (o: Opts) =>
  fc.property(scenarioArb(false), (steps) => {
    const run = runScenario(steps, o)
    if (run.maxDelayMs >= o.graceMs - MARGIN) return true // a device sat on unsynced study for longer than the grace period
    return incompleteCloses(run, o.derive).length === 0
  })

/** Runs a property that is expected to fail, and reports the shrunk counterexample. */
function counterexample(name: string, prop: fc.IProperty<[Step[]]>, explain: (steps: Step[]) => unknown) {
  const r = fc.check(prop, { numRuns: 2000, seed: 42 })
  if (r.failed) {
    const steps = r.counterexample![0]
    console.log(`\n--- ${name}: counterexample after ${r.numRuns} runs, ${r.numShrinks} shrinks ---\n` + steps.map((s) => JSON.stringify(s)).join('\n') + '\n' + JSON.stringify(explain(steps), null, 1))
  } else console.log(`\n--- ${name}: no counterexample in ${r.numRuns} runs`)
  return r
}

describe('two-device convergence with the proposed fixes', () => {
  it('logs and all derived state (cards, mastery, lessons, closed and open days) are identical after full sync', () => {
    fc.assert(converges(FIXED), { numRuns: RUNS })
  })

  it('closed days include every event recorded within the grace period (late phone events are not lost)', () => {
    fc.assert(complete(FIXED), { numRuns: RUNS })
  })

  it("'seeded' due mode (no recorded dueAt) also converges", () => {
    fc.assert(converges({ ...FIXED, derive: { ...FIXED.derive, dueMode: 'seeded' } }), { numRuns: Math.ceil(RUNS / 3) })
  })
})

describe('directed: the laptop closes a day before the phone’s offline events for it arrive', () => {
  // Phone studies 20 min offline on Feb 28 (study day), laptop studies 5 min online. Next morning the laptop opens first.
  const scenario = (offlineHours: number): Step[] => [
    { t: 'advance', min: 600 }, // 13:50 local on Mar 1, study day 2026-03-01
    { t: 'net', dev: 0, online: false },
    { t: 'span', dev: 0, min: 20 },
    { t: 'span', dev: 1, min: 5 },
    { t: 'sync', dev: 1 }, { t: 'commit' },
    { t: 'advance', min: 60 * 20 }, // next study day
    { t: 'sync', dev: 1 }, { t: 'commit' }, // laptop opens first and may close the day
    { t: 'sync', dev: 1 }, { t: 'commit' }, // and pushes its day_closed
    { t: 'advance', min: Math.max(0, offlineHours * 60 - 60 * 20) },
    { t: 'sync', dev: 1 }, { t: 'commit' }, // the laptop keeps being used daily
    { t: 'sync', dev: 1 }, { t: 'commit' },
    { t: 'net', dev: 0, online: true },
    { t: 'sync', dev: 0 }, { t: 'commit' },
  ]
  const frozen = (o: Opts, h: number) => {
    const run = runScenario(scenario(h), o)
    const c = compare(run)
    expect(c.sameLog && c.sameDerived).toBe(true)
    const closed = [...run.devices[1].derived().closed.values()].map((e) => e.p).find((p) => p.kind === 'day_closed' && p.date === '2026-03-01')
    return closed && closed.kind === 'day_closed' ? { xp: closed.xp, credit: closed.credit } : null
  }
  it('naive rule: the phone’s 20 minutes are lost and the day is frozen at 5 XP / no credit', () => {
    expect(frozen({ ...FIXED, closeRule: 'naive' }, 30)).toEqual({ xp: 5, credit: 'none' })
  })
  it('settled rule: the laptop waits; the phone syncs 30 h later and the day closes at 25 XP / standard', () => {
    expect(frozen(FIXED, 30)).toEqual({ xp: 25, credit: 'standard' })
  })
  it('settled rule: a phone offline past the 72 h grace loses that day (accepted, bounded)', () => {
    expect(frozen(FIXED, 100)).toEqual({ xp: 5, credit: 'none' })
  })
})

describe('directed: a backwards clock correction after the phone proved it passed the day end', () => {
  const steps: Step[] = [
    { t: 'span', dev: 1, min: 1 }, // some study on the old day
    { t: 'sync', dev: 1 }, { t: 'commit' },
    { t: 'advance', min: 8 }, // 03:59 local, true time
    { t: 'skew', dev: 0, ms: 90_000 }, // phone thinks it is 04:00:30
    { t: 'sync', dev: 0 }, { t: 'commit' }, // phone writes a mark past the boundary
    { t: 'skew', dev: 1, ms: 120_000 },
    { t: 'sync', dev: 1 }, { t: 'commit' }, // laptop sees the phone’s proof and closes the day
    { t: 'sync', dev: 1 }, { t: 'commit' }, // and pushes the close
    { t: 'skew', dev: 0, ms: -60_000 }, // NTP pulls the phone back
    { t: 'span', dev: 0, min: 9 }, // stamped 03:58 without monotonic stamping: lands in the closed day
  ]
  it('without monotonic stamping the 9 minutes land in an already closed day', () => {
    expect(incompleteCloses(runScenario(steps, { ...FIXED, monotonic: false }), FIXED.derive)).not.toEqual([])
  })
  it('with monotonic stamping they land in the new day', () => {
    expect(incompleteCloses(runScenario(steps, FIXED), FIXED.derive)).toEqual([])
  })
})

describe('counterexamples against the design as written (one fix removed at a time)', () => {
  const diff = (o: Opts) => (steps: Step[]) => {
    const run = runScenario(steps, o)
    const [a, b] = run.devices
    return { phoneLog: a.log.size, laptopLog: b.log.size, server: run.server.all().length, ...(compare(run).sameDerived ? {} : { phone: compare(run).sa.slice(-400), laptop: compare(run).sb.slice(-400) }) }
  }

  it('identity seq + plain cursor: a row committed out of seq order is skipped forever', () => {
    const o = { ...FIXED, serverMode: 'identity' as const }
    expect(counterexample('identity cursor', converges(o), diff(o)).failed).toBe(true)
  })

  it('pull keeps the local copy on id conflict: two devices keep different day_closed payloads for the same id', () => {
    const o = { ...FIXED, replaceOnPull: false, closeRule: 'naive' as const }
    expect(counterexample('keep-local day_closed', converges(o), diff(o)).failed).toBe(true)
  })

  it('naive close (first device after midnight): the phone\'s offline study is frozen out of the day', () => {
    const o = { ...FIXED, closeRule: 'naive' as const }
    expect(counterexample('naive close', complete(o), (s) => incompleteCloses(runScenario(s, o), o.derive)).failed).toBe(true)
  })

  it('no device registration: a device that has never synced is unknown, so its study is not waited for', () => {
    const o = { ...FIXED, register: false }
    expect(counterexample('no registration', complete(o), (s) => incompleteCloses(runScenario(s, o), o.derive)).failed).toBe(true)
  })

  it('no causal clamp: the laptop is 2 min ahead, the phone pulls its review and reviews the same card; ts-fsrs throws', () => {
    const steps: Step[] = [
      { t: 'skew', dev: 1, ms: 120_000 },
      { t: 'review', dev: 1, card: 0, rating: 3 },
      { t: 'sync', dev: 1 }, { t: 'commit' },
      { t: 'sync', dev: 0 },
      { t: 'review', dev: 0, card: 0, rating: 3 },
    ]
    expect(() => runScenario(steps, { ...FIXED, causalClamp: false })).toThrow(/elapsedDays must be finite and non-negative/)
    const c = compare(runScenario(steps, FIXED))
    expect(c.sameLog && c.sameDerived).toBe(true)
  })

  it('device-local time zone for study days: open days and frozen days disagree', () => {
    const o = { ...FIXED, derive: { ...FIXED.derive, tzMode: 'local' as const } }
    expect(counterexample('local tz', converges(o, false), diff(o)).failed).toBe(true)
  })

  it('the design as written fails convergence', () => {
    expect(counterexample('as written', converges(AS_WRITTEN), diff(AS_WRITTEN)).failed).toBe(true)
  })
})
