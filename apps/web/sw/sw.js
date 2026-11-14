// The service worker (architecture §4): caches this build's app shell and serves it offline. The build
// prepends `const SHELL = { build, files }` (vite.config.ts), so each build has its own cache, and a
// new build installs beside the old one and takes over on the next launch, never mid-session.
// Content and audio aren't handled here: the content loader keeps them in its own cache.
/* global SHELL */
const CACHE = `shell-${SHELL.build}`
const INDEX = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([INDEX, ...SHELL.files.map((f) => `/${f}`)])))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('shell-') && k !== CACHE).map((k) => caches.delete(k)))))
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return
  if (req.mode === 'navigate') {
    // Every route is the one page, so the cached shell answers any navigation.
    event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(INDEX)) ?? fetch(req)))
  } else if (url.pathname.startsWith('/assets/')) {
    // Hash-named, so a cached copy is never stale.
    event.respondWith(caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req)
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok) await cache.put(req, res.clone())
      return res
    }))
  }
})
