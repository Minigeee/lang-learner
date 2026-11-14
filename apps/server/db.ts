// The events file. The only module that knows the SQLite driver and the snake_case columns.
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { validateEvent, type EventEnvelope, type Rejection } from '@lang-learner/core'

export interface EventsDb {
  /**
   * Validates each event and inserts the valid ones in one immediate transaction, so pushes are
   * serialized and seq order equals commit order. A known id is skipped. Returns the refused events.
   */
  push(events: readonly unknown[]): Rejection[]
  /** Up to `limit` events with seq > `after`, in seq order. */
  pull(after: number, limit: number): EventEnvelope[]
  close(): void
}

interface Row {
  seq: number
  id: string
  kind: string
  v: number
  lang: string | null
  occurred_at: number
  device_id: string
  device_seq: number
  build: string
  payload: string
}

const SCHEMA = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')

/** Opens (or creates) the events file. */
export function openEventsDb(file: string): EventsDb {
  const db = new DatabaseSync(file)
  db.exec('pragma journal_mode = wal; pragma synchronous = normal; pragma busy_timeout = 5000;')
  db.exec(SCHEMA)
  const insert = db.prepare(`insert into events (id, kind, v, lang, occurred_at, device_id, device_seq, build, payload)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?) on conflict (id) do nothing`)
  const page = db.prepare('select * from events where seq > ? order by seq limit ?')

  return {
    push(events) {
      const rejected: Rejection[] = []
      const valid: EventEnvelope[] = []
      for (const e of events) {
        const error = validateEvent(e)
        if (error) rejected.push({ id: idOf(e), error })
        else valid.push(e as EventEnvelope)
      }
      if (valid.length === 0) return rejected
      db.exec('begin immediate')
      try {
        for (const e of valid) {
          insert.run(e.id, e.kind, e.v, e.lang, e.occurredAt, e.deviceId, e.deviceSeq, e.build, JSON.stringify(e.payload))
        }
        db.exec('commit')
      } catch (error) {
        db.exec('rollback')
        throw error
      }
      return rejected
    },
    pull(after, limit) {
      return (page.all(after, limit) as unknown as Row[]).map((r) => ({
        id: r.id, kind: r.kind, v: r.v, lang: r.lang, occurredAt: r.occurred_at, deviceId: r.device_id,
        deviceSeq: r.device_seq, build: r.build, payload: JSON.parse(r.payload) as unknown, seq: r.seq,
      }))
    },
    close: () => db.close(),
  }
}

const idOf = (e: unknown): string =>
  typeof e === 'object' && e !== null && typeof (e as { id?: unknown }).id === 'string' ? (e as { id: string }).id : ''
