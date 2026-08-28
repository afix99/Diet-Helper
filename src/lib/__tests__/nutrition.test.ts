import { describe, expect, it } from 'vitest'
import {
  badges,
  bmr,
  isOnTarget,
  isSalmon,
  leanBodyMass,
  rollingAverage,
  scaleMacros,
  statusBand,
  streak,
  sumMacros,
  tdee,
  variance,
  type DayRecord,
} from '../nutrition'
import type { Targets } from '../types'
import foods from '../../../seed/foods.json'
import defaults from '../../../seed/defaults.json'

const TARGETS: Targets = {
  kcal: 1500,
  protein: 90,
  carbs: 130,
  fat: 50,
  fibre: 30,
  waterMl: 2500,
}

const day = (kcal: number, protein = 0, salmonMeals = 0): DayRecord => ({
  date: '2026-01-01',
  kcal,
  protein,
  salmonMeals,
})

describe('seed data integrity', () => {
  it('carries every food and recipe from the workbook', () => {
    expect(foods).toHaveLength(69)
    expect(foods.every((f) => typeof f.kcal === 'number')).toBe(true)
  })

  it('matches the workbook targets on Dashboard!B15:B20', () => {
    expect(defaults.targets.kcal).toBe(1500)
    expect(defaults.targets.protein).toBe(90)
    expect(defaults.startWeightKg).toBe(62)
    expect(defaults.goalWeightKg).toBe(55)
  })

  it('preserves the stall-ordering notes that make the database useful', () => {
    const kangkung = foods.find((f) => f.name.startsWith('Kangkung'))
    expect(kangkung?.notes).toContain('kurang minyak')
  })
})

describe('bmr — Dashboard!B8', () => {
  it('matches the sheet formula 10W + 6.25H - 5A - 161 for a 62 kg female', () => {
    // 10(62) + 6.25(160) - 5(30) - 161 = 620 + 1000 - 150 - 161 = 1309
    expect(bmr(62, 160, 30, 'female')).toBe(1309)
  })

  it('uses +5 for males rather than the sheet-hardcoded female constant', () => {
    expect(bmr(62, 160, 30, 'male')).toBe(1475)
  })
})

describe('tdee — Dashboard!D8, B9, D9', () => {
  it('applies the three activity factors', () => {
    expect(tdee(1309, 'sedentary')).toBe(1571) // 1309 × 1.2
    expect(tdee(1309, 'moderate')).toBe(2029) // 1309 × 1.55
    expect(tdee(1309, 'active')).toBe(2258) // 1309 × 1.725
  })
})

describe('leanBodyMass — Dashboard!D10', () => {
  it('computes weight × (1 - bodyfat%)', () => {
    expect(leanBodyMass(62, 30)).toBe(43.4)
  })
})

describe('macro arithmetic — Weekly!E6:I12', () => {
  const salmon = { kcal: 310, protein: 33, carbs: 0, fat: 18, fibre: 0 }

  it('scales a serving the way INDEX(FoodKcal,...) × servings does', () => {
    expect(scaleMacros(salmon, 2)).toEqual({
      kcal: 620,
      protein: 66,
      carbs: 0,
      fat: 36,
      fibre: 0,
    })
  })

  it('sums a day of meals', () => {
    const rice = { kcal: 215, protein: 5, carbs: 45, fat: 1.8, fibre: 3.5 }
    expect(sumMacros([salmon, rice])).toEqual({
      kcal: 525,
      protein: 38,
      carbs: 45,
      fat: 19.8,
      fibre: 3.5,
    })
  })

  it('returns null variance for an unlogged day, as the sheet shows blank', () => {
    expect(variance(0, 1500)).toBeNull()
    expect(variance(1200, 1500)).toBeCloseTo(-0.2)
  })
})

describe('statusBand — Weekly!J12 four-band nested IF', () => {
  it('reports an unlogged day as empty', () => {
    expect(statusBand(0, 1500)).toBe('empty')
  })

  it('splits exactly at the sheet boundaries', () => {
    expect(statusBand(1099, 1500)).toBe('under') // < 1500-400
    expect(statusBand(1100, 1500)).toBe('on_target') // == boundary, inclusive
    expect(statusBand(1500, 1500)).toBe('on_target') // <= target
    expect(statusBand(1501, 1500)).toBe('close')
    expect(statusBand(1750, 1500)).toBe('close') // <= target+250
    expect(statusBand(1751, 1500)).toBe('over')
  })

  it('agrees with the on-target window used by the summary row', () => {
    expect(isOnTarget(1100, 1500)).toBe(true)
    expect(isOnTarget(1099, 1500)).toBe(false)
    expect(isOnTarget(1501, 1500)).toBe(false)
  })
})

