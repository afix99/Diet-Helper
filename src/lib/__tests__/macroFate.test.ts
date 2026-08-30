import { describe, expect, it } from 'vitest'
import { KCAL_PER_KG_FAT, macroFate, type MacroFateInput, type MacroKey } from '../macroFate'
import { statusBand } from '../nutrition'
import type { Macros, Targets } from '../types'

const targets: Targets = {
  kcal: 1800,
  protein: 100,
  carbs: 180,
  fat: 60,
  fibre: 25,
  waterMl: 2200,
}

/** Height and age present, so maintenance is computable. Mifflin gives ~2050 TDEE. */
const profile = {
  startWeightKg: 62,
  heightCm: 165,
  age: 28,
  sex: 'female' as const,
  activityLevel: 'moderate' as const,
}

const totals = (over: Partial<Macros> = {}): Macros => ({
  kcal: 1600,
  protein: 90,
  carbs: 170,
  fat: 50,
  fibre: 20,
  ...over,
})

const input = (t: Macros): MacroFateInput => ({ totals: t, targets, profile })
const text = (key: MacroKey, t: Macros) => macroFate(input(t), key).body.join(' ')

describe('macroFate: the overage itself', () => {
  it('reports nothing over at or below target', () => {
    expect(macroFate(input(totals({ carbs: 180 })), 'carbs').overBy).toBe(0)
    expect(macroFate(input(totals({ carbs: 120 })), 'carbs').overBy).toBe(0)
  })

  it('converts grams over into calories at the right rate', () => {
    const f = macroFate(input(totals({ carbs: 230 })), 'carbs')
    expect(f.overBy).toBe(50)
    expect(f.overKcal).toBe(200) // 50g x 4
  })

  it('never prices fibre in calories, because it is not fuel', () => {
    const f = macroFate(input(totals({ fibre: 45 })), 'fibre')
    expect(f.overBy).toBe(20)
    expect(f.overKcal).toBeNull()
  })
})

describe('macroFate: what it is willing to claim', () => {
  it('claims no fat gain from a macro overage while eating below maintenance', () => {
    // 400g of carbs, more than double the target, but only 1600 kcal for the day.
    const f = macroFate(input(totals({ carbs: 400, kcal: 1600 })), 'carbs')
    expect(f.energy).toBe('deficit')
    expect(f.fatGainG).toBe(0)
    expect(f.body.join(' ')).toContain('Nothing you ate today is being stored as fat')
    expect(f.body.join(' ')).not.toMatch(/works out at around/)
  })

  it('quantifies a real surplus in grams, never kilograms', () => {
    // 2550 kcal against ~2050 maintenance: about 500 over.
    const f = macroFate(input(totals({ kcal: 2550, fat: 110 })), 'fat')
    expect(f.energy).toBe('surplus')
    expect(f.balanceKcal).toBeGreaterThan(400)
    expect(f.fatGainG).toBeCloseTo(Math.round((f.balanceKcal! / KCAL_PER_KG_FAT) * 1000), 0)
    expect(f.fatGainG).toBeLessThan(100)
    const body = f.body.join(' ')
    expect(body).toMatch(/\d+g of body fat/)
    expect(body).not.toMatch(/kilograms? of body fat/)
    expect(body).toContain('counted in grams, not kilograms')
  })

  it('marks the 7700 figure as an approximation wherever it prints it', () => {
    const body = text('fat', totals({ kcal: 2550, fat: 110 }))
    expect(body).toContain('7,700')
    expect(body).toContain('rule of thumb')
  })

  it('refuses to guess when maintenance cannot be computed', () => {
    const f = macroFate(
      { totals: totals({ carbs: 300 }), targets, profile: { ...profile, heightCm: null } },
      'carbs'
    )
    expect(f.energy).toBe('unknown')
    expect(f.maintenanceKcal).toBeNull()
    expect(f.fatGainG).toBe(0)
    expect(f.body.join(' ')).toContain('being over it often still means losing')
  })

  it('says fibre is not stored, in every energy state', () => {
    for (const dayKcal of [1200, 1900, 2600]) {
      const body = text('fibre', totals({ fibre: 50, kcal: dayKcal }))
      expect(body).toContain('None of it is stored')
      expect(body).toContain('floor, not a ceiling')
    }
  })

  it('always closes on the serving-size caveat', () => {
    for (const key of ['protein', 'carbs', 'fat', 'fibre'] as MacroKey[]) {
      const f = macroFate(input(totals({ protein: 150, carbs: 300, fat: 90, fibre: 40 })), key)
      expect(f.body[f.body.length - 1]).toContain('serving sizes are the biggest source of error')
    }
  })
})

describe('macroFate: agreement with the rest of the screen', () => {
  it('never calls a day a surplus that the status pill calls well under', () => {
    for (const dayKcal of [900, 1300, 1600, 1800, 2100, 2600]) {
      const f = macroFate(input(totals({ kcal: dayKcal })), 'carbs')
      const band = statusBand(dayKcal, targets.kcal)
      if (f.energy === 'surplus') expect(band).not.toBe('under')
      if (band === 'under') expect(f.energy).not.toBe('surplus')
    }
  })

  it('uses the latest weigh-in for maintenance, not the starting weight', () => {
    const base = macroFate(input(totals({ kcal: 2100 })), 'carbs')
    const heavier = macroFate(
      { totals: totals({ kcal: 2100 }), targets, profile, latestWeightKg: 90 },
      'carbs'
    )
    expect(heavier.maintenanceKcal!).toBeGreaterThan(base.maintenanceKcal!)
  })
})
