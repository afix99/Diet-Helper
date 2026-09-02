/**
 * The food and recipe catalogue is bundled at build time rather than fetched.
 *
 * It is 69 rows that change only when the workbook does, so shipping it in the
 * JS payload means search is instant, works offline, and costs no round trip —
 * which matters because the whole design goal is a five-second log.
 */
import foodsJson from '../../seed/foods.json'
import viralFoodsJson from '../../seed/viral-foods.json'
import sushiJson from '../../seed/sushi-delivery.json'
import fruitsJson from '../../seed/fruits.json'
import pantryJson from '../../seed/pantry.json'
import recipesJson from '../../seed/recipes.json'
import defaultsJson from '../../seed/defaults.json'
import shoppingJson from '../../seed/shopping.json'
import vendorsJson from '../../seed/vendors.json'
import prepJson from '../../seed/prep.json'
import methodologyJson from '../../seed/methodology.json'
import supplementsJson from '../../seed/supplements.json'
import exercisesJson from '../../seed/exercises.json'
import type { Exercise, Food, Recipe, Targets } from './types'

type RawFood = {
  slug: string
  category: string | null
  name: string
  servingSize: string | null
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  fibre: number | null
  glycemicLoad: number | null
  notes: string | null
}

const toFood = (f: RawFood, source: Food['source']): Food => ({
  id: f.slug,
  slug: f.slug,
  category: f.category ?? 'OTHER',
  name: f.name,
  servingSize: f.servingSize,
  kcal: f.kcal ?? 0,
  protein: f.protein ?? 0,
  carbs: f.carbs ?? 0,
  fat: f.fat ?? 0,
  fibre: f.fibre ?? 0,
  glycemicLoad: f.glycemicLoad,
  notes: f.notes,
  ownerId: null,
  source,
})

/**
 * The workbook's validated foods first, then the chain and street-food pack.
 * Order matters: search and the quick-add matcher scan in sequence, so a
 * verified entry wins a tie against an estimated one.
 */
export const FOODS: Food[] = [
  ...(foodsJson as RawFood[]).map((f) => toFood(f, 'workbook')),
  ...(fruitsJson as RawFood[]).map((f) => toFood(f, 'community')),
  ...(pantryJson as RawFood[]).map((f) => toFood(f, 'community')),
  ...(viralFoodsJson as RawFood[]).map((f) => toFood(f, 'community')),
  // One local restaurant's menu, read off its GrabFood listing. Same
  // `community` tier as the rest: nobody publishes nutrition for a don, so
  // every row is built up from the components the menu itself describes.
  ...(sushiJson as RawFood[]).map((f) => toFood(f, 'community')),
]

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

/**
 * The activity catalogue, bundled the same way the foods are.
 *
 * MET values come from the Compendium of Physical Activities (Ainsworth et al.,
 * 2011). They are population means measured mostly on young lean adults, so any
 * individual is easily 20-30% either side — which is why every screen that
 * shows a burn calls it an estimate.
 */
export const EXERCISES: Exercise[] = (
  exercisesJson as { slug: string; category: string; name: string; met: number; notes: string | null }[]
).map((e) => ({
  id: e.slug,
  slug: e.slug,
  category: e.category,
  name: e.name,
  met: e.met,
  notes: e.notes,
}))

/** Catalogue order, preserved — gentlest groups are not first, movement is. */
export const EXERCISE_CATEGORIES: string[] = EXERCISES.reduce<string[]>((acc, e) => {
  if (!acc.includes(e.category)) acc.push(e.category)
  return acc
}, [])

/** Workbook category order, preserved — it groups the way a shopper thinks. */
export const FOOD_CATEGORIES: string[] = FOODS.reduce<string[]>((acc, f) => {
  if (!acc.includes(f.category)) acc.push(f.category)
  return acc
}, [])

export const DEFAULT_TARGETS: Targets = {
  kcal: defaultsJson.targets.kcal ?? 1500,
  protein: defaultsJson.targets.protein ?? 90,
  carbs: defaultsJson.targets.carbs ?? 130,
  fat: defaultsJson.targets.fat ?? 50,
  fibre: defaultsJson.targets.fibre ?? 30,
  waterMl: defaultsJson.targets.waterMl ?? 2500,
}

export const TARGET_NOTES: Record<keyof Targets, string> = {
  kcal: defaultsJson.targets.kcalNote ?? '',
  protein: defaultsJson.targets.proteinNote ?? '',
  carbs: defaultsJson.targets.carbsNote ?? '',
  fat: defaultsJson.targets.fatNote ?? '',
  fibre: defaultsJson.targets.fibreNote ?? '',
  waterMl: defaultsJson.targets.waterMlNote ?? '',
}

export const DEFAULTS = defaultsJson
export const SHOPPING_SEED = shoppingJson
export const VENDORS = vendorsJson
export const PREP = prepJson
export const METHODOLOGY = methodologyJson
export const SUPPLEMENTS = supplementsJson
