import { describe, expect, it } from 'vitest'
import { extractQuantity, parseQuickAdd, splitPhrases } from '../quickAdd'
import { FOODS } from '../catalogue'

const parse = (s: string) => parseQuickAdd(s, FOODS)
const names = (s: string) => parse(s).matches.map((m) => m.food.name)

describe('splitPhrases', () => {
  it('splits the ways people actually write a meal', () => {
    expect(splitPhrases('2 eggs, brown rice and a banana')).toEqual([
      '2 eggs',
      'brown rice',
      'a banana',
    ])
    expect(splitPhrases('oats + berries')).toEqual(['oats', 'berries'])
  })
})

describe('extractQuantity', () => {
  it('reads digits and number words', () => {
    expect(extractQuantity('2 eggs').servings).toBe(2)
    expect(extractQuantity('two eggs').servings).toBe(2)
    expect(extractQuantity('a banana').servings).toBe(1)
    expect(extractQuantity('half an avocado').servings).toBe(0.5)
    expect(extractQuantity('1.5 cups rice').servings).toBe(1.5)
    expect(extractQuantity('3x tempeh').servings).toBe(3)
  })

  it('treats a weight as a portion size, not a serving count', () => {
    // The catalogue is already per-serving, so "150g salmon" is one serving.
    expect(extractQuantity('150g salmon').servings).toBe(1)
    expect(extractQuantity('150 g salmon').servings).toBe(1)
  })

  it('defaults to one when no quantity is given', () => {
    expect(extractQuantity('nasi lemak').servings).toBe(1)
  })
})

describe('parseQuickAdd matches real catalogue foods', () => {
  it('matches a plain single food', () => {
    expect(names('banana')).toContain('Banana')
  })

  it('handles plurals', () => {
    expect(names('eggs')[0]).toMatch(/Egg/)
  })

  it('matches Malaysian dishes by their common name', () => {
    expect(names('nasi lemak')[0]).toMatch(/Nasi Lemak/)
    expect(names('teh tarik')[0]).toMatch(/Teh Tarik/)
    expect(names('roti canai')[0]).toMatch(/Roti Canai/)
  })

  it('prefers the shorter name when several could match', () => {
    // "Banana" should win over any longer name also containing the word.
    expect(names('banana')[0]).toBe('Banana')
  })

  it('parses a whole sentence into several entries with quantities', () => {
    const r = parse('2 eggs, a cup of brown rice and teh tarik')
    expect(r.matches).toHaveLength(3)
    expect(r.matches[0].servings).toBe(2)
    expect(r.matches[0].food.name).toMatch(/Egg/)
    expect(r.matches[1].food.name).toMatch(/Brown Rice/)
    expect(r.matches[2].food.name).toMatch(/Teh Tarik/)
  })

  it('ignores filler words around the food', () => {
    expect(names('I had some grilled chicken breast')[0]).toMatch(/Chicken Breast/)
  })

  it('reports fragments it could not match instead of guessing', () => {
    const r = parse('borscht')
    expect(r.matches).toHaveLength(0)
    expect(r.unmatched).toEqual(['borscht'])
  })

  it('keeps the matched and unmatched parts of a mixed sentence', () => {
    const r = parse('banana and borscht')
    expect(r.matches.map((m) => m.food.name)).toEqual(['Banana'])
    expect(r.unmatched).toEqual(['borscht'])
  })

  it('matches on the food, not on how it was cooked', () => {
    /*
     * "grilled" fits half the catalogue; "salmon" fits one thing. Weighted
     * equally, "grilled salmon" settled for "Bacon, grilled" the moment bacon
     * was added, because that name is shorter. Preparation words refine a
     * choice, they do not drive it.
     */
    expect(names('grilled salmon')[0]).toMatch(/Salmon/)
    expect(names('fried chicken')[0]).toMatch(/Chicken/)
    expect(names('steamed broccoli')[0]).toMatch(/Broccoli/)
  })

  it('will not guess a food from a preparation word alone', () => {
    // "something grilled" is not enough to pick a food out of the catalogue.
    expect(parse('grilled').matches).toHaveLength(0)
    expect(parse('steamed').matches).toHaveLength(0)
  })

  it('splits on "with", since a log entry of X with Y is two foods', () => {
    expect(names('grilled salmon with steamed broccoli')).toEqual([
      'Atlantic Salmon, raw',
      'Broccoli, steamed',
    ])
  })

  it('ignores a leading "I ate" without losing the quantity after it', () => {
    const r = parse('i ate two thosai and a black coffee')
    expect(r.matches[0].servings).toBe(2)
    expect(r.matches[0].food.name).toMatch(/Thosai/)
    expect(r.matches[1].food.name).toMatch(/Black Coffee/)
  })

  it('keeps a fractional quantity through trailing filler words', () => {
    const r = parse('half avocado on toast')
    expect(r.matches[0].food.name).toBe('Avocado')
    expect(r.matches[0].servings).toBe(0.5)
  })

  it('returns nothing for empty input', () => {
    expect(parse('')).toEqual({ matches: [], unmatched: [] })
  })

  it('carries a confidence score so the UI can flag weak guesses', () => {
    const r = parse('banana')
    expect(r.matches[0].confidence).toBeGreaterThan(0.8)
  })
})
