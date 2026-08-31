import { describe, expect, it } from 'vitest'
import { MAX_PARTICLES, opacityOf, particlesFor, step } from '../burst'
import { BURST_STYLES, FALLBACK, styleFor } from '../burstPalette'
import { FOODS } from '../catalogue'

const at = (food: (typeof FOODS)[number] | null, opts = {}) =>
  particlesFor(100, 200, food, opts)

describe('particlesFor: the seed is the point', () => {
  /*
   * The whole reason for a seeded PRNG rather than Math.random: a food should
   * have a *look*. Logging your usual breakfast is recognisable rather than
   * novel every single time.
   */
  it('gives the same food the same burst, every time', () => {
    const food = FOODS[0]
    expect(at(food)).toEqual(at(food))
  })

  it('gives different foods different bursts', () => {
    const a = at(FOODS[0])
    const b = at(FOODS[1])
    expect(a).not.toEqual(b)
  })

  it('is different for almost every food in the catalogue', () => {
    // Fingerprint each food's burst; near-total uniqueness across 415 rows is
    // what makes the count of distinct animations real rather than a claim.
    const seen = new Set(
      FOODS.map((f) => {
        const p = at(f)
        return `${p.length}:${p.map((x) => Math.round(x.vx) + ',' + Math.round(x.vy)).join('|')}`
      })
    )
    expect(seen.size).toBeGreaterThan(FOODS.length * 0.99)
  })

  it('keeps every burst inside the count range', () => {
    for (const f of FOODS) {
      const n = at(f).length
      expect(n).toBeGreaterThanOrEqual(8)
      expect(n).toBeLessThanOrEqual(18)
      expect(n).toBeLessThanOrEqual(MAX_PARTICLES)
    }
  })

  it('starts every particle at the point that was tapped', () => {
    for (const p of at(FOODS[3])) {
      expect(p.x).toBe(100)
      expect(p.y).toBe(200)
    }
  })

  it('throws upward, not into the floor', () => {
    // The arc is centred on -pi/2, so most pieces should start rising.
    const rising = at(FOODS[5]).filter((p) => p.vy < 0).length
    expect(rising).toBeGreaterThan(at(FOODS[5]).length / 2)
  })

  it('scales the whole burst without changing its shape', () => {
    const small = at(FOODS[7])
    const big = at(FOODS[7], { scale: 2 })
    expect(big).toHaveLength(small.length)
    expect(big[0].size).toBeCloseTo(small[0].size * 2, 5)
  })

  it('takes an explicit seed for bursts with no food behind them', () => {
    expect(particlesFor(0, 0, null, { seed: 'target-1' })).toEqual(
      particlesFor(0, 0, null, { seed: 'target-1' })
    )
    expect(particlesFor(0, 0, null, { seed: 'target-1' })).not.toEqual(
      particlesFor(0, 0, null, { seed: 'target-2' })
    )
  })
})

describe('step', () => {
  it('drops particles once they outlive their life', () => {
    let ps = at(FOODS[0])
    expect(ps.length).toBeGreaterThan(0)
    for (let i = 0; i < 200; i += 1) ps = step(ps, 0.016)
    expect(ps).toHaveLength(0)
  })

  it('pulls them down over time', () => {
    let ps = at(FOODS[0])
    const before = ps.map((p) => p.vy)
    ps = step(ps, 0.1)
    ps.forEach((p, i) => expect(p.vy).toBeGreaterThan(before[i]))
  })

  it('never returns more than it was given', () => {
    const ps = at(FOODS[0])
    expect(step([...ps], 0.016).length).toBeLessThanOrEqual(ps.length)
  })

  it('fades from one to nothing', () => {
    const ps = at(FOODS[0])
    expect(opacityOf(ps[0])).toBeCloseTo(1, 5)
    ps[0].age = ps[0].life
    expect(opacityOf(ps[0])).toBe(0)
  })
})

describe('burstPalette', () => {
  it('covers every category in the catalogue', () => {
    const categories = new Set(FOODS.map((f) => f.category))
    for (const c of categories) {
      expect(BURST_STYLES[c], `${c} has no burst style`).toBeDefined()
    }
  })

  it('never lets a real food fall back to grey', () => {
    for (const f of FOODS) {
      expect(styleFor(f.category), `${f.name} fell back`).not.toBe(FALLBACK)
    }
  })

  it('gives every style three colours and a sane weight', () => {
    for (const [name, s] of Object.entries(BURST_STYLES)) {
      expect(s.colours, name).toHaveLength(3)
      for (const c of s.colours) expect(c, name).toMatch(/^#[0-9a-f]{6}$/i)
      expect(s.weight, name).toBeGreaterThan(0)
      expect(s.weight, name).toBeLessThanOrEqual(2)
    }
  })

  it('uses more than one shape across the catalogue', () => {
    const shapes = new Set(Object.values(BURST_STYLES).map((s) => s.shape))
    expect(shapes.size).toBeGreaterThanOrEqual(5)
  })

  it('still answers for a food with no category at all', () => {
    expect(styleFor(null)).toBe(FALLBACK)
    expect(styleFor(undefined)).toBe(FALLBACK)
    expect(styleFor('NOT A CATEGORY')).toBe(FALLBACK)
  })
})
