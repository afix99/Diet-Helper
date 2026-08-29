import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRESET,
  PRESETS,
  distributeTargets,
  energyBalance,
  macroKcal,
  reconciles,
  type PresetId,
  type TargetLocks,
} from '../targets'
import { tdee, bmr } from '../nutrition'
import type { Targets } from '../types'

const BASE: Targets = { kcal: 1500, protein: 90, carbs: 130, fat: 50, fibre: 30, waterMl: 2500 }

const dist = (kcal: number, over: Partial<Parameters<typeof distributeTargets>[0]> = {}) =>
  distributeTargets({ kcal, goalWeightKg: 55, current: BASE, ...over })

describe('macros always reconcile with the calorie target', () => {
  it.each([1200, 1500, 1800, 2200, 2600, 3000, 3500, 4000])(
    'adds up at %i kcal',
    (kcal) => {
      const t = dist(kcal)
      expect(reconciles(t)).toBe(true)
      expect(Math.abs(macroKcal(t) - kcal)).toBeLessThanOrEqual(25)
    }
  )

  it('reconciles for every preset', () => {
    for (const p of PRESETS) {
      expect(reconciles(dist(2400, { preset: p.id }))).toBe(true)
    }
  })

  it('fixes the reported case: 3000 kcal against 90/130/50', () => {
    // The stored targets accounted for only 1330 of 3000.
    expect(macroKcal(BASE)).toBe(1330)
    const fixed = dist(3000)
    expect(reconciles(fixed)).toBe(true)
  })
})

describe('protein is anchored to body weight, not calories', () => {
  it('does not change when calories change', () => {
    // The whole point of the chosen model: more calories is not more protein.
    expect(dist(1500).protein).toBe(dist(3000).protein)
  })

  it('does change when goal weight changes', () => {
    expect(dist(2000, { goalWeightKg: 55 }).protein).toBeLessThan(
      dist(2000, { goalWeightKg: 80 }).protein
    )
  })

  it('lands at the workbook figure for a 55 kg goal', () => {
    // 1.6 g/kg x 55 = 88, which is the 90 g the workbook specifies.
    expect(dist(1500).protein).toBe(88)
  })

  it('sends the extra calories to carbs and fat', () => {
    const low = dist(1500)
    const high = dist(3000)
    expect(high.carbs).toBeGreaterThan(low.carbs)
    expect(high.fat).toBeGreaterThan(low.fat)
  })
})

describe('locks', () => {
  const locked = (locks: TargetLocks) => dist(3000, { locks, current: { ...BASE, protein: 120 } })

  it('never modifies a locked key', () => {
    expect(locked({ protein: true }).protein).toBe(120)
  })

  it('lets the unlocked keys absorb the difference', () => {
    const t = locked({ protein: true })
    expect(reconciles(t)).toBe(true)
  })

  it('honours several locks at once', () => {
    const current = { ...BASE, protein: 120, fat: 70 }
    const t = distributeTargets({
      kcal: 2500,
      goalWeightKg: 55,
      locks: { protein: true, fat: true },
      current,
    })
    expect(t.protein).toBe(120)
    expect(t.fat).toBe(70)
    expect(reconciles(t)).toBe(true)
  })

  it('leaves fibre and water alone when locked', () => {
    const t = dist(3000, { locks: { fibre: true, waterMl: true } })
    expect(t.fibre).toBe(BASE.fibre)
    expect(t.waterMl).toBe(BASE.waterMl)
  })
})

describe('floors and the low-calorie squeeze', () => {
  it('keeps fat at or above 0.8 g/kg', () => {
    // 0.8 x 55 = 44 g.
    for (const kcal of [1000, 1200, 1500]) {
      expect(dist(kcal).fat).toBeGreaterThanOrEqual(44)
    }
  })

  it('never produces negative carbs', () => {
    for (const kcal of [600, 800, 1000, 1200]) {
      expect(dist(kcal).carbs).toBeGreaterThanOrEqual(0)
    }
  })

  it('gives back fat before protein when calories are tight', () => {
    // At 1000 kcal the balanced split cannot fit; fat should be near its floor
    // while protein is still protected.
    const t = dist(1000)
    expect(t.fat).toBeLessThanOrEqual(dist(1500).fat)
    expect(t.protein).toBeGreaterThanOrEqual(55) // 1.0 g/kg floor
  })

  it('survives a zero calorie target without producing nonsense', () => {
    const t = dist(0)
    expect(t.carbs).toBe(0)
    expect(t.kcal).toBe(0)
    expect(Number.isFinite(t.protein)).toBe(true)
  })

  it('falls back to a sane weight when the goal weight is missing', () => {
    const t = dist(2000, { goalWeightKg: 0 })
    expect(t.protein).toBeGreaterThan(0)
    expect(reconciles(t)).toBe(true)
  })
})

