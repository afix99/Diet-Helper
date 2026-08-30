import { describe, expect, it } from 'vitest'
import { density, headlineFor, suggestFoods } from '../suggest'
import { FOODS } from '../catalogue'
import { defaultData } from '../store/defaults'
import type { AppData } from '../store/types'
import type { LogEntry } from '../types'

const TODAY = '2026-08-30'
const byId = (id: string) => FOODS.find((f) => f.id === id)!

const entry = (date: string, foodId: string): LogEntry => {
  const f = byId(foodId)
  return {
    id: `${date}-${foodId}`,
    date,
    slot: 'lunch',
    foodId,
    recipeId: null,
    customName: null,
    servings: 1,
    notes: null,
    macros: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, fibre: f.fibre },
  }
}

const store = (entries: LogEntry[] = []): AppData => ({ ...defaultData(), entries })

describe('suggestFoods: what it picks', () => {
  it('returns real catalogue rows, never invented ones', () => {
    for (const need of ['protein', 'fibre', 'omega3'] as const) {
      const picks = suggestFoods(store(), need, { today: TODAY })
      expect(picks.length).toBeGreaterThan(0)
      for (const p of picks) expect(FOODS.some((f) => f.id === p.id)).toBe(true)
    }
  })

  it('ranks by nutrient per calorie, not by grams per serving', () => {
    const picks = suggestFoods(store(), 'protein', { today: TODAY, limit: 5 })
    const densities = picks.map((f) => density(f, 'protein'))
    expect([...densities].sort((a, b) => b - a)).toEqual(densities)
    // And the winner beats the highest raw-protein row, which is the trap.
    const byGrams = [...FOODS].sort((a, b) => b.protein - a.protein)[0]
    expect(density(picks[0], 'protein')).toBeGreaterThanOrEqual(density(byGrams, 'protein'))
  })

  it('only offers oily fish for omega-3', () => {
    const picks = suggestFoods(store(), 'omega3', { today: TODAY })
    for (const p of picks) {
      expect(p.name).toMatch(/salmon|kembung|sardine|mackerel|tuna|selar|tenggiri|herring|trout/i)
    }
  })

  it('ignores near-zero-calorie rows that would game a per-calorie rank', () => {
    for (const need of ['protein', 'fibre', 'omega3'] as const) {
      for (const p of suggestFoods(store(), need, { today: TODAY, limit: 10 })) {
        expect(p.kcal).toBeGreaterThanOrEqual(25)
      }
    }
  })
})

describe('suggestFoods: what it knows about you', () => {
  it('prefers foods already in your log', () => {
    const cold = suggestFoods(store(), 'fibre', { today: TODAY, limit: 3 })
    // Pick something eligible but not already top-ranked, and log it last week.
    const outsider = FOODS.filter(
      (f) => f.fibre >= 2 && f.kcal >= 25 && !cold.some((c) => c.id === f.id)
    )[0]
    const warm = suggestFoods(store([entry('2026-08-20', outsider.id)]), 'fibre', {
      today: TODAY,
      limit: 3,
    })
    expect(warm[0].id).toBe(outsider.id)
  })

  it('never suggests something already logged today', () => {
    const first = suggestFoods(store(), 'protein', { today: TODAY })[0]
    const after = suggestFoods(store([entry(TODAY, first.id)]), 'protein', { today: TODAY })
    expect(after.map((f) => f.id)).not.toContain(first.id)
  })

  it('still suggests a food logged on an earlier day', () => {
    const first = suggestFoods(store(), 'protein', { today: TODAY })[0]
    const after = suggestFoods(store([entry('2026-08-29', first.id)]), 'protein', { today: TODAY })
    expect(after.map((f) => f.id)).toContain(first.id)
  })

  it('is stable between renders on identical input', () => {
    const a = suggestFoods(store(), 'fibre', { today: TODAY })
    const b = suggestFoods(store(), 'fibre', { today: TODAY })
    expect(a.map((f) => f.id)).toEqual(b.map((f) => f.id))
  })
})

describe('headlineFor', () => {
  it('names the nutrient the suggestion is about', () => {
    const f = byId(suggestFoods(store(), 'protein', { today: TODAY })[0].id)
    expect(headlineFor(f, 'protein')).toMatch(/^\d+g protein$/)
    expect(headlineFor(f, 'fibre')).toMatch(/^\d+g fibre$/)
    expect(headlineFor(f, 'omega3')).toMatch(/^\d+g protein$/)
  })
})
