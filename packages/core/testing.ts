import type { DeviceMeta, EventEnvelope } from './events.ts'
import type { LocalStore, Rejection } from './sync.ts'

/** In-memory LocalStore for tests. `mutations` each remove one guarantee, to prove the tests notice. */
export class MemoryStore implements LocalStore {
  private log = new Map<string, EventEnvelope>()
  private queue: string[] = []
  private dead: Rejection[] = []
  private seqCursor = 0
  private device: DeviceMeta

  constructor(deviceId: string, private mutations: { keepLocalOnPull?: boolean; forgetStamps?: boolean } = {}) {
    this.device = { deviceId, deviceSeq: 0, lastStamp: -Infinity }
  }

  async meta() { return { ...this.device } }

  async append(id: string, make: (m: DeviceMeta) => { event: EventEnvelope; meta: DeviceMeta }) {
    const existing = this.log.get(id)
    if (existing) return existing
    const base = this.mutations.forgetStamps ? { ...this.device, lastStamp: -Infinity } : this.device
    const { event, meta } = make(base)
    this.device = meta
    this.log.set(id, event)
    this.queue.push(id)
    return event
  }

  async outbox(limit: number) { return this.queue.slice(0, limit).map((id) => this.log.get(id)!) }

  async settle(pushed: string[], rejected: Rejection[]) {
    const done = new Set(pushed)
    this.queue = this.queue.filter((id) => !done.has(id))
    this.dead.push(...rejected)
  }

  async applyPulled(rows: EventEnvelope[]) {
    for (const row of rows) {
      if (!this.mutations.keepLocalOnPull || !this.log.has(row.id)) this.log.set(row.id, row)
      this.seqCursor = Math.max(this.seqCursor, row.seq!)
    }
  }

  async cursor() { return this.seqCursor }
  async events() { return [...this.log.values()] }
  async deadLetters() { return [...this.dead] }
}
