/**
 * The food catalogue, bundled at build time rather than fetched.
 *
 * 441 food rows that change only when the workbook does, so shipping them in
 * the JS payload means search is instant, works offline, and costs no round
 * trip — which matters because the whole design goal is a five-second log.
 *
 * That decision has a price: ~99 KB of JSON, ~22 KB over the wire. It is worth
 * paying on the screens that search food and nowhere else, which is why the
 * workbook's other seeds now live in `seedDefaults.ts`, the recipes in
 * `recipes.ts` and the activities in `exerciseCatalogue.ts`. All three are
 * re-exported at the bottom so existing imports keep working, but a screen that
 * wants only a target note, a recipe or a MET value should import it from
 * there — reading it from here drags all 441 foods along.
 */
import foodsJson from '../../seed/foods.json'
import viralFoodsJson from '../../seed/viral-foods.json'
import sushiJson from '../../seed/sushi-delivery.json'
import fruitsJson from '../../seed/fruits.json'
import pantryJson from '../../seed/pantry.json'
import type { Food } from './types'

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

/** Workbook category order, preserved — it groups the way a shopper thinks. */
export const FOOD_CATEGORIES: string[] = FOODS.reduce<string[]>((acc, f) => {
  if (!acc.includes(f.category)) acc.push(f.category)
  return acc
}, [])

/*
 * Kept so the many existing imports of these names from `@/lib/catalogue`
 * still resolve. New code should reach for the source module instead: anything
 * imported from here pulls `FOODS` into the caller's chunk.
 */
export { RECIPES } from './recipes'
export { EXERCISES, EXERCISE_CATEGORIES } from './exerciseCatalogue'
export {
  DEFAULT_TARGETS,
  TARGET_NOTES,
  DEFAULTS,
  SHOPPING_SEED,
  VENDORS,
  PREP,
  METHODOLOGY,
  SUPPLEMENTS,
} from './seedDefaults'
