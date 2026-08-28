import { describe, expect, it } from 'vitest'
import { aggregateIngredients, parseIngredient } from '../ingredients'
import { RECIPES } from '../catalogue'

describe('parseIngredient', () => {
  it('reads a mass glued to its number', () => {
    expect(parseIngredient('150g salmon fillet')).toMatchObject({
      quantity: 150,
      unit: 'g',
      name: 'salmon fillet',
    })
  })

  it('reads a spaced quantity and unit', () => {
    expect(parseIngredient('1 tbsp sambal tumis')).toMatchObject({
      quantity: 1,
      unit: 'tbsp',
      name: 'sambal tumis',
    })
  })

  it('understands unicode and written fractions', () => {
    expect(parseIngredient('½ tsp turmeric powder').quantity).toBe(0.5)
    expect(parseIngredient('1/2 lemon').quantity).toBe(0.5)
    expect(parseIngredient('1½ cups rice').quantity).toBe(1.5)
  })

  it('normalises unit spellings so they can be summed', () => {
    expect(parseIngredient('2 cloves garlic').unit).toBe('clove')
    expect(parseIngredient('1 clove garlic').unit).toBe('clove')
    expect(parseIngredient('200 grams tofu').unit).toBe('g')
  })

  it('strips preparation notes, which are not what you buy', () => {
    expect(parseIngredient('2 cloves garlic, minced').name).toBe('garlic')
    expect(parseIngredient('1 tomato, quartered').name).toBe('tomato')
    expect(parseIngredient('150g salmon (flaked, fresh or canned)').name).toBe('salmon')
  })

  it('copes with no quantity at all', () => {
    expect(parseIngredient('Black pepper')).toMatchObject({
      quantity: null,
      unit: null,
      name: 'black pepper',
    })
  })

  it('keeps the original text so nothing is silently lost', () => {
    expect(parseIngredient('150g salmon fillet').raw).toBe('150g salmon fillet')
  })
})

describe('aggregateIngredients', () => {
  it('sums the same item across recipes', () => {
    const out = aggregateIngredients([
      '150g salmon fillet',
      '150g salmon fillet',
      '150g salmon fillet',
    ])
    expect(out).toHaveLength(1)
    expect(out[0].label).toBe('450g Salmon Fillet')
    expect(out[0].count).toBe(3)
  })

  it('keeps incompatible units apart rather than adding nonsense', () => {
    const out = aggregateIngredients(['150g salmon', '1 tin salmon'])
    expect(out).toHaveLength(1)
    // 150 g and 1 tin cannot be one number.
    expect(out[0].label).toContain('150g')
    expect(out[0].label).toContain('1 tin')
  })

  it('counts recipes for items with no stated quantity', () => {
    const out = aggregateIngredients(['Black pepper', 'Black pepper', 'Black pepper'])
    expect(out[0].label).toBe('Black Pepper (3 recipes)')
  })

  it('merges items written with different unit spellings', () => {
    const out = aggregateIngredients(['2 cloves garlic', '1 clove garlic, minced'])
    expect(out).toHaveLength(1)
    expect(out[0].label).toBe('3 cloves Garlic')
  })

  it('sorts alphabetically for a scannable list', () => {
    const out = aggregateIngredients(['1 tomato', '150g salmon', '2 cloves garlic'])
    expect(out.map((o) => o.name)).toEqual(['garlic', 'salmon', 'tomato'])
  })

  it('returns nothing for an empty plan', () => {
    expect(aggregateIngredients([])).toEqual([])
  })
})

describe('against the real recipe collection', () => {
  it('collapses the two salmon-heavy recipes into fewer lines than inputs', () => {
    const two = RECIPES.slice(0, 2).flatMap((r) => r.ingredients)
    const out = aggregateIngredients(two)
    expect(out.length).toBeLessThan(two.length)
    // Both recipes call for 150g salmon fillet, so it should total 300g.
    const salmon = out.find((o) => o.name.includes('salmon'))
    expect(salmon?.label).toContain('300g')
  })

  it('parses every ingredient in the workbook without producing an empty name', () => {
    const all = RECIPES.flatMap((r) => r.ingredients)
    expect(all.length).toBeGreaterThan(30)
    for (const raw of all) {
      expect(parseIngredient(raw).name.length).toBeGreaterThan(0)
    }
  })
})
