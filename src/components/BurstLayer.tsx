'use client'

import { useEffect, useRef } from 'react'
import { MAX_PARTICLES, draw, particlesFor, step, type Particle } from '@/lib/burst'
import { flourishesOn } from '@/lib/motion'
import type { Food } from '@/lib/types'

interface BurstDetail {
  x: number
  y: number
  food: Pick<Food, 'id' | 'category'> | null
  seed?: string
  scale?: number
}

const EVENT = 'memey:burst'

/**
 * Fire a burst at a point on screen.
 *
 * A window event rather than context, so any component can call it without the
 * whole tree re-rendering to carry a callback down — and so a burst can be
 * triggered from a plain handler that has no hooks available.
 */
export function burstAt(detail: BurstDetail): void {
  if (typeof window === 'undefined') return
  if (!flourishesOn()) return
  window.dispatchEvent(new CustomEvent<BurstDetail>(EVENT, { detail }))
}

/** Convenience for the common case: burst from the middle of the tapped thing. */
export function burstFrom(
  el: Element | null,
  food: Pick<Food, 'id' | 'category'> | null,
  opts: { seed?: string; scale?: number } = {}
): void {
  if (!el) return
  const r = el.getBoundingClientRect()
  burstAt({ x: r.left + r.width / 2, y: r.top + r.height / 2, food, ...opts })
}

/**
 * One canvas for every particle in the app.
 *
 * The loop starts when something bursts and cancels itself the moment the last
 * particle dies, so an idle screen costs nothing at all — no timer, no rAF, no
 * repaint. That matters more than it sounds on a phone that is meant to be open
 * six times a day.
 */
export function BurstLayer() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const frame = useRef<number>()
  const last = useRef(0)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const ctx = el.getContext('2d')
    if (!ctx) return

    // Cap the ratio at 2: a 3x phone triples the fill cost for a difference
    // nobody can see on 4px confetti.
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const resize = () => {
      el.width = Math.round(window.innerWidth * dpr)
      el.height = Math.round(window.innerHeight * dpr)
      el.style.width = `${window.innerWidth}px`
      el.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const stop = () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current)
      frame.current = undefined
      ctx.clearRect(0, 0, el.width, el.height)
    }

    const tick = (now: number) => {
      // Clamp dt so a backgrounded tab does not teleport every particle off
      // screen the instant it returns.
      const dt = Math.min(0.05, (now - last.current) / 1000 || 0)
      last.current = now
      particles.current = step(particles.current, dt)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      if (particles.current.length === 0) {
        frame.current = undefined
        return
      }
      draw(ctx, particles.current)
      frame.current = requestAnimationFrame(tick)
    }

    const onBurst = (e: Event) => {
      const { x, y, food, seed, scale } = (e as CustomEvent<BurstDetail>).detail
      const next = particlesFor(x, y, food, { seed, scale })
      // Oldest go first past the cap, so a fast tapper gets the newest burst
      // whole rather than a thinned version of everything.
      particles.current = [...particles.current, ...next].slice(-MAX_PARTICLES)
      if (frame.current === undefined) {
        last.current = performance.now()
        frame.current = requestAnimationFrame(tick)
      }
    }

    // Nothing should keep animating over a screen nobody is looking at.
    const onHide = () => {
      if (document.hidden) {
        particles.current = []
        stop()
      }
    }

    window.addEventListener(EVENT, onBurst)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener(EVENT, onBurst)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('resize', resize)
      stop()
    }
  }, [])

  return (
    <canvas
      ref={canvas}
      data-burst-layer
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50"
    />
  )
}
