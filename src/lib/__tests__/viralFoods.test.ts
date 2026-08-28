import { describe, expect, it } from 'vitest'
import { FOODS, FOOD_CATEGORIES } from '../catalogue'
import { parseQuickAdd } from '../quickAdd'
import viral from '../../../seed/viral-foods.json'

const names = (s: string) => parseQuickAdd(s, FOODS).matches.map((m) => m.food.name)

describe('the food pack', () => {
  it('adds the chain and street-food entries on top of the workbook', () => {
    expect(viral.length).toBeGreaterThanOrEqual(70)
    expect(FOODS).toHaveLength(69 + viral.length)
  })

  it('keeps every workbook food marked as verified', () => {
    expect(FOODS.filter((f) => f.source === 'workbook')).toHaveLength(69)
  })

  it('marks every added food as an estimate', () => {
    const community = FOODS.filter((f) => f.source === 'community')
    expect(community).toHaveLength(viral.length)
    // The distinction is the point: vendor variance is large, so these must
    // never be presented with the same authority as the workbook's numbers.
    expect(community.every((f) => f.source !== 'workbook')).toBe(true)
  })

  it('has no duplicate ids across the two sources', () => {
    expect(new Set(FOODS.map((f) => f.id)).size).toBe(FOODS.length)
  })

  it('gives every entry usable numbers', () => {
    for (const f of FOODS) {
      // Water is the one legitimate zero in the catalogue.
      if (f.name !== 'Water') expect(f.kcal).toBeGreaterThan(0)
      expect(f.kcal).toBeGreaterThanOrEqual(0)
      expect(f.protein).toBeGreaterThanOrEqual(0)
      expect(f.carbs).toBeGreaterThanOrEqual(0)
      expect(f.fat).toBeGreaterThanOrEqual(0)
      expect(f.servingSize).toBeTruthy()
    }
  })

  it('keeps macros roughly consistent with the stated calories', () => {
    // 4/4/9 kcal per gram. Allow generous slack for rounding and fibre, but
    // catch an entry whose macros and calories are simply unrelated.
    for (const f of FOODS) {
      const fromMacros = f.protein * 4 + f.carbs * 4 + f.fat * 9
      if (f.kcal < 50) continue
      expect(Math.abs(fromMacros - f.kcal) / f.kcal).toBeLessThan(0.45)
    }
  })

  it('exposes the new categories for browsing', () => {
    for (const c of ['ZUS COFFEE', 'VIRAL & STREET FOOD', 'CHAIN DRINKS', 'KOREAN & FAST FOOD']) {
      expect(FOOD_CATEGORIES).toContain(c)
    }
  })
})

describe('quick add finds the new foods by the names people type', () => {
  it('matches ZUS drinks', () => {
    expect(names('zus spanish latte')[0]).toBe('ZUS Spanish Latte')
    expect(names('zus americano')[0]).toBe('ZUS Americano')
    expect(names('java chip frappe')[0]).toBe('ZUS Java Chip Frappé')
  })

  it('matches the dishes named in the request', () => {
    expect(names('ayam gepuk')[0]).toMatch(/Ayam Gepuk/)
    expect(names('kebab')[0]).toMatch(/Kebab/)
    expect(names('ramly burger')[0]).toMatch(/Ramly Burger/)
  })

  it('matches other viral items', () => {
    expect(names('roti john')[0]).toBe('Roti John')
    expect(names('korean fried chicken')[0]).toMatch(/Korean Fried Chicken/)
    expect(names('tteokbokki')[0]).toBe('Tteokbokki')
    expect(names('boba')[0]).toMatch(/Bubble Tea|Boba/)
    expect(names('nasi kandar')[0]).toMatch(/Nasi Kandar/)
  })

  it('parses a realistic mixed order', () => {
    const r = parseQuickAdd('ayam gepuk and a zus spanish latte', FOODS)
    expect(r.matches).toHaveLength(2)
    expect(r.matches[0].food.name).toMatch(/Ayam Gepuk/)
    expect(r.matches[1].food.name).toBe('ZUS Spanish Latte')
  })

  it('still prefers the workbook entry when both could match', () => {
    // "Nasi Lemak" exists in the workbook; the pack must not shadow it.
    expect(names('nasi lemak')[0]).toBe('Nasi Lemak, standard')
  })
})
