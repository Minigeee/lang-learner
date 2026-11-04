// Runs against the local Supabase stack (`pnpm db:start`, `pnpm db:reset`), through the real adapter.
import { execSync } from 'node:child_process'
import { beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { newEventId, type EventEnvelope } from '@lang-learner/core'
import { supabaseRemote } from '../../src/adapters/supabaseRemote.ts'

const env = Object.fromEntries(
  [...execSync('pnpm exec supabase status -o env', { encoding: 'utf8', cwd: '../..' }).matchAll(/^([A-Z_]+)="?(.*?)"?$/gm)].map((m) => [m[1], m[2]]),
) as Record<string, string>

const url = env.API_URL!
const anon = () => createClient(url, env.PUBLISHABLE_KEY!, { auth: { persistSession: false } })
const admin = createClient(url, env.SECRET_KEY!, { auth: { persistSession: false } })

async function signedIn(): Promise<{ client: SupabaseClient; userId: string }> {
  const email = `test-${newEventId(Date.now())}@example.test`
  const password = 'test-password-for-local-stack'
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error) throw created.error
  const client = anon()
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return { client, userId: created.data.user.id }
}

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

describe('supabaseRemote against the local stack', () => {
  let a: Awaited<ReturnType<typeof signedIn>>
  let b: Awaited<ReturnType<typeof signedIn>>

  beforeAll(async () => {
    a = await signedIn()
    b = await signedIn()
  })

  it('round-trips an event without changing it', async () => {
    const remote = supabaseRemote(a.client)
    const sent = event({ lang: 'zh', payload: { note: 'round trip', target: 'x' } })
    expect(await remote.push([sent])).toEqual([])
    const rows = await remote.pull(0, 1000)
    const { seq, ...back } = rows.find((r) => r.id === sent.id)!
    expect(seq).toBeGreaterThan(0)
    expect(back).toEqual(sent)
  })

  it('treats a re-push as a no-op', async () => {
    const remote = supabaseRemote(a.client)
    const sent = event()
    await remote.push([sent])
    await remote.push([{ ...sent, payload: { note: 'changed' } }])
    const rows = (await remote.pull(0, 1000)).filter((r) => r.id === sent.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.payload).toEqual({ note: 'n' })
  })

  it('returns a malformed event as a rejection and keeps the rest of the batch', async () => {
    const remote = supabaseRemote(a.client)
    const good = event()
    const bad = event({ build: null as unknown as string })
    const rejected = await remote.push([bad, good])
    expect(rejected.map((r) => r.id)).toEqual([bad.id])
    expect((await remote.pull(0, 1000)).some((r) => r.id === good.id)).toBe(true)
  })

  it('keeps seq in commit order across concurrent pushes, so a cursor never skips', async () => {
    const clients = await Promise.all(Array.from({ length: 4 }, async () => {
      const c = anon()
      const session = (await a.client.auth.getSession()).data.session!
      await c.auth.setSession(session)
      return supabaseRemote(c)
    }))
    const remote = supabaseRemote(a.client)
    const start = Math.max(0, ...(await remote.pull(0, 1000)).map((r) => r.seq!))
    let cursor = start
    const seen = new Set<string>()
    const batches = Array.from({ length: 40 }, () => Array.from({ length: 5 }, () => event()))
    const pushes = batches.map((batch, i) => clients[i % clients.length]!.push(batch))
    let done = false
    const puller = (async () => {
      while (!done) {
        for (const row of await remote.pull(cursor, 1000)) {
          seen.add(row.id)
          cursor = row.seq!
        }
      }
    })()
    await Promise.all(pushes)
    done = true
    await puller
    for (const row of await remote.pull(cursor, 1000)) seen.add(row.id)
    expect(batches.flat().filter((e) => !seen.has(e.id))).toEqual([])
  })

  it('pulls in seq order and honors the limit', async () => {
    const remote = supabaseRemote(a.client)
    await remote.push([event(), event(), event()])
    const page = await remote.pull(0, 2)
    expect(page).toHaveLength(2)
    expect(page[0]!.seq!).toBeLessThan(page[1]!.seq!)
  })

  it("never shows one user's events to another", async () => {
    const sent = event()
    await supabaseRemote(a.client).push([sent])
    expect((await supabaseRemote(b.client).pull(0, 1000)).some((r) => r.id === sent.id)).toBe(false)
  })

  it('refuses direct writes from a signed-in client', async () => {
    const row = { id: newEventId(Date.now()), kind: 'flag', v: 1, occurred_at: new Date().toISOString(), device_id: 'd', device_seq: 1, build: 't', payload: {}, user_id: a.userId }
    expect((await a.client.from('events').insert(row)).error).not.toBeNull()
    expect((await a.client.from('events').update({ build: 'x' }).neq('kind', '')).error).not.toBeNull()
    expect((await a.client.from('events').delete().neq('kind', '')).error).not.toBeNull()
  })

  it('refuses pushes and reads without a session', async () => {
    const remote = supabaseRemote(anon())
    await expect(remote.push([event()])).rejects.toBeTruthy()
    await expect(remote.pull(0, 10)).rejects.toBeTruthy()
  })

  it('serves the private bucket to a signed-in user only', async () => {
    const path = 'media/cmn-ma3.mp3'
    expect((await a.client.storage.from('private').download(path)).error).toBeNull()
    expect((await anon().storage.from('private').download(path)).error).not.toBeNull()
  })
})
