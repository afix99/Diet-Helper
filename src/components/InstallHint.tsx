'use client'

import { useEffect, useState } from 'react'

const DISMISSED = 'memey-diet-planner:install-hint-dismissed'

/**
 * iOS never fires `beforeinstallprompt`, so Safari users have no way to
 * discover that this can live on the home screen. Show them the Share-sheet
 * steps once, and never again.
 */
export function InstallHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(DISMISSED)) return
    const ua = window.navigator.userAgent
    const isIos = /iPad|iPhone|iPod/.test(ua)
    // iPadOS 13+ reports as a Mac; the touch points give it away.
    const isIpadOs = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // Safari's own non-standard flag, only present on iOS.
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if ((isIos || isIpadOs) && !standalone) setShow(true)
  }, [])

  if (!show) return null

  const dismiss = () => {
    localStorage.setItem(DISMISSED, '1')
    setShow(false)
  }

  return (
    <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 animate-slide-up">
      <div className="card flex items-start gap-3 p-3 shadow-lift">
        <span aria-hidden className="text-xl">
          📲
        </span>
        <div className="flex-1 text-sm">
          <p className="font-semibold">Add to your home screen</p>
          <p className="mt-0.5 text-xs text-muted">
            Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>. Opens like a
            normal app — no App Store needed.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="tap -mr-1 -mt-1 rounded-pill px-2 text-faint"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
