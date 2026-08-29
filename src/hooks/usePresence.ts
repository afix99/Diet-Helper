'use client'

import { useEffect, useState } from 'react'

/**
 * Keeps a value mounted while its exit animation plays.
 *
 * React unmounts a conditional child the instant its condition goes false, so
 * a sheet dismissed that way vanishes with no transition. This holds the last
 * value for `ms` after it clears and reports `leaving` meanwhile, which is all
 * an exit animation needs — the same job AnimatePresence does, without the
 * 42 KB of runtime that measuring the bundle showed it costs here.
 *
 * Under prefers-reduced-motion the hold is skipped: an invisible dialog
 * lingering over the page would still swallow taps.
 */
export function usePresence<T>(value: T | null | undefined, ms = 280): [T | null, boolean] {
  const [held, setHeld] = useState<T | null>(value ?? null)

  useEffect(() => {
    if (value != null) {
      setHeld(value)
      return
    }
    if (held == null) return
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(() => setHeld(null), calm ? 0 : ms)
    return () => clearTimeout(timer)
  }, [value, held, ms])

  return [value != null ? value : held, value == null && held != null]
}
