// The server against a real SQLite file over real HTTP: the sync contract (architecture §5) and the
// static routes. The web app's adapter has its own contract test against this server.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { newEventId, type EventEnvelope } from '@lang-learner/core'
import { startServer, type RunningServer } from '../http.ts'

const scratch = () => mkdtempSync(join(tmpdir(), 'server-'))

const event = (over: Partial<EventEnvelope> = {}): EventEnvelope => ({
  id: newEventId(Date.now()),
  kind: 'flag',
  v: 1,
  lang: null,
  occurredAt: 1_790_000_000_123,
  deviceId: 'd1',
  deviceSeq: 1,
  build: 'test',
  payload: { note: 'n' },
  ...over,
})

let server: RunningServer
let dir: string

const push = async (events: unknown[]) => {
  const res = await fetch(`${server.url}/sync/push`, { method: 'POST', body: JSON.stringify({ events }), headers: { 'content-type': 'application/json' } })
  return { status: res.status, body: (await res.json()) as { rejected: { id: string; error: string }[] } }
}
const pull = async (after: number, limit = 1000) => {
  const res = await fetch(`${server.url}/sync/pull?after=${after}&limit=${limit}`)
  expect(res.status).toBe(200)
  return ((await res.json()) as { events: EventEnvelope[] }).events
}

beforeAll(async () => {
  dir = scratch()
  const content = join(dir, 'content')
  mkdirSync(join(content, 'files'), { recursive: true })
  mkdirSync(join(content, 'media'), { recursive: true })
  writeFileSync(join(content, 'files', 'abc.json'), '{"a":1}')
  writeFileSync(join(content, 'media', 'abc.opus'), 'OggS')
  const web = join(dir, 'web')
  mkdirSync(join(web, 'assets'), { recursive: true })
  writeFileSync(join(web, 'index.html'), '<!doctype html>')
  writeFileSync(join(web, 'assets', 'app-1234.js'), 'export {}')
  writeFileSync(join(dir, 'secret.txt'), 'outside')
  server = await startServer({ port: 0, dbFile: join(dir, 'events.sqlite'), contentDir: content, webDir: web })
})

afterAll(() => server.close())

