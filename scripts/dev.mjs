// pnpm dev [--server-port 8787] [--web-port 5173] [--db .data/events.sqlite]: builds the content, then
// runs the server and Vite together until either stops. Vite proxies /sync and /content to the
// server, so the app talks only to its own origin. Another web port is another origin, so another
// device with its own IndexedDB; with its own --db it's a fresh history too.
import { spawn, spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const SERVER_PORT = flag('server-port', process.env.SERVER_PORT ?? '8787')
const WEB_PORT = flag('web-port', '5173')
const DB = flag('db', '.data/events.sqlite')

const build = spawnSync('pnpm content:build', { stdio: 'inherit', shell: true })
if (build.status !== 0) process.exit(build.status ?? 1)

const children = [
  spawn('node', ['apps/server/main.ts', '--port', SERVER_PORT, '--db', DB], { stdio: 'inherit' }),
  spawn(`pnpm --filter @lang-learner/web exec vite --port ${WEB_PORT}`, { stdio: 'inherit', shell: true, env: { ...process.env, SERVER_PORT } }),
]
const stop = (code) => {
  for (const child of children) if (child.exitCode === null) child.kill()
  process.exit(code)
}
for (const child of children) child.on('exit', (code) => stop(code ?? 0))
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
