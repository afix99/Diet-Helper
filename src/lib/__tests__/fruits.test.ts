import { describe, expect, it } from 'vitest'
import { FOODS } from '../catalogue'

const fruits = FOODS.filter((f) => f.category === 'FRUITS')

describe('fruit pack', () => {
  it('adds the pack without losing the workbook fruits', () => {
    expect(fruits.length).toBeGreaterThanOrEqual(50)
    // The originals must survive the merge.
    for (const slug of ['apple-with-skin', 'banana', 'papaya', 'guava']) {
      expect(fruits.find((f) => f.slug === slug)).toBeDefined()
    }
  })

  it('includes dragon fruit in both colours', () => {
    expect(fruits.find((f) => f.slug === 'dragon-fruit-white')).toBeDefined()
    expect(fruits.find((f) => f.slug === 'dragon-fruit-red')).toBeDefined()
  })

  it('has no duplicate ids anywhere in the catalogue', () => {
    const ids = FOODS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('marks the new rows as estimates, not workbook-validated', () => {
    const added = fruits.filter((f) => f.slug.startsWith('dragon-fruit'))
    for (const f of added) expect(f.source).toBe('community')
  })

  it('every fruit reconciles its calories against its own macros', () => {
    for (const f of fruits) {
      const fromMacros = f.protein * 4 + f.carbs * 4 + f.fat * 9
      // Fibre and sugar alcohols make exact agreement impossible; this catches
      // a transposed or mistyped figure, which is what it is for.
      expect(Math.abs(fromMacros - f.kcal)).toBeLessThanOrEqual(Math.max(25, f.kcal * 0.18))
    }
  })

  it('gives every fruit a serving size, since portions are the real variance', () => {
    for (const f of fruits) expect(f.servingSize).toBeTruthy()
  })
})
