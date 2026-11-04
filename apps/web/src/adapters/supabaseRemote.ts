import type { SupabaseClient } from '@supabase/supabase-js'
import type { EventEnvelope, Rejection, Remote } from '@lang-learner/core'

interface EventRow {
  id: string
  seq: number
  kind: string
  v: number
  lang: string | null
  occurred_at: string
  device_id: string
  device_seq: number
  build: string
  payload: unknown
}

const COLUMNS = 'id, seq, kind, v, lang, occurred_at, device_id, device_seq, build, payload'

const toRow = (e: EventEnvelope) => ({
  id: e.id,
  kind: e.kind,
  v: e.v,
  lang: e.lang,
  occurred_at: new Date(e.occurredAt).toISOString(),
  device_id: e.deviceId,
  device_seq: e.deviceSeq,
  build: e.build,
  payload: e.payload,
})

const fromRow = (r: EventRow): EventEnvelope => ({
  id: r.id,
  seq: r.seq,
  kind: r.kind,
  v: r.v,
  lang: r.lang,
  occurredAt: Date.parse(r.occurred_at),
  deviceId: r.device_id,
  deviceSeq: r.device_seq,
  build: r.build,
  payload: r.payload,
})

/** The only place that knows the database's column names. */
export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async push(batch) {
      const { data, error } = await client.rpc('push_events', { batch: batch.map(toRow) })
      if (error) throw error
      return (data ?? []) as Rejection[]
    },
    async pull(afterSeq, limit) {
      const { data, error } = await client.from('events').select(COLUMNS).gt('seq', afterSeq).order('seq').limit(limit)
      if (error) throw error
      return (data as EventRow[]).map(fromRow)
    },
  }
}
