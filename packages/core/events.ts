import type { Lang } from './ids.ts'

/**
 * One fact in the append-only log. TypeScript is camelCase and the database is snake_case; only the
 * Remote adapter maps between them. `occurredAt` is integer milliseconds.
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

/** What a caller records. Unknown kinds pulled from a newer build are stored as they arrive. */
export type EventDraft =
  | { kind: 'device'; v: 1; payload: { reason: 'hello' } }
  | { kind: 'flag'; v: 1; payload: { note: string; target?: string } }

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

/** Stamps a draft. A device's stamps never go backwards, even when its clock does. */
export function stamp(meta: DeviceMeta, draft: EventDraft, o: StampOptions): { event: EventEnvelope; meta: DeviceMeta } {
  const occurredAt = Math.max(o.now, o.notBefore ?? -Infinity, meta.lastStamp)
  const deviceSeq = meta.deviceSeq + 1
  return {
    event: { ...draft, id: o.id, lang: o.lang ?? null, occurredAt, deviceId: meta.deviceId, deviceSeq, build: o.build },
    meta: { ...meta, deviceSeq, lastStamp: occurredAt },
  }
}
