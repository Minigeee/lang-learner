import type { EventEnvelope, Rejection, Remote } from '@lang-learner/core'

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`)
  return (await res.json()) as T
}

/**
 * The sync port over the server's two endpoints (architecture §5). `base` is the server's origin,
 * empty for the origin the app was loaded from, so sync has nothing to configure.
 */
export function httpRemote(base = ''): Remote {
  return {
    async push(batch) {
      const res = await fetch(`${base}/sync/push`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      })
      return (await json<{ rejected: Rejection[] }>(res)).rejected
    },
    async pull(afterSeq, limit) {
      const res = await fetch(`${base}/sync/pull?after=${afterSeq}&limit=${limit}`)
      return (await json<{ events: EventEnvelope[] }>(res)).events
    },
  }
}
