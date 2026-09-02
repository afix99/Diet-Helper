import { describe, expect, it } from 'vitest'
import { chipLabels, sectionFoods } from '../foodList'
import { FOOD_CATEGORIES } from '../catalogue'
import { macroSplit } from '../nutrition'
import type { Food } from '../types'

const food = (id: string, over: Partial<Food> = {}): Food => ({
  id,
  slug: id,
  category: 'OTHER',
  name: id,
  servingSize: '1',
  kcal: 100,
  protein: 5,
  carbs: 10,
  fat: 3,
  fibre: 1,
  glycemicLoad: null,
  notes: null,
  ownerId: null,
  source: 'workbook',
  ...over,
})

describe('sectionFoods', () => {
  const all = [food('a'), food('b'), food('c'), food('d')]

  it('puts saved first, then what you eat often, then the rest', () => {
    const s = sectionFoods(all, [food('c')], [food('a')])
    expect(s.map((x) => x.title)).toEqual(['Saved', 'You eat these often', 'Everything else'])
    expect(s[0].foods.map((f) => f.id)).toEqual(['c'])
    expect(s[1].foods.map((f) => f.id)).toEqual(['a'])
    expect(s[2].foods.map((f) => f.id)).toEqual(['b', 'd'])
  })

  it('never shows the same food twice', () => {
    // A favourite you also eat daily qualifies for both. Two identical rows in
    // two sections reads as a bug, so Saved wins and the other drops it.
    const s = sectionFoods(all, [food('a')], [food('a'), food('b')])
    const ids = s.flatMap((x) => x.foods.map((f) => f.id))
    expect(ids).toEqual([...new Set(ids)])
    expect(s[1].foods.map((f) => f.id)).toEqual(['b'])
  })

  it('drops empty sections rather than rendering a bare heading', () => {
    const s = sectionFoods(all, [], [])
    expect(s).toHaveLength(1)
    // Alone, the catch-all needs no heading at all.
    expect(s[0].title).toBeNull()
    expect(s[0].foods).toHaveLength(4)
  })

  it('ignores a favourite whose food no longer exists', () => {
    // Deleting a custom food leaves its id in `favourites`; the row must not
    // resurrect as a phantom.
    const s = sectionFoods(all, [food('gone')], [])
    expect(s.flatMap((x) => x.foods.map((f) => f.id))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('keeps every food exactly once, whatever the inputs', () => {
    const s = sectionFoods(all, [food('d'), food('a')], [food('a'), food('b')])
    const ids = s.flatMap((x) => x.foods.map((f) => f.id)).sort()
    expect(ids).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('chipLabels', () => {
  /*
   * The bug this exists for: the old rule was `category.split(' ')[0]`, and the
   * Sushi Delivery pack added five categories that all start with "SUSHI". The
   * filter bar showed five identical chips, four of them unreachable.
   */
  it('gives every real category a distinct chip', () => {
    const labels = chipLabels(FOOD_CATEGORIES)
    expect(new Set(labels).size).toBe(FOOD_CATEGORIES.length)
  })

  it('distinguishes categories that share a first word', () => {
    const labels = chipLabels([
      'SUSHI DELIVERY DON',
      'SUSHI DELIVERY BOWLS',
      'SUSHI DELIVERY BENTO',
      'SUSHI DELIVERY SUSHI',
      'SUSHI DELIVERY SIDES',
    ])
    expect(labels).toEqual(['Don', 'Bowls', 'Bento', 'Sushi', 'Sides'])
  })

  it('leaves a category that collides with nothing on its short first word', () => {
    expect(chipLabels(['FRUITS', 'VEGETABLES', 'SALMON & FISH'])).toEqual([
      'Fruits',
      'Vegetables',
      'Salmon',
    ])
  })

  it('does not shout', () => {
    for (const l of chipLabels(FOOD_CATEGORIES)) expect(l).not.toBe(l.toUpperCase())
  })

  it('survives a category that is itself the shared prefix', () => {
    // A parent listed alongside its children would otherwise get an empty label.
    const labels = chipLabels(['SUSHI DELIVERY', 'SUSHI DELIVERY DON'])
    expect(labels.every((l) => l.length > 0)).toBe(true)
    expect(new Set(labels).size).toBe(2)
  })
})

describe('macroSplit', () => {
  it('divides by energy, not by grams', () => {
    // 10g fat is 90 kcal against 10g protein's 40: fat must be the bigger slice
    // even though the gram counts are equal.
    const s = macroSplit({ protein: 10, carbs: 0, fat: 10 })
    expect(s.fat).toBeCloseTo(90 / 130, 5)
    expect(s.protein).toBeCloseTo(40 / 130, 5)
  })

  it('always sums to one for a food with macros', () => {
    const s = macroSplit({ protein: 22, carbs: 80, fat: 38 })
    expect(s.protein + s.carbs + s.fat).toBeCloseTo(1, 10)
  })

  it('returns zeroes rather than dividing by zero', () => {
    expect(macroSplit({ protein: 0, carbs: 0, fat: 0 })).toEqual({
      protein: 0,
      carbs: 0,
      fat: 0,
    })
  })

  it('ignores negative macros instead of drawing a bar backwards', () => {
    const s = macroSplit({ protein: -5, carbs: 10, fat: 0 })
    expect(s.carbs).toBe(1)
    expect(s.protein).toBe(0)
  })
})