describe('presets differ as advertised', () => {
  const at = (preset: PresetId) => dist(2400, { preset })

  it('high protein gives more protein than balanced', () => {
    expect(at('high_protein').protein).toBeGreaterThan(at('balanced').protein)
  })

  it('lower carb gives more fat and fewer carbs', () => {
    expect(at('lower_carb').fat).toBeGreaterThan(at('balanced').fat)
    expect(at('lower_carb').carbs).toBeLessThan(at('balanced').carbs)
  })

  it('defaults to balanced', () => {
    expect(dist(2400)).toEqual(at(DEFAULT_PRESET))
  })
})

describe('fibre and water', () => {
  it('scales fibre at 14 g per 1000 kcal', () => {
    expect(dist(2000).fibre).toBe(28)
    expect(dist(3000).fibre).toBe(42)
  })

  it('keeps a sensible fibre floor at very low calories', () => {
    expect(dist(800).fibre).toBeGreaterThanOrEqual(15)
  })

  it('uses actual body weight for hydration, not goal weight', () => {
    // You hydrate the body you have. 35 ml x 62 kg = 2170, rounded to 2150.
    expect(dist(2000, { goalWeightKg: 55, bodyWeightKg: 62 }).waterMl).toBe(2150)
    expect(dist(2000, { goalWeightKg: 55 }).waterMl).toBe(1950)
  })

  it('scales water with body weight, not calories', () => {
    expect(dist(1500, { goalWeightKg: 55 }).waterMl).toBe(
      dist(3000, { goalWeightKg: 55 }).waterMl
    )
    expect(dist(2000, { goalWeightKg: 80 }).waterMl).toBeGreaterThan(
      dist(2000, { goalWeightKg: 55 }).waterMl
    )
  })
})

describe('energyBalance replaces the fixed "moderate deficit" text', () => {
  const profile = {
    startWeightKg: 62,
    heightCm: 160,
    age: 30,
    sex: 'female' as const,
    activityLevel: 'sedentary' as const,
  }
  // bmr(62,160,30,female) = 1309; sedentary TDEE = 1571.
  const maintenance = tdee(bmr(62, 160, 30, 'female'), 'sedentary')

  it('calls 3000 kcal a surplus rather than a deficit', () => {
    const v = energyBalance(profile, 3000)
    expect(v.balance).toBe('surplus')
    expect(v.tdee).toBe(maintenance)
    expect(v.diff).toBe(3000 - maintenance)
  })

  it('calls the workbook target a deficit at the activity level it assumed', () => {
    // The workbook's note claims ~500 kcal below TDEE. That is only true at
    // moderate activity (TDEE 2029), not sedentary (1571) — which is exactly
    // why a fixed string was the wrong way to say it.
    const active = { ...profile, activityLevel: 'moderate' as const }
    const v = energyBalance(active, 1500)
    expect(v.balance).toBe('deficit')
    expect(v.diff).toBe(1500 - tdee(bmr(62, 160, 30, 'female'), 'moderate'))
  })

  it('calls the same target maintenance for a sedentary profile', () => {
    // 1500 is only 71 kcal below a sedentary TDEE of 1571.
    expect(energyBalance(profile, 1500).balance).toBe('maintenance')
  })

  it('calls TDEE itself maintenance', () => {
    expect(energyBalance(profile, maintenance).balance).toBe('maintenance')
  })

  it('admits when it cannot tell', () => {
    const v = energyBalance({ ...profile, heightCm: null }, 3000)
    expect(v.balance).toBe('unknown')
    expect(v.tdee).toBeNull()
  })
})
