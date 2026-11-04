import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { byTime, createEventLog, deterministicUuid, stamp, type EventEnvelope, type Remote } from '../index.ts'
import { MemoryStore } from '../testing.ts'
import { converged, runScenario, scenarioArb, stampsHold, type Mutations } from './harness.ts'

const RUNS = Number(process.env.RUNS ?? 500)

type Check = (run: Awaited<ReturnType<typeof runScenario>>) => Promise<boolean>

const holds = (m: Mutations, check: Check) =>
  fc.asyncProperty(scenarioArb, async (steps) => check(await runScenario(steps, m)))

// With shared ids the server's copy can replace a device's own event, so a device's stamps are
// only checkable on events no other device writes.
const stampsHoldFor = (m: Mutations) =>
  fc.asyncProperty(scenarioArb, async (steps) =>
    stampsHold(await runScenario(steps.map((s) => (s.t === 'note' ? { ...s, shared: false } : s)), m)))

describe('two-device sync', () => {
  it('leaves both devices with the server rows, under skew, lost acks and overlapping commits', async () => {
    await fc.assert(holds({}, converged), { numRuns: RUNS })
  })

  it('keeps per-device stamps monotonic and deviceSeq gap-free', async () => {
    await fc.assert(stampsHoldFor({}), { numRuns: RUNS })
  })
})

describe('each guarantee is load-bearing', () => {
  const fails = async (property: ReturnType<typeof holds>) =>
    (await fc.check(property, { numRuns: 3000, seed: 42 })).failed

  it('an identity seq with a plain cursor skips a row committed out of order', async () => {
    expect(await fails(holds({ serverMode: 'identity' }, converged))).toBe(true)
  })

  it('keeping the local copy on pull leaves two payloads under one id', async () => {
    expect(await fails(holds({ keepLocalOnPull: true }, converged))).toBe(true)
  })

  it('stamping from the raw clock lets time run backwards', async () => {
    expect(await fails(stampsHoldFor({ forgetStamps: true }))).toBe(true)
  })
})

describe('event log', () => {
  const remoteStub = (over: Partial<Remote> = {}): Remote => ({ push: async () => [], pull: async () => [], ...over })
  const logFor = (store: MemoryStore, remote: Remote = remoteStub()) =>
    createEventLog({ store, remote, clock: () => 1000, build: 'b1' })

  it('stamps no earlier than notBefore or the last stamp', () => {
    const meta = { deviceId: 'd', deviceSeq: 4, lastStamp: 500 }
    const draft = { kind: 'flag', v: 1, payload: { note: 'n' } } as const
    expect(stamp(meta, draft, { id: 'a', now: 100, build: 'b' }).event).toMatchObject({ occurredAt: 500, deviceSeq: 5 })
    expect(stamp(meta, draft, { id: 'a', now: 100, build: 'b', notBefore: 900 }).meta).toMatchObject({ lastStamp: 900, deviceSeq: 5 })
  })

  it('hello is recorded once per device and spends one deviceSeq', async () => {
    const store = new MemoryStore('phone')
    const log = logFor(store)
    const first = await log.hello()
    const second = await log.hello()
    expect(second.id).toBe(first.id)
    expect(first.id).toBe(deterministicUuid('device-hello', 'phone'))
    expect((await store.meta()).deviceSeq).toBe(1)
    expect(await store.outbox(10)).toHaveLength(1)
  })

  it('moves a rejected event to the dead-letter list so it can never wedge the queue', async () => {
    const store = new MemoryStore('phone')
    const remote = remoteStub({ push: async (batch) => [{ id: batch[0]!.id, error: 'bad payload' }] })
    const log = logFor(store, remote)
    const event = await log.record({ kind: 'flag', v: 1, payload: { note: 'n' } })
    expect(await log.flush()).toMatchObject({ ok: true, pushed: 1 })
    expect(await store.outbox(10)).toEqual([])
    expect(await store.deadLetters()).toEqual([{ id: event.id, error: 'bad payload' }])
  })

  it('keeps the outbox when the server is unreachable, and flush never rejects', async () => {
    const store = new MemoryStore('phone')
    const log = logFor(store, remoteStub({ push: async () => { throw new Error('offline') } }))
    await log.record({ kind: 'flag', v: 1, payload: { note: 'n' } })
    expect(await log.flush()).toMatchObject({ ok: false })
    expect(await store.outbox(10)).toHaveLength(1)
  })

  it('runs one flush at a time', async () => {
    let pulls = 0
    const log = logFor(new MemoryStore('phone'), remoteStub({ pull: async () => { pulls++; return [] } }))
    await Promise.all([log.flush(), log.flush(), log.flush()])
    expect(pulls).toBe(1)
  })

  it('orders by time, then id, never by seq', () => {
    const e = (id: string, occurredAt: number, seq: number) => ({ id, occurredAt, seq }) as EventEnvelope
    const sorted = [e('b', 1, 1), e('a', 1, 2), e('c', 0, 3)].sort(byTime)
    expect(sorted.map((x) => x.id)).toEqual(['c', 'a', 'b'])
  })
})
