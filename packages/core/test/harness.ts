// Two-device scenario runner for the sync properties, ported from the sync-replay spike. The server
// is simulated, because the property is about ordering under overlapping commits, which a real
// database can't be driven through step by step. test/db/ checks the real one.
import fc from 'fast-check'
import { createEventLog, type EventEnvelope, type EventLog, type Rejection, type Remote } from '../index.ts'
import { MemoryStore } from '../testing.ts'

export type ServerMode =
  | 'identity' // seq taken when the insert starts, visible at commit: a plain Postgres identity column
  | 'serialized' // inserts take a lock, so seq order equals commit order: push_events

interface Txn { rows: EventEnvelope[]; ack: () => void; lose: () => void }

export class MemoryServer {
  rows: EventEnvelope[] = []
  private ids = new Set<string>()
  private nextSeq = 1
  private open: Txn[] = []

  constructor(private mode: ServerMode) {}

  /** A push stays open until `commit` runs. */
  begin(batch: EventEnvelope[], ack: () => void, lose: () => void) {
    const rows = this.mode === 'identity' ? batch.map((e) => ({ ...e, seq: this.nextSeq++ })) : batch.map((e) => ({ ...e }))
    this.open.push({ rows, ack, lose })
  }

  get pending() { return this.open.length }

  /** Commits the open push at `index`. With `lostAck`, the commit lands but the device never hears. */
  commit(index: number, lostAck = false) {
    const [txn] = this.open.splice(index, 1)
    if (!txn) return
    for (const row of txn.rows) {
      if (this.ids.has(row.id)) continue
      this.ids.add(row.id)
      this.rows.push(this.mode === 'serialized' ? { ...row, seq: this.nextSeq++ } : row)
    }
    this.rows.sort((a, b) => a.seq! - b.seq!)
    if (lostAck) txn.lose()
    else txn.ack()
  }

  pull(cursor: number, limit: number) {
    return this.rows.filter((e) => e.seq! > cursor).slice(0, limit).map((e) => ({ ...e }))
  }
}

export interface Mutations {
  serverMode?: ServerMode
  keepLocalOnPull?: boolean
  forgetStamps?: boolean
}

/** Lets every in-memory promise chain run until it finishes or waits on an open push. */
const tick = () => new Promise((resolve) => setImmediate(resolve))

class Device {
  store: MemoryStore
  log: EventLog
  online = true
  skewMs = 0

  constructor(id: string, server: MemoryServer, clock: () => number, m: Mutations) {
    this.store = new MemoryStore(id, m)
    const remote: Remote = {
      push: (batch) => {
        if (!this.online) return Promise.reject(new Error('offline'))
        return new Promise<Rejection[]>((resolve, reject) => {
          server.begin(batch, () => resolve([]), () => reject(new Error('lost ack')))
        })
      },
      pull: async (cursor, limit) => {
        if (!this.online) throw new Error('offline')
        return server.pull(cursor, limit)
      },
    }
    this.log = createEventLog({ store: this.store, remote, clock: () => clock() + this.skewMs, build: 'test', pushBatch: 4, pullPage: 3 })
  }
}

export type Step =
  | { t: 'note'; dev: number; shared: boolean }
  | { t: 'sync'; dev: number }
  | { t: 'commit'; index: number; lostAck: boolean }
  | { t: 'net'; dev: number; online: boolean }
  | { t: 'skew'; dev: number; ms: number }
  | { t: 'advance'; ms: number }

const dev = fc.integer({ min: 0, max: 1 })
const stepArb: fc.Arbitrary<Step> = fc.oneof(
  { weight: 6, arbitrary: fc.record({ t: fc.constant('note' as const), dev, shared: fc.boolean() }) },
  { weight: 4, arbitrary: fc.record({ t: fc.constant('sync' as const), dev }) },
  { weight: 4, arbitrary: fc.record({ t: fc.constant('commit' as const), index: fc.integer({ min: 0, max: 1 }), lostAck: fc.boolean() }) },
  { weight: 2, arbitrary: fc.record({ t: fc.constant('net' as const), dev, online: fc.boolean() }) },
  { weight: 2, arbitrary: fc.record({ t: fc.constant('skew' as const), dev, ms: fc.integer({ min: -120_000, max: 120_000 }) }) },
  { weight: 2, arbitrary: fc.record({ t: fc.constant('advance' as const), ms: fc.constantFrom(1, 1000, 60_000) }) },
)
export const scenarioArb = fc.array(stepArb, { minLength: 5, maxLength: 60 })

export interface Run { server: MemoryServer; devices: Device[] }

export async function runScenario(steps: Step[], m: Mutations = {}): Promise<Run> {
  let now = Date.UTC(2026, 2, 1)
  const server = new MemoryServer(m.serverMode ?? 'serialized')
  const devices = ['phone', 'laptop'].map((id) => new Device(id, server, () => now, m))
  let shared = 0

  const settle = async () => {
    await tick()
    while (server.pending > 0) {
      server.commit(0)
      await tick()
    }
  }

  for (const s of steps) {
    switch (s.t) {
      case 'note': {
        const d = devices[s.dev]!
        // A shared note uses one deterministic id with a per-device payload, as a day close will.
        const id = s.shared ? `shared-${Math.floor(++shared / 2)}` : undefined
        await d.log.record({ kind: 'flag', v: 1, payload: { note: `from ${s.dev}` } }, id ? { id } : {})
        break
      }
      case 'sync': void devices[s.dev]!.log.flush(); await tick(); break
      case 'commit':
        server.commit(s.index, s.lostAck)
        await tick()
        break
      case 'net': devices[s.dev]!.online = s.online; break
      case 'skew': devices[s.dev]!.skewMs = s.ms; break
      case 'advance': now += s.ms; break
    }
  }

  // Full sync: everything lands, then both devices catch up.
  for (const d of devices) d.online = true
  await settle()
  for (let round = 0; round < 3; round++) {
    for (const d of devices) {
      void d.log.flush()
      await settle()
    }
  }
  return { server, devices }
}

const canonical = (events: EventEnvelope[]) =>
  JSON.stringify([...events].sort((a, b) => (a.id < b.id ? -1 : 1)))

/** After a full sync, both devices hold the server's exact rows. */
export async function converged(run: Run) {
  const server = canonical(run.server.rows)
  for (const d of run.devices) if (canonical(await d.store.events()) !== server) return false
  return true
}

/** Each device's own events never go back in time, and its deviceSeq has no gaps. */
export async function stampsHold(run: Run) {
  for (const d of run.devices) {
    const { deviceId } = await d.store.meta()
    const mine = (await d.store.events()).filter((e) => e.deviceId === deviceId).sort((a, b) => a.deviceSeq - b.deviceSeq)
    for (const [i, e] of mine.entries()) {
      if (e.deviceSeq !== i + 1) return false
      if (i > 0 && e.occurredAt < mine[i - 1]!.occurredAt) return false
    }
  }
  return true
}
