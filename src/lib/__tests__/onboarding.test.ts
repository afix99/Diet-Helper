import { describe, expect, it } from 'vitest'
import { bmr, tdee } from '../nutrition'
import { MIN_SUGGESTED_KCAL, suggestedCalories } from '../onboarding'

const base = {
  startWeightKg: 62,
  heightCm: 165,
  age: 28,
  sex: 'female' as const,
  activityLevel: 'moderate' as const,
}

describe('suggestedCalories', () => {
  it('takes a 400 kcal deficit off maintenance', () => {
    const maintenance = tdee(bmr(62, 165, 28, 'female'), 'moderate')
    expect(suggestedCalories(base)).toBe(maintenance - 400)
  })

  it('returns null without height or age, rather than inventing a target', () => {
    expect(suggestedCalories({ ...base, heightCm: null })).toBeNull()
    expect(suggestedCalories({ ...base, age: null })).toBeNull()
    expect(suggestedCalories({ ...base, heightCm: 0 })).toBeNull()
  })

  it('never suggests below the floor, whatever the arithmetic says', () => {
    // Small, older, sedentary: maintenance lands low enough that a plain
    // subtraction would produce a number no one should be nudged toward.
    const small = {
      startWeightKg: 45,
      heightCm: 148,
      age: 64,
      sex: 'female' as const,
      activityLevel: 'sedentary' as const,
    }
    const maintenance = tdee(bmr(45, 148, 64, 'female'), 'sedentary')
    expect(maintenance - 400).toBeLessThan(MIN_SUGGESTED_KCAL)
    expect(suggestedCalories(small)).toBe(MIN_SUGGESTED_KCAL)
  })

  it('never drifts more than the capped deficit from maintenance', () => {
    const maintenance = tdee(bmr(95, 185, 30, 'male'), 'active')
    const got = suggestedCalories({
      startWeightKg: 95,
      heightCm: 185,
      age: 30,
      sex: 'male',
      activityLevel: 'active',
    })
    expect(maintenance - (got as number)).toBeLessThanOrEqual(500)
  })
})
