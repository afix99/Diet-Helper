import { describe, expect, it } from 'vitest'
import { bmr, maintenanceFor, tdee } from '../nutrition'
import { energyBalance, targetRisk } from '../targets'
import { macroFate } from '../macroFate'
import { trends } from '../trends'
import { addDays } from '../dates'
import type { DayRecord } from '../nutrition'
import type { Macros, Targets, WeightLog } from '../types'

/*
 * Settings and underEating used to derive maintenance from the starting weight
 * while macroFate and trends used the latest weigh-in, so the app quoted two
 * different burn figures on two screens as soon as any weight came off. There
 * is one helper now; this is the guard that every caller keeps using it.
 */

const profile = {
  startWeightKg: 70,
  heightCm: 165,
  age: 28,
  sex: 'female' as const,
  activityLevel: 'moderate' as const,
}

const targets: Targets = {
  kcal: 1800,
  protein: 100,
  carbs: 180,
  fat: 60,
  fibre: 25,
  waterMl: 2200,
}

const TODAY = '2026-08-30'
const NOW_KG = 63

const totals: Macros = { kcal: 1700, protein: 90, carbs: 200, fat: 55, fibre: 20 }

const weights: WeightLog[] = Array.from({ length: 9 }, (_, i) => ({
  id: `w${i}`,
  date: addDays(TODAY, -7 * (8 - i)),
  weightKg: 70 - ((70 - NOW_KG) / 8) * i,
  waistCm: null,
  hipCm: null,
}))

const days: DayRecord[] = Array.from({ length: 56 }, (_, i) => ({
  date: addDays(TODAY, -(56 - i)),
  kcal: 1700,
  protein: 90,
  carbs: 0,
  fat: 0,
  fibre: 20,
  burned: 0,
  salmonMeals: 0,
}))

describe('maintenanceFor', () => {
  it('uses the weigh-in when there is one', () => {
    expect(maintenanceFor(profile, NOW_KG)).toBe(tdee(bmr(NOW_KG, 165, 28, 'female'), 'moderate'))
  })

  it('falls back to the starting weight when there is not', () => {
    const start = tdee(bmr(70, 165, 28, 'female'), 'moderate')
    expect(maintenanceFor(profile, null)).toBe(start)
    expect(maintenanceFor(profile, undefined)).toBe(start)
    expect(maintenanceFor(profile, 0)).toBe(start)
  })

  it('refuses to guess without height or age', () => {
    expect(maintenanceFor({ ...profile, heightCm: null }, NOW_KG)).toBeNull()
    expect(maintenanceFor({ ...profile, age: null }, NOW_KG)).toBeNull()
  })
})

describe('every screen quotes the same burn', () => {
  it('agrees across Settings, the macro sheet, the trend card and the risk check', () => {
    const expected = maintenanceFor(profile, NOW_KG)!

    // Settings reads this through energyBalance.
    expect(energyBalance(profile, targets.kcal, NOW_KG).tdee).toBe(expected)

    // The macro sheet.
    expect(
      macroFate({ totals, targets, profile, latestWeightKg: NOW_KG }, 'carbs').maintenanceKcal
    ).toBe(expected)

    // The trend card, which finds its own latest weigh-in from the log.
    const t = trends({ days, weights, targets, profile, goalWeightKg: 55, today: TODAY })
    expect(t.ready).toBe(true)
    expect(t.maintenanceKcal).toBe(expected)

    // And the target check.
    expect(targetRisk(profile, targets.kcal, NOW_KG).deficitKcal).toBe(expected - targets.kcal)
  })

  it('every screen moves together when the weigh-in changes', () => {
    const atStart = energyBalance(profile, targets.kcal).tdee!
    const now = energyBalance(profile, targets.kcal, NOW_KG).tdee!
    expect(now).toBeLessThan(atStart)
    expect(macroFate({ totals, targets, profile, latestWeightKg: NOW_KG }, 'fat').maintenanceKcal)
      .toBe(now)
  })
})