describe('streak', () => {
  it('counts consecutive logged days', () => {
    const r = streak([day(1400), day(1400), day(1400)])
    expect(r.current).toBe(3)
    expect(r.best).toBe(3)
  })

  it('survives a single missed day, unlike the sheet hard reset', () => {
    const r = streak([day(1400), day(1400), day(0), day(1400)])
    expect(r.current).toBe(3)
  })

  it('breaks on a second miss inside the same week', () => {
    const r = streak([day(1400), day(1400), day(0), day(1400), day(0), day(0)])
    expect(r.current).toBe(0)
  })

  it('never lets a grace start a run from nothing', () => {
    const r = streak([day(0), day(0), day(1400)])
    expect(r.current).toBe(1)
  })

  it('remembers the best run even after a break', () => {
    const days = [day(1400), day(1400), day(1400), day(0), day(0), day(1400)]
    const r = streak(days)
    expect(r.best).toBe(3)
    expect(r.current).toBe(1)
  })

  it('refreshes the allowance once the miss falls out of the 7-day window', () => {
    // Two misses, seven days apart, so both are forgiven and the run holds.
    // `current` counts days actually logged (8), not days elapsed (10).
    const days = [
      day(1400), day(0), day(1400), day(1400), day(1400),
      day(1400), day(1400), day(1400), day(0), day(1400),
    ]
    expect(streak(days).current).toBe(8)
  })

  it('reports zero for an empty log', () => {
    expect(streak([])).toEqual({ current: 0, best: 0, usingGrace: false, graceRemaining: 1 })
  })
})

describe('badges — all nine from Streak & Badges!F20:F28', () => {
  const ctx = (over: Partial<Parameters<typeof badges>[0]> = {}) =>
    badges({
      days: [],
      targets: TARGETS,
      startWeightKg: 62,
      goalWeightKg: 55,
      latestWeightKg: null,
      bestStreak: 0,
      ...over,
    })

  it('returns all nine, all locked, for a fresh account', () => {
    const b = ctx()
    expect(b).toHaveLength(9)
    expect(b.every((x) => !x.unlocked)).toBe(true)
  })

  it('unlocks First Step on any single logged day', () => {
    const b = ctx({ days: [day(1400)] })
    expect(b.find((x) => x.id === 'first_step')?.unlocked).toBe(true)
  })

  it('unlocks Three in a Row at a 3-day streak', () => {
    expect(ctx({ bestStreak: 3 }).find((x) => x.id === 'three_in_a_row')?.unlocked).toBe(true)
    expect(ctx({ bestStreak: 2 }).find((x) => x.id === 'three_in_a_row')?.unlocked).toBe(false)
  })

  it('unlocks Full Week only at seven logged days', () => {
    const six = Array.from({ length: 6 }, () => day(1400))
    expect(ctx({ days: six }).find((x) => x.id === 'full_week')?.unlocked).toBe(false)
    expect(ctx({ days: [...six, day(1400)] }).find((x) => x.id === 'full_week')?.unlocked).toBe(
      true
    )
  })

  it('unlocks Omega Squad at three salmon meals', () => {
    const days = [day(1400, 90, 2), day(1400, 90, 1)]
    expect(ctx({ days }).find((x) => x.id === 'omega_squad')?.unlocked).toBe(true)
  })

  it('unlocks Protein Power at four days hitting protein', () => {
    const days = Array.from({ length: 4 }, () => day(1400, 90))
    expect(ctx({ days }).find((x) => x.id === 'protein_power')?.unlocked).toBe(true)
  })

  it('unlocks Discipline at five on-target days', () => {
    const days = Array.from({ length: 5 }, () => day(1400))
    expect(ctx({ days }).find((x) => x.id === 'disiplin')?.unlocked).toBe(true)
  })

  it('unlocks the weight badges against the start weight', () => {
    const b = ctx({ latestWeightKg: 61 })
    expect(b.find((x) => x.id === 'down_1kg')?.unlocked).toBe(true)
    expect(b.find((x) => x.id === 'down_3kg')?.unlocked).toBe(false)
    expect(ctx({ latestWeightKg: 59 }).find((x) => x.id === 'down_3kg')?.unlocked).toBe(true)
  })

  it('unlocks Goal Reached at or below target weight', () => {
    expect(ctx({ latestWeightKg: 55 }).find((x) => x.id === 'goal_reached')?.unlocked).toBe(true)
    expect(ctx({ latestWeightKg: 55.1 }).find((x) => x.id === 'goal_reached')?.unlocked).toBe(
      false
    )
  })

  it('reports partial progress on locked badges for the ring', () => {
    const b = ctx({ days: [day(1400), day(1400)] })
    expect(b.find((x) => x.id === 'full_week')?.progress).toBeCloseTo(2 / 7)
  })
})

describe('rollingAverage — the trend the Methodology tab asks for', () => {
  it('averages over a trailing window, tolerating short prefixes', () => {
    expect(rollingAverage([62, 61.5, 61], 3)).toEqual([62, 61.8, 61.5])
  })
})

describe('isSalmon — Streak & Badges!D6 COUNTIF("*Salmon*")', () => {
  it('matches the workbook wildcard, case-insensitively', () => {
    expect(isSalmon('Atlantic Salmon, raw')).toBe(true)
    expect(isSalmon('SAMBAL SALMON BAKAR')).toBe(true)
    expect(isSalmon('Chicken Breast, grilled')).toBe(false)
  })
})
