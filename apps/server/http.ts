// The server's routes (architecture §4, Server): the sync endpoints, the build's content and media,
// and the web app. It has no accounts or keys: reaching it at all means being on the tailnet.
import { createReadStream, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'
import { openEventsDb, type EventsDb } from './db.ts'

export interface ServerConfig {
  db: EventsDb
  /** A content build: `builds/<build>.json`, `files/<hash>.json` and `media/<hash>.*`, served under `/content/`. */
  contentDir: string
  /** The built web app, served at `/`. Absent in development, where Vite serves it. */
  webDir?: string
}

const MAX_BODY = 8 * 1024 * 1024
const MAX_PUSH = 1000
const MAX_PULL = 1000
const DEFAULT_PULL = 500

const TYPES: Record<string, string> = {
  '.json': 'application/json', '.opus': 'audio/ogg', '.webp': 'image/webp', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
}
const IMMUTABLE = 'public, max-age=31536000, immutable'
const NO_CACHE = 'no-cache'

class HttpError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length
    if (size > MAX_BODY) throw new HttpError(413, 'body too large')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'body is not JSON')
  }
}

function intParam(url: URL, name: string, fallback: number, min: number, max: number): number {
  const raw = url.searchParams.get(name)
  if (raw === null) return fallback
  const n = Number(raw)
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new HttpError(400, `${name} must be an integer from ${min} to ${max}`)
  return n
}

/** Streams a file under `root`, or returns false when there isn't one. Never leaves `root`. */
function serveFile(res: ServerResponse, root: string, path: string, cache: string): boolean {
  let rel: string
  try {
    rel = normalize(decodeURIComponent(path)).replace(/^[\\/]+/, '')
  } catch {
    return false
  }
  if (rel.split(sep).includes('..')) return false
  const file = join(root, rel)
  let size: number
  try {
    const st = statSync(file)
    if (!st.isFile()) return false
    size = st.size
  } catch {
    return false
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'content-length': size, 'cache-control': cache })
  createReadStream(file).pipe(res)
  return true
}

export function createHandler(config: ServerConfig): (req: IncomingMessage, res: ServerResponse) => void {
  const { db, contentDir, webDir } = config

  async function route(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const { pathname } = url
    if (pathname === '/sync/push') {
      if (req.method !== 'POST') throw new HttpError(405, 'use POST')
      const body = await readJson(req)
      const events = (body as { events?: unknown } | null)?.events
      if (!Array.isArray(events)) throw new HttpError(400, 'body must be { events: [...] }')
      if (events.length > MAX_PUSH) throw new HttpError(413, `at most ${MAX_PUSH} events per push`)
      return send(res, 200, { rejected: db.push(events) })
    }
    if (pathname === '/sync/pull') {
      if (req.method !== 'GET') throw new HttpError(405, 'use GET')
      const after = intParam(url, 'after', 0, 0, Number.MAX_SAFE_INTEGER)
      const limit = intParam(url, 'limit', DEFAULT_PULL, 1, MAX_PULL)
      return send(res, 200, { events: db.pull(after, limit) })
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'read-only')
    if (pathname.startsWith('/content/')) {
      // Every content path is named by a hash or a build id, so it never changes.
      if (serveFile(res, contentDir, pathname.slice('/content/'.length), IMMUTABLE)) return
      throw new HttpError(404, 'not in this build')
    }
    if (webDir) {
      const hashed = pathname.startsWith('/assets/')
      if (pathname !== '/' && serveFile(res, webDir, pathname, hashed ? IMMUTABLE : NO_CACHE)) return
      // The app shell, for every route the app handles itself.
      if (!extname(pathname) && serveFile(res, webDir, 'index.html', NO_CACHE)) return
    }
    throw new HttpError(404, 'not found')
  }

  return (req, res) => {
    route(req, res).catch((error: unknown) => {
      const status = error instanceof HttpError ? error.status : 500
      if (status === 500) console.error(error)
      if (!res.headersSent) send(res, status, { error: error instanceof HttpError ? error.message : 'server error' })
      else res.destroy()
    })
  }
}

export interface RunningServer {
  url: string
  close(): Promise<void>
}

/** Opens the events file and listens on 127.0.0.1 only. Port 0 picks a free port. */
export async function startServer(o: { port: number; dbFile: string; contentDir: string; webDir?: string }): Promise<RunningServer> {
  const db = openEventsDb(o.dbFile)
  const server = createServer(createHandler({ db, contentDir: o.contentDir, ...(o.webDir ? { webDir: o.webDir } : {}) }))
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(o.port, '127.0.0.1', resolve)
  })
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : o.port
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => {
      server.closeAllConnections()
      server.close(() => {
        db.close()
        resolve()
      })
    }),
  }
}
