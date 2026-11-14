// The manual backup against the real server: a device's export refills a fresh server, which a new
// device then pulls whole.
import 'fake-indexeddb/auto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { createEventLog, type EventEnvelope } from '@lang-learner/core'
import { startServer, type RunningServer } from '@lang-learner/server'
import { exportLog, readBackup, restore } from '../src/adapters/backup.ts'
import { httpRemote } from '../src/adapters/httpRemote.ts'
import { openIdbStore } from '../src/adapters/idbStore.ts'

const servers: RunningServer[] = []
afterAll(() => Promise.all(servers.map((s) => s.close())))

async function freshServer() {
  const dir = mkdtempSync(join(tmpdir(), 'web-backup-'))
  const server = await startServer({ port: 0, dbFile: join(dir, 'events.sqlite'), contentDir: dir })
  servers.push(server)
  return server
}

let n = 0
async function device(server: RunningServer) {
  const store = await openIdbStore(`backup-${n++}`)
  let now = Date.UTC(2026, 10, 13)
  return { store, log: createEventLog({ store, remote: httpRemote(server.url), clock: () => (now += 1000), build: 'test' }) }
}

const canonical = (events: EventEnvelope[]) => JSON.stringify(events.map(({ seq: _seq, ...e }) => e).sort((a, b) => (a.id < b.id ? -1 : 1)))

describe('backup', () => {
  it('refills a fresh server from an export, and a repeat restore adds nothing', async () => {
    const old = await freshServer()
    const phone = await device(old)
    await phone.log.hello()
    await phone.log.record({ kind: 'claim', v: 1, payload: { scope: 'stage', id: 'S0', as: 'known' } })
    await phone.log.record({ kind: 'watch', v: 1, payload: { title: 'Show', minutes: 12, date: '2026-11-12', subtitles: 'en', attention: 'straight', followed: 'some' } })
    await phone.log.flush()
    const file = await exportLog(await phone.store.events()).text()

    const fresh = await freshServer()
    const events = readBackup(file)
    expect(await restore(events, httpRemote(fresh.url))).toEqual({ sent: 3, rejected: [] })
    expect(await restore(events, httpRemote(fresh.url))).toEqual({ sent: 3, rejected: [] })

    const laptop = await device(fresh)
    expect(await laptop.log.flush()).toMatchObject({ ok: true, pulled: 3 })
    expect(canonical(await laptop.store.events())).toBe(canonical(await phone.store.events()))
  })

  it('refuses a file that is not a whole, valid backup', () => {
    expect(() => readBackup('nope')).toThrow(/JSON/)
    expect(() => readBackup(JSON.stringify({ events: [] }))).toThrow(/this app/)
    expect(() => readBackup(JSON.stringify({ format: 'lang-learner-events', version: 1, events: [{ id: 'x' }] }))).toThrow(/Event 1/)
  })
})
