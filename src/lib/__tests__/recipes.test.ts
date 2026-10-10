import { describe, expect, it } from 'vitest'
import { RECIPES } from '../recipes'

const MENU_IDS = [
  'overnight-oats-banana-chia',
  'greek-yogurt-fruit-bowl',
  'tuna-egg-wholemeal-sandwich',
  'ayam-kunyit-vegetable-rice-bowl',
  'ayam-percik-brown-rice-bowl',
  'ikan-kembung-ulam-plate',
  'bihun-sup-ayam',
  'nasi-goreng-kampung-ringan',
  'tempeh-sambal-bowl',
  'tofu-ginger-soy-bowl',
  'chapati-with-dhal',
  'black-pepper-beef-vegetable-bowl',
]

describe('recipe menu', () => {
  it('keeps the seven workbook recipes and adds the twelve-menu expansion', () => {
    expect(RECIPES).toHaveLength(19)
    expect(RECIPES.filter((recipe) => MENU_IDS.includes(recipe.id))).toHaveLength(12)
  })

  it('has a unique id and name for every recipe', () => {
    expect(new Set(RECIPES.map((recipe) => recipe.id)).size).toBe(RECIPES.length)
    expect(new Set(RECIPES.map((recipe) => recipe.name)).size).toBe(RECIPES.length)
  })

  it('gives every recipe usable nutrition and cooking instructions', () => {
    for (const recipe of RECIPES) {
      expect(recipe.kcal).toBeGreaterThan(0)
      expect(recipe.protein).toBeGreaterThanOrEqual(0)
      expect(recipe.carbs).toBeGreaterThanOrEqual(0)
      expect(recipe.fat).toBeGreaterThanOrEqual(0)
      expect(recipe.fibre).toBeGreaterThanOrEqual(0)
      expect(recipe.minutes).toBeGreaterThan(0)
      expect(recipe.ingredients.length).toBeGreaterThanOrEqual(3)
      expect(recipe.steps.length).toBeGreaterThanOrEqual(2)
    }
  })
})
