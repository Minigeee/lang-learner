// Full-derive benchmark over a generated year of events. Run: npm run bench
import { generateYear, YEAR } from './gen-year.ts'
import { derive, defaultCfg } from './derive.ts'
import { byTime, type Ev } from './events.ts'
import { replayCard, scheduler } from './srs.ts'

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
function time(label: string, f: () => unknown, reps = 7) {
  f() // warm-up
  const ts: number[] = []
  for (let i = 0; i < reps; i++) {
    const t = performance.now()
    f()
    ts.push(performance.now() - t)
  }
  const m = median(ts)
  console.log(`${label.padEnd(58)} ${m.toFixed(0).padStart(6)} ms  (min ${Math.min(...ts).toFixed(0)}, max ${Math.max(...ts).toFixed(0)})`)
  return m
}

const PHONE_FACTOR = Number(process.env.PHONE_FACTOR ?? 4)

const events = generateYear()
const counts: Record<string, number> = {}
for (const e of events) counts[e.p.kind] = (counts[e.p.kind] ?? 0) + 1
console.log(`node ${process.version}, ${events.length} events`, counts)
const json = JSON.stringify(events)
console.log(`serialized log: ${(json.length / 1e6).toFixed(1)} MB JSON`)

const reviews = events.filter((e) => e.p.kind === 'review')
const byCard = new Map<string, Ev[]>()
for (const e of [...reviews].sort(byTime)) {
  if (e.p.kind !== 'review') continue
  const a = byCard.get(e.p.cardId)
  if (a) a.push(e)
  else byCard.set(e.p.cardId, [e])
}
console.log(`${byCard.size} cards`)

console.log('\n-- full derive (Node, this laptop) --')
const tParse = time('JSON.parse of the whole log (proxy for reading IndexedDB)', () => JSON.parse(json), 5)
time('sort all events by (occurredAt, id)', () => [...events].sort(byTime))
const tReplay = time('replay all cards through ts-fsrs (seeded)', () => { for (const [id, evs] of byCard) replayCard(id, evs, 'seeded') })
const tFull = time('derive(): cards + mastery + lessons + daily XP + closes', () => derive(events, defaultCfg))
time('derive() in seeded due mode', () => derive(events, { ...defaultCfg, dueMode: 'seeded' }), 5)

// Per-review cost of ts-fsrs alone.
{
  const card0 = scheduler.newCard({ cardId: 'card:x', now: new Date(Date.UTC(2026, 0, 1)) })
  const N = 40_000
  const t = time(`ts-fsrs review() x ${N} (one long chain)`, () => {
    let c = card0
    let now = Date.UTC(2026, 0, 1)
    for (let i = 0; i < N; i++) { c = scheduler.review({ card: c, grade: (i % 9 === 0 ? 1 : 3) as any, now: new Date(now) }).card; now += 3 * 86_400_000 }
  }, 5)
  console.log(`  => ${((t / N) * 1000).toFixed(1)} µs per review()`)
}

// Incremental: keep cached per-card states; apply only reviews newer than the cache.
let tIncr = 0
let tCardFromScratch = 0
{
  const allReviews = [...reviews].sort(byTime)
  const cut = allReviews.at(-1)!.occurredAt - 86_400_000
  const cachedByCard = new Map<string, Ev[]>()
  const fresh: Ev[] = []
  for (const e of allReviews) {
    if (e.p.kind !== 'review') continue
    if (e.occurredAt < cut) cachedByCard.set(e.p.cardId, [...(cachedByCard.get(e.p.cardId) ?? []), e])
    else fresh.push(e)
  }
  const cache = new Map([...cachedByCard].map(([id, evs]) => [id, replayCard(id, evs, 'seeded')]))
  const snap = JSON.stringify([...cache].map(([id, st]) => [id, st.lastReviewId, st.card]))
  console.log(`card-state cache: ${cache.size} cards, ${(snap.length / 1e6).toFixed(2)} MB JSON`)
  time('load the card-state cache (JSON.parse)', () => JSON.parse(snap), 5)
  tIncr = time(`incremental: apply the last day's ${fresh.length} reviews to the cache`, () => {
    const c = new Map(cache)
    for (const e of fresh) {
      if (e.p.kind !== 'review') continue
      const st = c.get(e.p.cardId)
      c.set(e.p.cardId, st ? { card: scheduler.review({ card: st.card, grade: e.p.rating as any, now: new Date(e.occurredAt) }).card, lastReviewId: e.id } : replayCard(e.p.cardId, [e], 'seeded'))
    }
  })
  const long = [...byCard.entries()].sort((a, b) => b[1].length - a[1].length)[0]
  tCardFromScratch = time(`late event: replay one card from scratch (${long[1].length} reviews)`, () => replayCard(long[0], long[1], 'seeded'))
}

console.log(`\n-- projection to a mid-range phone (assumed ${PHONE_FACTOR}x slower than this laptop) --`)
console.log(`full derive:            ~${((tFull * PHONE_FACTOR) / 1000).toFixed(1)} s`)
console.log(`  of which FSRS replay: ~${((tReplay * PHONE_FACTOR) / 1000).toFixed(1)} s`)
console.log(`incremental day:        ~${(tIncr * PHONE_FACTOR).toFixed(0)} ms; one late card ~${(tCardFromScratch * PHONE_FACTOR).toFixed(1)} ms`)
console.log(`read + parse the log:   ~${((tParse * PHONE_FACTOR) / 1000).toFixed(1)} s (IndexedDB is usually slower than JSON.parse)`)
console.log(`spec: ${JSON.stringify(YEAR)}`)