describe('sync', () => {
  it('round-trips an event without changing it', async () => {
    const sent = event({ lang: 'zh', payload: { note: 'round trip', target: 'x' } })
    expect((await push([sent])).body.rejected).toEqual([])
    const { seq, ...back } = (await pull(0)).find((r) => r.id === sent.id)!
    expect(seq).toBeGreaterThan(0)
    expect(back).toEqual(sent)
  })

  it('treats a re-push as a no-op', async () => {
    const sent = event()
    await push([sent])
    await push([{ ...sent, payload: { note: 'changed' } }])
    const rows = (await pull(0)).filter((r) => r.id === sent.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.payload).toEqual({ note: 'n' })
  })

  it('returns each malformed event as a rejection and keeps the rest of the batch', async () => {
    const good = event()
    const bad = [
      event({ build: null as unknown as string }),
      event({ kind: 'not-a-kind' }),
      event({ v: 2 }),
      event({ kind: 'trial', payload: { itemId: 'zh:sc:tone-1234' } }),
      event({ occurredAt: 1.5 }),
    ]
    const { body } = await push([...bad, good])
    expect(body.rejected.map((r) => r.id)).toEqual(bad.map((e) => e.id))
    expect(body.rejected.every((r) => r.error.length > 0)).toBe(true)
    const ids = new Set((await pull(0)).map((r) => r.id))
    expect(ids.has(good.id)).toBe(true)
    expect(bad.some((e) => ids.has(e.id))).toBe(false)
  })

  it('accepts every kind the app records', async () => {
    const ref = { lessonId: 'zh:les:tone-shapes', lessonHash: 'h', run: 'r' }
    const events = [
      event({ kind: 'device', payload: { reason: 'hello' } }),
      event({ kind: 'lesson_cursor', payload: { ...ref, step: 0 } }),
      event({ kind: 'lesson_cursor', payload: { ...ref, step: 'done' } }),
      event({ kind: 'trial', payload: { ...ref, step: 3, key: '1', attempt: 1, itemId: 'zh:sc:tone-1234', widget: 'pick@1', mode: 'lesson', correct: true, recycled: false } }),
      event({ kind: 'exposure', payload: { type: 'clip', clipId: 'clip:ac-ma1', speaker: 'spk:audio-cmn', lessonId: null } }),
      event({ kind: 'exposure', payload: { type: 'video', youtubeId: 'abc', role: 'main', durationSec: 802, lessonId: 'zh:les:ma-yes-no', via: 'played' } }),
    ]
    expect((await push(events)).body.rejected).toEqual([])
  })

  it('refuses a body that is not a push', async () => {
    expect((await push('nope' as unknown as unknown[])).status).toBe(400)
    const res = await fetch(`${server.url}/sync/push`, { method: 'POST', body: '{not json' })
    expect(res.status).toBe(400)
    expect((await fetch(`${server.url}/sync/pull?after=-1`)).status).toBe(400)
  })

  it('keeps seq in commit order across concurrent pushes, so a cursor never skips', async () => {
    let cursor = Math.max(0, ...(await pull(0)).map((r) => r.seq!))
    const seen = new Set<string>()
    const batches = Array.from({ length: 40 }, () => Array.from({ length: 5 }, () => event()))
    const pushes = batches.map((batch) => push(batch))
    let done = false
    const puller = (async () => {
      while (!done) {
        for (const row of await pull(cursor)) {
          seen.add(row.id)
          cursor = row.seq!
        }
      }
    })()
    await Promise.all(pushes)
    done = true
    await puller
    for (const row of await pull(cursor)) seen.add(row.id)
    expect(batches.flat().filter((e) => !seen.has(e.id))).toEqual([])
  })

  it('pulls in seq order and honors the limit', async () => {
    await push([event(), event(), event()])
    const page = await pull(0, 2)
    expect(page).toHaveLength(2)
    expect(page[0]!.seq!).toBeLessThan(page[1]!.seq!)
    const all = await pull(0)
    expect(all.map((r) => r.seq)).toEqual([...all.map((r) => r.seq!)].sort((a, b) => a - b))
  })

  it('keeps the events when the server restarts on the same file', async () => {
    const sent = event()
    await push([sent])
    const dbFile = join(dir, 'events.sqlite')
    const again = await startServer({ port: 0, dbFile, contentDir: join(dir, 'content') })
    try {
      const res = await fetch(`${again.url}/sync/pull?after=0&limit=1000`)
      const { events } = (await res.json()) as { events: EventEnvelope[] }
      expect(events.some((r) => r.id === sent.id)).toBe(true)
    } finally {
      await again.close()
    }
  })
})

describe('static routes', () => {
  it('serves content and media as immutable', async () => {
    const res = await fetch(`${server.url}/content/files/abc.json`)
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toContain('immutable')
    expect(await res.json()).toEqual({ a: 1 })
    const media = await fetch(`${server.url}/content/media/abc.opus`)
    expect(media.headers.get('content-type')).toBe('audio/ogg')
  })

  it('serves the app shell uncached for app routes, and hashed assets as immutable', async () => {
    const shell = await fetch(`${server.url}/lessons`)
    expect(shell.status).toBe(200)
    expect(shell.headers.get('cache-control')).toBe('no-cache')
    const asset = await fetch(`${server.url}/assets/app-1234.js`)
    expect(asset.headers.get('cache-control')).toContain('immutable')
  })

  it('never serves a file outside its folders', async () => {
    for (const path of ['/content/..%2Fsecret.txt', '/content/%2e%2e/secret.txt', '/content/missing.json', '/..%2Fsecret.txt']) {
      const res = await fetch(`${server.url}${path}`)
      expect(res.status, path).toBe(404)
    }
  })
})
