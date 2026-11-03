// In-memory stand-in for the Supabase events table.
// mode 'identity': seq is taken when the insert starts and the row becomes visible at commit
//   (how a Postgres identity column behaves under concurrent transactions).
// mode 'serialized': inserts take a per-user lock, so seq order equals commit order.
import type { Ev } from './events.ts'

export type ServerMode = 'identity' | 'serialized'

interface Txn { id: number; rows: Ev[] }

export class Server {
  private rows: Ev[] = [] // committed, in seq order once sorted
  private ids = new Set<string>()
  private nextSeq = 1
  private open: Txn[] = []
  private txnCounter = 0
  constructor(readonly mode: ServerMode = 'serialized') {}

  /** Starts `insert … on conflict (id) do nothing`. Returns a txn handle to commit later. */
  begin(batch: Ev[]): number {
    const t: Txn = { id: ++this.txnCounter, rows: [] }
    if (this.mode === 'identity') {
      for (const e of batch) t.rows.push({ ...e, seq: this.nextSeq++ })
    } else {
      t.rows = batch.map((e) => ({ ...e }))
    }
    this.open.push(t)
    return t.id
  }

  commit(txnId: number): void {
    const i = this.open.findIndex((t) => t.id === txnId)
    if (i < 0) return
    const [t] = this.open.splice(i, 1)
    for (const e of t.rows) {
      if (this.ids.has(e.id)) continue // on conflict do nothing (seq is burned, as in Postgres)
      const row = this.mode === 'serialized' ? { ...e, seq: this.nextSeq++ } : e
      this.ids.add(e.id)
      this.rows.push(row)
    }
    this.rows.sort((a, b) => a.seq! - b.seq!)
  }

  push(batch: Ev[]): void { this.commit(this.begin(batch)) }

  pendingTxns(): number[] { return this.open.map((t) => t.id) }

  /** select … where seq > cursor order by seq (committed rows only). */
  pull(cursor: number): Ev[] { return this.rows.filter((e) => e.seq! > cursor).map((e) => ({ ...e })) }

  all(): Ev[] { return this.rows.map((e) => ({ ...e })) }
}
