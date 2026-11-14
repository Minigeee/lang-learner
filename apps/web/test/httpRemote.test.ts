// The web app's sync adapters against the real server: two devices, each with its own IndexedDB log.
import 'fake-indexeddb/auto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createEventLog, type EventEnvelope } from '@lang-learner/core'
import { startServer, type RunningServer } from '@lang-learner/server'
import { httpRemote } from '../src/adapters/httpRemote.ts'
import { openIdbStore } from '../src/adapters/idbStore.ts'

let server: RunningServer
let n = 0

beforeAll(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'web-sync-'))
  server = await startServer({ port: 0, dbFile: join(dir, 'events.sqlite'), contentDir: dir })
})
afterAll(() => server.close())

async function device() {
  const store = await openIdbStore(`device-${n++}`)
  let now = Date.UTC(2026, 10, 13)
  const log = createEventLog({ store, remote: httpRemote(server.url), clock: () => (now += 1000), build: 'test', pullPage: 2 })
  return { store, log }
}

const canonical = (events: EventEnvelope[]) => JSON.stringify([...events].sort((a, b) => (a.id < b.id ? -1 : 1)))

describe('httpRemote with the server', () => {
  it('leaves two devices with the same log, paging through short pulls', async () => {
    const phone = await device()
    const laptop = await device()
    await phone.log.hello()
    await laptop.log.hello()
    for (let i = 0; i < 3; i++) await phone.log.record({ kind: 'flag', v: 1, payload: { note: `phone ${i}` } })
    await laptop.log.record({ kind: 'flag', v: 1, payload: { note: 'laptop' } })
    expect(await phone.log.flush()).toMatchObject({ ok: true, pushed: 4 })
    expect(await laptop.log.flush()).toMatchObject({ ok: true, pushed: 2, pulled: 6 })
    expect(await phone.log.flush()).toMatchObject({ ok: true, pushed: 0 })
    expect(canonical(await phone.store.events())).toBe(canonical(await laptop.store.events()))
    expect(await phone.store.outbox(10)).toEqual([])
  })

  it('dead-letters an event the server refuses, and keeps syncing the rest', async () => {
    const phone = await device()
    const bad = await phone.log.record({ kind: 'flag', v: 1, payload: { note: '' } })
    const good = await phone.log.record({ kind: 'flag', v: 1, payload: { note: 'fine' } })
    expect(await phone.log.flush()).toMatchObject({ ok: true })
    expect((await phone.store.deadLetters()).map((r) => r.id)).toEqual([bad.id])
    expect((await phone.store.events()).find((e) => e.id === good.id)?.seq).toBeGreaterThan(0)
  })

  it('keeps the outbox when the server is unreachable', async () => {
    const store = await openIdbStore(`device-${n++}`)
    const log = createEventLog({ store, remote: httpRemote('http://127.0.0.1:9'), clock: Date.now, build: 'test' })
    await log.record({ kind: 'flag', v: 1, payload: { note: 'offline' } })
    expect(await log.flush()).toMatchObject({ ok: false })
    expect(await store.outbox(10)).toHaveLength(1)
  })
})
