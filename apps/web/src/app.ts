import { createEventLog, type EventLog, type LocalStore } from '@lang-learner/core'
import { openIdbStore } from './adapters/idbStore.ts'
import { supabaseRemote } from './adapters/supabaseRemote.ts'
import { supabase } from './adapters/auth.ts'

export interface AppLog {
  store: LocalStore
  log: EventLog
}

/** Starts the event log for a signed-in owner, and keeps it flushing (architecture §5). */
export async function startEventLog(onSynced: () => void): Promise<AppLog> {
  const store = await openIdbStore()
  const log = createEventLog({ store, remote: supabaseRemote(supabase), clock: Date.now, build: __BUILD__ })
  const flush = () => log.flush().then(onSynced)
  await log.hello()
  void flush()
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void flush() })
  window.addEventListener('online', () => void flush())
  return { store, log }
}
