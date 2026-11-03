// Prints a digest of every card state after replaying a year of reviews. Run in V8 (node) and
// JavaScriptCore (bun) and compare: the phone (Safari) and laptop (Chrome) must derive the same state.
import { createHash } from 'node:crypto'
import { generateYear } from './gen-year.ts'
import { derive, defaultCfg, snapshot } from './derive.ts'
const d = derive(generateYear(), { ...defaultCfg, dueMode: 'seeded' })
const s = snapshot(d)
const engine = typeof (globalThis as any).Bun !== 'undefined' ? `bun ${(globalThis as any).Bun.version} (JavaScriptCore)` : `node ${process.version} (V8)`
console.log(engine, 'cards', d.cards.size, 'digest', createHash('sha256').update(s).digest('hex').slice(0, 16))
if (process.argv[2]) (await import('node:fs')).writeFileSync(process.argv[2], s)
