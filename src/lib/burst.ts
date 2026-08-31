/**
 * Particles, seeded by what you logged.
 *
 * The trick that makes hundreds of animations out of one small engine: the
 * food's id hashes into a seed, and the seed fixes the count, the arc, the
 * speed, the spin and the lifetime. So guava always bursts the same way and
 * never the way rendang does — 415 foods, 415 repeatable bursts, from one
 * function. The category picks the colours and the shape (see burstPalette).
 *
 * Deliberately not a library and deliberately not React. It is a plain array of
 * numbers stepped by one rAF loop that cancels itself the moment the last
 * particle dies, so the cost when nothing is happening is exactly zero.
 */
import { styleFor, type BurstShape } from './burstPalette'
import type { Food } from './types'

/** Never draw more than this many at once, however fast someone taps. */
export const MAX_PARTICLES = 120

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  /** Radians, and its rate of change. */
  spin: number
  spinRate: number
  size: number
  colour: string
  shape: BurstShape
  weight: number
  /** Seconds lived, and the total it gets. */
  age: number
  life: number
}

/**
 * xmur3 + mulberry32: a tiny, well-behaved seeded PRNG pair.
 *
 * `Math.random()` would make every burst different, which sounds better and is
 * worse — the point is that a food has a *look*, so logging your usual
 * breakfast is recognisable rather than novel every time.
 */
function seedFrom(text: string): number {
  let h = 1779033703 ^ text.length
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

function rng(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface BurstOptions {
  /** Overrides the food's own seed; used by the target and badge bursts. */
  seed?: string
  /** Scales the whole thing. 1 is a food landing; 1.6 is a badge unlocking. */
  scale?: number
}

/**
 * The particles one burst is made of. Pure: same food, same numbers, always.
 */
export function particlesFor(
  x: number,
  y: number,
  food: Pick<Food, 'id' | 'category'> | null,
  { seed, scale = 1 }: BurstOptions = {}
): Particle[] {
  const style = styleFor(food?.category)
  const r = rng(seedFrom(seed ?? food?.id ?? 'anon'))

  // 8 to 18 pieces: enough to read as a burst, few enough to stay cheap.
  const count = Math.round(8 + r() * 10)
  // Every burst gets its own arc and tilt, so two foods never throw alike.
  const spread = 0.7 + r() * 1.9
  const tilt = -Math.PI / 2 + (r() - 0.5) * 0.8

  const out: Particle[] = []
  for (let i = 0; i < count; i += 1) {
    const angle = tilt + (i / Math.max(1, count - 1) - 0.5) * spread + (r() - 0.5) * 0.25
    const speed = (90 + r() * 150) * scale
    out.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spin: r() * Math.PI * 2,
      spinRate: (r() - 0.5) * 9,
      size: (3 + r() * 4) * scale,
      colour: style.colours[i % style.colours.length],
      shape: style.shape,
      weight: style.weight,
      age: 0,
      life: 0.6 + r() * 0.5,
    })
  }
  return out
}

/** Gravity, in pixels per second squared, before the style's weight. */
const GRAVITY = 620
/** Air drag per second. Keeps pieces from sailing off the screen. */
const DRAG = 0.86

/** Advance every particle by `dt` seconds and drop the dead ones. */
export function step(particles: Particle[], dt: number): Particle[] {
  const alive: Particle[] = []
  for (const p of particles) {
    p.age += dt
    if (p.age >= p.life) continue
    p.vy += GRAVITY * p.weight * dt
    const drag = Math.pow(DRAG, dt * 60)
    p.vx *= drag
    p.vy *= drag
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.spin += p.spinRate * dt
    alive.push(p)
  }
  return alive
}

/** 1 at birth, 0 at death, easing out so pieces fade rather than blink. */
export function opacityOf(p: Particle): number {
  const t = Math.min(1, p.age / p.life)
  return (1 - t) * (1 - t)
}

export function draw(ctx: CanvasRenderingContext2D, particles: readonly Particle[]): void {
  for (const p of particles) {
    ctx.save()
    ctx.globalAlpha = opacityOf(p)
    ctx.translate(p.x, p.y)
    ctx.rotate(p.spin)
    ctx.fillStyle = p.colour
    ctx.strokeStyle = p.colour

    switch (p.shape) {
      case 'ring':
        ctx.lineWidth = Math.max(1, p.size * 0.36)
        ctx.beginPath()
        ctx.arc(0, 0, p.size, 0, Math.PI * 2)
        ctx.stroke()
        break
      case 'crumb':
        ctx.fillRect(-p.size * 0.6, -p.size * 0.45, p.size * 1.2, p.size * 0.9)
        break
      case 'leaf':
        ctx.beginPath()
        ctx.ellipse(0, 0, p.size * 1.15, p.size * 0.55, 0, 0, Math.PI * 2)
        ctx.fill()
        break
      case 'droplet':
        ctx.beginPath()
        ctx.moveTo(0, -p.size * 1.3)
        ctx.quadraticCurveTo(p.size, 0, 0, p.size)
        ctx.quadraticCurveTo(-p.size, 0, 0, -p.size * 1.3)
        ctx.fill()
        break
      case 'spark':
        ctx.lineWidth = Math.max(1, p.size * 0.34)
        ctx.beginPath()
        ctx.moveTo(-p.size, 0)
        ctx.lineTo(p.size, 0)
        ctx.stroke()
        break
      default:
        ctx.beginPath()
        ctx.arc(0, 0, p.size, 0, Math.PI * 2)
        ctx.fill()
    }
    ctx.restore()
  }
}
