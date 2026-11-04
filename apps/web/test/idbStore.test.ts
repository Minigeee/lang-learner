import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createEventLog, type EventEnvelope, type Remote } from '@lang-learner/core'
import { openIdbStore } from '../src/adapters/idbStore.ts'

const remote: Remote = { push: async () => [], pull: async () => [] }
let n = 0
const freshName = () => `test-${n++}`
const note = (text: string) => ({ kind: 'flag', v: 1, payload: { note: text } }) as const
const logFor = async (name: string) => {
  const store = await openIdbStore(name)
  return { store, log: createEventLog({ store, remote, clock: () => 1000, build: 'b' }) }
}

describe('idbStore', () => {
  it('keeps the device id, deviceSeq and events across a reopen', async () => {
    const name = freshName()
    const first = await logFor(name)
    const event = await first.log.record(note('a'))
    const second = await logFor(name)
    expect((await second.store.meta()).deviceId).toBe(event.deviceId)
    expect((await second.log.record(note('b'))).deviceSeq).toBe(2)
    expect(await second.store.events()).toHaveLength(2)
  })

  it('keeps stamps monotonic across a reopen', async () => {
    const name = freshName()
    const store = await openIdbStore(name)
    const clocks = [5000, 1000]
    const log = () => createEventLog({ store, remote, clock: () => clocks.shift()!, build: 'b' })
    await log().record(note('a'))
    expect((await log().record(note('b'))).occurredAt).toBe(5000)
  })

  it('does not consume a deviceSeq on a repeated id', async () => {
    const { store, log } = await logFor(freshName())
    await log.hello()
    await log.hello()
    expect((await store.meta()).deviceSeq).toBe(1)
    expect(await store.outbox(10)).toHaveLength(1)
  })

  it('hands the outbox back oldest first, and settles by id', async () => {
    const { store, log } = await logFor(freshName())
    const a = await log.record(note('a'))
    const b = await log.record(note('b'))
    const c = await log.record(note('c'))
    expect((await store.outbox(2)).map((e) => e.id)).toEqual([a.id, b.id])
    await store.settle([a.id, b.id], [{ id: b.id, error: 'bad' }])
    expect((await store.outbox(10)).map((e) => e.id)).toEqual([c.id])
    expect(await store.deadLetters()).toEqual([{ id: b.id, error: 'bad' }])
  })

  it('overwrites by id on pull and advances the cursor', async () => {
    const { store, log } = await logFor(freshName())
    const local = await log.record(note('mine'))
    const server: EventEnvelope = { ...local, seq: 7, payload: { note: 'theirs' } }
    await store.applyPulled([server])
    expect(await store.cursor()).toBe(7)
    expect((await store.events())[0]).toEqual(server)
    await store.applyPulled([{ ...server, id: 'x', seq: 3 }])
    expect(await store.cursor()).toBe(7)
  })
})
