'use client'

import { useEffect } from 'react'

/**
 * Registers the offline shell worker and, critically, makes sure a deployed
 * update actually reaches an installed app.
 *
 * Registering alone isn't enough: an installed PWA can keep running an old
 * worker — and therefore old chunks — until the browser happens to check for a
 * new one. So we ask for an update check on every load, tell the browser never
 * to serve sw.js from its own HTTP cache, and reload once when a new worker
 * takes control.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    let reloading = false
    const onControllerChange = () => {
      // Guard: controllerchange can fire more than once, and a reload loop
      // would be far worse than a stale asset.
      if (reloading) return
      reloading = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none',
        })
        // Explicitly check for a newer worker rather than waiting for the
        // browser's own schedule.
        await reg.update()
      } catch {
        // Offline or unsupported: the app works without it.
      }
    }

    if (document.readyState === 'complete') void register()
    else window.addEventListener('load', () => void register(), { once: true })

    return () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  }, [])

  return null
}
