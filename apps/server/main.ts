// node apps/server/main.ts [--port 8787] [--db .data/events.sqlite] [--content dist/content] [--web apps/web/dist]
// Run from the repo root. Listens on 127.0.0.1 only; tailscale serve is the only way in from elsewhere.
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { startServer } from './http.ts'

const args = process.argv.slice(2)
const flag = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}

const dbFile = flag('db', '.data/events.sqlite')!
mkdirSync(dirname(dbFile), { recursive: true })
const web = flag('web')
const server = await startServer({
  port: Number(flag('port', '8787')),
  dbFile,
  contentDir: flag('content', 'dist/content')!,
  ...(web ? { webDir: web } : {}),
})
console.log(`server on ${server.url} (events in ${dbFile})`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void server.close().then(() => process.exit(0)))
}
