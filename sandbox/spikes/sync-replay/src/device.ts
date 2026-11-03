// A simulated client: local log (IndexedDB stand-in), FIFO outbox, pull cursor, day close.
import { dayClosedId, type Ev, type Payload } from './events.ts'
import { DAY, dayEnd, dayName, derive, RULES, studyDay, type DeriveCfg, type Derived } from './derive.ts'
import { newCardState, loadBalancedDue, scheduler } from './srs.ts'
import type { Server } from './server.ts'

export type CloseRule =
  | 'naive' // architecture rev 2.1: first device to open the app after the day ends closes it
  | 'settled' // proposed: close only when every recently active device has proven it flushed past the day end, or after a grace period

export interface DeviceOpts {
  userId: string
  derive: DeriveCfg
  closeRule: CloseRule
  graceMs: number
  /** Pull overwrites a local event with the server's row for the same id (server is authoritative). */
  replaceOnPull: boolean
  /** Stamp occurredAt as max(clock, last stamp) so a device's own timestamps never go backwards. */
  monotonic: boolean
  /** Write a 'mark' event on sync when nothing was recorded since the current study day began. */
  writeMarks: boolean
  /** Stamp a review no earlier than the card's last known review (ts-fsrs rejects negative elapsed time). */
  causalClamp: boolean
}

export class Device {
  log = new Map<string, Ev>()
  outbox: string[] = []
  cursor = 0
  online = true
  skewMs = 0
  inflight: { txn: number; ids: string[]; dropAck: boolean } | null = null
  dropNextAck = false
  private deviceSeq = 0
  private lastStamp = -Infinity
  private cache: Derived | null = null
  /** Test hooks. */
  onRecord?: (e: Ev) => void
  onCommit?: (ids: string[]) => void

  constructor(readonly id: string, readonly server: Server, readonly trueClock: () => number, readonly o: DeviceOpts) {}

  now() { return this.trueClock() + this.skewMs }

  derived(): Derived {
    return (this.cache ??= derive(this.log.values(), this.o.derive))
  }

  record(make: (at: number) => Payload, idOverride?: string, notBefore = -Infinity): Ev {
    let at = Math.max(this.now(), notBefore)
    if (this.o.monotonic) at = Math.max(at, this.lastStamp)
    this.lastStamp = Math.max(this.lastStamp, at)
    const seq = ++this.deviceSeq
    const e: Ev = { id: idOverride ?? `ev:${this.id}:${seq}`, occurredAt: at, deviceId: this.id, deviceSeq: seq, build: 'b1', p: make(at) }
    if (this.log.has(e.id)) return this.log.get(e.id)! // e.g. a day_closed this device already has
    this.log.set(e.id, e)
    this.outbox.push(e.id)
    this.cache = null
    this.onRecord?.(e)
    return e
  }

  review(cardId: string, rating: 1 | 2 | 3 | 4, durationMs = 8000): Ev {
    const d = this.derived()
    const last = d.cards.get(cardId)?.card.lastReviewAt
    const notBefore = this.o.causalClamp && last ? +last : -Infinity
    return this.record((at) => {
      const st = d.cards.get(cardId) ?? newCardState(cardId, at)
      const next = scheduler.review({ card: st.card, grade: rating as any, now: new Date(at) }).card
      const dueCount = new Map<number, number>()
      for (const c of d.cards.values()) {
        const day = Math.floor(+c.card.dueAt / DAY)
        dueCount.set(day, (dueCount.get(day) ?? 0) + 1)
      }
      const dueAt = this.o.derive.dueMode === 'recorded' ? loadBalancedDue(next, at, (day) => dueCount.get(day) ?? 0) : undefined
      return { kind: 'review', cardId, rating, durationMs, dueAt, prevReviewId: st.lastReviewId }
    }, undefined, notBefore)
  }

  /** Starts a push of the whole outbox. The server commit may happen later (see completePush). */
  beginPush(): boolean {
    if (!this.online || this.inflight || this.outbox.length === 0) return false
    const ids = [...this.outbox]
    const txn = this.server.begin(ids.map((id) => this.log.get(id)!))
    this.inflight = { txn, ids, dropAck: this.dropNextAck }
    this.dropNextAck = false
    return true
  }

  /** The server committed our in-flight batch; the ack may be lost (then the batch is re-pushed later). */
  completePush() {
    if (!this.inflight) return
    this.server.commit(this.inflight.txn)
    this.onCommit?.(this.inflight.ids)
    if (!this.inflight.dropAck) {
      const done = new Set(this.inflight.ids)
      this.outbox = this.outbox.filter((id) => !done.has(id))
    }
    this.inflight = null
  }

  pull() {
    if (!this.online) return
    for (const row of this.server.pull(this.cursor)) {
      if (this.o.replaceOnPull || !this.log.has(row.id)) this.log.set(row.id, row)
      this.cursor = Math.max(this.cursor, row.seq!)
    }
    this.cache = null
  }

  /** What the app does on launch / visibilitychange / online. */
  sync(autoCommit: boolean) {
    if (!this.online) return
    this.maybeMark()
    if (this.beginPush() && autoCommit) this.completePush()
    this.pull()
    this.closeDays()
    if (this.beginPush() && autoCommit) this.completePush()
  }

  private maybeMark() {
    if (!this.o.writeMarks) return
    const d = this.derived()
    const today = studyDay(this.now(), d.tzMin, this.o.derive.dayStartHour)
    const todayStart = dayEnd(today - 1, d.tzMin, this.o.derive.dayStartHour)
    if (this.lastStamp < todayStart) this.record(() => ({ kind: 'mark' }))
  }

  /** Appends day_closed for finished days, according to the close rule. */
  closeDays() {
    const d = this.derived()
    if (d.firstActivityDay === null) return
    const h = this.o.derive.dayStartHour
    const now = this.now()
    const today = studyDay(now, d.tzMin, h)
    for (let day = d.firstActivityDay; day < today; day++) {
      if (d.closed.has(day)) continue
      const end = dayEnd(day, d.tzMin, h)
      if (this.o.closeRule === 'settled' && now < end + this.o.graceMs) {
        const others = [...d.devicesInWindow(end - 14 * DAY, end)].filter((dev) => dev !== this.id)
        const allPast = others.every((dev) => (d.deviceLastAt.get(dev) ?? -Infinity) >= end)
        if (!allPast) continue
      }
      const s = d.days.get(day) ?? { minutes: 0, xp: 0, credit: 'none' as const }
      const date = dayName(day)
      this.record(() => ({ kind: 'day_closed', date, xp: s.xp, minutes: s.minutes, credit: s.credit, rules: { ...RULES } }), dayClosedId(this.o.userId, date))
    }
  }
}
