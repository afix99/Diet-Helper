'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Animates a number toward its target instead of snapping.
 *
 * The calorie ring is the screen's headline figure; watching it move makes the
 * change legible in a way a jump does not. Driven by rAF so it stays on the
 * frame clock, and skipped entirely under reduced motion.
 */
export function useCountUp(target: number, duration = 520): number {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  const frame = useRef<number>()

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced || from.current === target) {
      from.current = target
      setValue(target)
      return
    }

    const start = performance.now()
    const origin = from.current
    const delta = target - origin

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutCubic: quick to start, settles rather than stopping dead.
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(origin + delta * eased)
      if (t < 1) frame.current = requestAnimationFrame(tick)
      else from.current = target
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
      from.current = target
    }
  }, [target, duration])

  return value
}
