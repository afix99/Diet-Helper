/**
 * The workbook's recipes, in their own module.
 *
 * Split out of `catalogue.ts` for the same reason `seedDefaults.ts` was: the
 * Recipes and Shop screens want these twenty rows and nothing else, and reading
 * them from the module that builds `FOODS` charged both screens the whole
 * 441-food catalogue. See the note in `seedDefaults.ts`.
 */
import recipesJson from '../../seed/recipes.json'
import type { Recipe } from './types'

/**
 * Recipe titles are stored SHOUTING in the workbook. Title-case them for
 * display, keeping short Malay particles lowercase the way a menu would.
 */
const LOWER_WORDS = new Set(['dan', 'di', 'ke', 'dari'])
function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(' ')
    .map((w, i) =>
      i > 0 && LOWER_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(' ')
}

export const RECIPES: Recipe[] = recipesJson.map((r) => ({
  id: r.slug,
  slug: r.slug,
  name: titleCase(r.name),
  minutes: r.minutes,
  kcal: r.kcal,
  protein: r.protein,
  carbs: r.carbs,
  fat: r.fat,
  fibre: r.fibre,
  ingredients: r.ingredients,
  steps: r.steps,
  chefsNote: r.chefsNote,
}))
