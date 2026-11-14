// The manual backup (README Stack row, Backups): the full event log as one file, and a restore that
// pushes a file's events to the server. Push is idempotent, so restoring into a server that already
// has some of them adds only what it lacks, and a fresh server comes back whole.
import { byTime, validateEvent, type EventEnvelope, type Rejection, type Remote } from '@lang-learner/core'

/** The file's format tag. A file without it isn't a backup of this app. */
const FORMAT = 'lang-learner-events'
const VERSION = 1
/** Under the server's per-push limit. */
const BATCH = 500

/** The log as a JSON file, in time order. `seq` is dropped: the server assigns its own. */
export function exportLog(events: readonly EventEnvelope[], now = Date.now()): Blob {
  const rows = [...events].sort(byTime).map(({ seq: _seq, ...e }) => e)
  return new Blob([JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: now, events: rows })], { type: 'application/json' })
}

/** A file name for an export, by the device's local date. */
export function exportName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `lang-learner-events-${d}.json`
}

/** The events in a backup file. Throws, naming what's wrong, for anything else; never returns a partial log. */
export function readBackup(text: string): EventEnvelope[] {
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    throw new Error("This file isn't a backup: it isn't JSON.")
  }
  const b = body as { format?: unknown; version?: unknown; events?: unknown }
  if (b?.format !== FORMAT || b.version !== VERSION || !Array.isArray(b.events)) throw new Error("This file isn't a backup from this app.")
  b.events.forEach((e, i) => {
    const bad = validateEvent(e)
    if (bad) throw new Error(`Event ${i + 1} in the file isn't valid: ${bad}`)
  })
  return b.events as EventEnvelope[]
}

/** Pushes every event to the server in batches. Rejects when the server can't be reached. */
export async function restore(events: readonly EventEnvelope[], remote: Remote): Promise<{ sent: number; rejected: Rejection[] }> {
  const rejected: Rejection[] = []
  for (let i = 0; i < events.length; i += BATCH) rejected.push(...(await remote.push(events.slice(i, i + BATCH))))
  return { sent: events.length, rejected }
}
