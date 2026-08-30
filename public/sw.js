/*
 * Offline shell.
 *
 * The app's data lives in localStorage or Supabase, so the only thing the
 * worker needs to cache is the shell itself — enough that opening the app in
 * a dead spot still shows the UI rather than a browser error page.
 */
// Stamped per build by scripts/stamp-sw.mjs: a new deploy gets a new cache,
// and the activate handler below deletes every older one.
const CACHE = 'memey-shell-1788052126685'
const SHELL = ['/', '/week', '/foods', '/progress', '/more', '/manifest.webmanifest', '/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Individually, so one 404 cannot fail the whole install.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  // Never serve a stale API response.
  if (url.pathname.startsWith('/api/')) return

  // Network-first so a deployed update is picked up immediately, with the
  // cache as the fallback when the network is gone.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        if (request.mode === 'navigate') {
          const shell = await caches.match('/')
          if (shell) return shell
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' })
      })
  )
})
