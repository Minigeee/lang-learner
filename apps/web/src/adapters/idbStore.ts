import { newEventId, type DeviceMeta, type EventEnvelope, type LocalStore, type Rejection } from '@lang-learner/core'

const VERSION = 1
const META_KEY = 'device'
const CURSOR_KEY = 'cursor'

type Stores = 'events' | 'outbox' | 'meta' | 'dead'

function request<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function committed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = tx.onerror = () => reject(tx.error)
  })
}

function open(name: string): Promise<IDBDatabase> {
  const r = indexedDB.open(name, VERSION)
  r.onupgradeneeded = () => {
    const db = r.result
    db.createObjectStore('events', { keyPath: 'id' })
    // Auto-increment keys keep the outbox FIFO.
    db.createObjectStore('outbox', { autoIncrement: true }).createIndex('id', 'id', { unique: true })
    db.createObjectStore('meta')
    db.createObjectStore('dead', { keyPath: 'id' })
  }
  return request(r)
}

/** Opens the device's log, creating its id on first use. Each method is one IndexedDB transaction. */
export async function openIdbStore(name = 'lang-learner'): Promise<LocalStore> {
  const db = await open(name)
  const tx = (stores: Stores[], mode: IDBTransactionMode = 'readonly') => db.transaction(stores, mode)

  async function readMeta(): Promise<DeviceMeta> {
    const t = tx(['meta'], 'readwrite')
    const store = t.objectStore('meta')
    const existing = await request<DeviceMeta | undefined>(store.get(META_KEY))
    if (existing) return existing
    const fresh = { deviceId: newEventId(Date.now()), deviceSeq: 0, lastStamp: -Infinity }
    store.put(fresh, META_KEY)
    await committed(t)
    return fresh
  }
  await readMeta()

  return {
    meta: readMeta,

    async append(id, make) {
      const t = tx(['events', 'outbox', 'meta'], 'readwrite')
      const events = t.objectStore('events')
      const metaStore = t.objectStore('meta')
      const existing = await request<EventEnvelope | undefined>(events.get(id))
      if (existing) return existing
      const current = await request<DeviceMeta>(metaStore.get(META_KEY))
      const { event, meta } = make(current)
      events.put(event)
      t.objectStore('outbox').add({ id })
      metaStore.put(meta, META_KEY)
      await committed(t)
      return event
    },

    async outbox(limit) {
      const t = tx(['events', 'outbox'])
      const entries = await request<{ id: string }[]>(t.objectStore('outbox').getAll(undefined, limit))
      const events = t.objectStore('events')
      return Promise.all(entries.map(({ id }) => request<EventEnvelope>(events.get(id))))
    },

    async settle(pushed, rejected) {
      const t = tx(['outbox', 'dead'], 'readwrite')
      const index = t.objectStore('outbox').index('id')
      const outbox = t.objectStore('outbox')
      for (const id of pushed) {
        const key = await request(index.getKey(id))
        if (key !== undefined) outbox.delete(key)
      }
      for (const r of rejected) t.objectStore('dead').put(r)
      await committed(t)
    },

    async applyPulled(rows) {
      const t = tx(['events', 'meta'], 'readwrite')
      const metaStore = t.objectStore('meta')
      const cursor = (await request<number | undefined>(metaStore.get(CURSOR_KEY))) ?? 0
      for (const row of rows) t.objectStore('events').put(row)
      metaStore.put(Math.max(cursor, ...rows.map((r) => r.seq ?? 0)), CURSOR_KEY)
      await committed(t)
    },

    async cursor() {
      return (await request<number | undefined>(tx(['meta']).objectStore('meta').get(CURSOR_KEY))) ?? 0
    },

    events: () => request<EventEnvelope[]>(tx(['events']).objectStore('events').getAll()),
    deadLetters: () => request<Rejection[]>(tx(['dead']).objectStore('dead').getAll()),
  }
}
