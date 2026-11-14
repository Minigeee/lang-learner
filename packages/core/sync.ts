import { deterministicUuid, newEventId } from './ids.ts'
import { stamp, stampTime, type DeviceMeta, type EventDraft, type EventEnvelope, type StampOptions } from './events.ts'

/** The server refused this event for good, so it must never block the queue. */
export interface Rejection {
  id: string
  error: string
}

/** The device's durable log. Each method is atomic. */
export interface LocalStore {
  meta(): Promise<DeviceMeta>
  /**
   * Stores the event, its outbox entry and the new device meta in one atomic write. If `id` is already
   * stored, returns that event and leaves the meta alone, so a repeat doesn't consume a deviceSeq.
   */
  append(id: string, make: (meta: DeviceMeta) => { event: EventEnvelope; meta: DeviceMeta }): Promise<EventEnvelope>
  /** The oldest unsent events, oldest first. */
  outbox(limit: number): Promise<EventEnvelope[]>
  /** Clears `pushed` from the outbox and moves `rejected` to the dead-letter list. */
  settle(pushed: string[], rejected: Rejection[]): Promise<void>
  /** Overwrites local copies by id, since the server row is authoritative, and advances the cursor. */
  applyPulled(rows: EventEnvelope[]): Promise<void>
  cursor(): Promise<number>
  events(): Promise<EventEnvelope[]>
  deadLetters(): Promise<Rejection[]>
}

/** The server. Both methods throw when it can't be reached. */
export interface Remote {
  /** Idempotent: an id the server already has is skipped. Resolves to the events it refused. */
  push(batch: EventEnvelope[]): Promise<Rejection[]>
  /** Events with `seq > afterSeq`, in seq order, at most `limit` and possibly fewer. Empty means caught up. */
  pull(afterSeq: number, limit: number): Promise<EventEnvelope[]>
}

export type FlushResult = { ok: true; pushed: number; pulled: number } | { ok: false; error: unknown }

export interface EventLog {
  /**
   * Resolves once the event is durable on this device. A draft may be a function of the event's final
   * `occurredAt`, for payloads that depend on when they're stamped, such as a review.
   */
  record(draft: EventDraft | ((occurredAt: number) => EventDraft), o?: Pick<StampOptions, 'lang' | 'notBefore'> & { id?: string }): Promise<EventEnvelope>
  /** Records this device's `hello`, once per device, so other devices know to wait for it. */
  hello(): Promise<EventEnvelope>
  /** Pushes the outbox, then pulls until caught up. Concurrent calls share one run. Never rejects. */
  flush(): Promise<FlushResult>
}

const PUSH_BATCH = 200
const PULL_PAGE = 500

export function createEventLog(deps: {
  store: LocalStore
  remote: Remote
  clock: () => number
  build: string
  pushBatch?: number
  pullPage?: number
}): EventLog {
  const { store, remote, clock, build, pushBatch = PUSH_BATCH, pullPage = PULL_PAGE } = deps
  let running: Promise<FlushResult> | null = null

  const record: EventLog['record'] = (draft, o = {}) => {
    const now = clock()
    const id = o.id ?? newEventId(now)
    const options: StampOptions = {
      id,
      now,
      build,
      ...(o.lang !== undefined && { lang: o.lang }),
      ...(o.notBefore !== undefined && { notBefore: o.notBefore }),
    }
    return store.append(id, (meta) => stamp(meta, typeof draft === 'function' ? draft(stampTime(meta, options)) : draft, options))
  }

  async function run(): Promise<FlushResult> {
    try {
      let pushed = 0
      for (;;) {
        const batch = await store.outbox(pushBatch)
        if (batch.length === 0) break
        const rejected = await remote.push(batch)
        await store.settle(batch.map((e) => e.id), rejected)
        pushed += batch.length
      }
      let pulled = 0
      for (;;) {
        // A short page isn't the end: only an empty one says the device has caught up.
        const rows = await remote.pull(await store.cursor(), pullPage)
        if (rows.length === 0) break
        await store.applyPulled(rows)
        pulled += rows.length
      }
      return { ok: true, pushed, pulled }
    } catch (error) {
      return { ok: false, error }
    }
  }

  return {
    record,
    async hello() {
      const { deviceId } = await store.meta()
      return record({ kind: 'device', v: 1, payload: { reason: 'hello' } }, { id: deterministicUuid('device-hello', deviceId) })
    },
    flush() {
      running ??= run().finally(() => { running = null })
      return running
    },
  }
}
