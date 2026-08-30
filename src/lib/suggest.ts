/**
 * Food suggestions read out of the catalogue, not out of a hardcoded string.
 *
 * The coach used to recite "oats, ulam, guava and berries" as fixed text while
 * the app shipped 415 rows that knew Passionfruit carries 10.4g of fibre for
 * 97 kcal. Generic advice, no numbers, no serving size, and nothing to tap.
 *
 * Three rules shape what comes back:
 *
 * - **Rank by nutrient per calorie, not per serving.** In a deficit the
 *   currency is calories, so "most protein for the fewest kcal" is the question
 *   actually being asked. Ranking by grams alone would recommend the biggest
 *   portion of everything.
 * - **Prefer what you already eat.** A suggestion you have logged before is one
 *   you can buy, cook and stomach. The catalogue's theoretical best is worth
 *   nothing if it never appears in your kitchen.
 * - **Never suggest what is already on today's plate.** Telling someone to eat
 *   the tuna they logged an hour ago reads as an app that is not paying
 *   attention.
 */
import { allFoods, entriesFor } from './selectors'
import { todayIso } from './dates'
import type { AppData } from './store/types'
import type { Food } from './types'

export type Need = 'protein' | 'fibre' | 'omega3'

/** Oily fish, the way the workbook's own omega-3 rule counts them. */
const OILY_FISH = /salmon|kembung|sardine|mackerel|tuna|selar|tenggiri|herring|trout/i

/** Minimum a food must carry before it is worth naming for that need. */
const FLOOR: Record<Need, number> = { protein: 8, fibre: 2, omega3: 0 }

/** Below this the ratio is noise — a 20 kcal row can top any per-calorie rank. */
const MIN_KCAL = 25

const nutrient = (food: Food, need: Need): number =>
  need === 'fibre' ? food.fibre : food.protein

/** Grams of the nutrient per 100 kcal. The number a deficit actually cares about. */
export function density(food: Food, need: Need): number {
  if (food.kcal < MIN_KCAL) return 0
  return (nutrient(food, need) / food.kcal) * 100
}

export interface SuggestOptions {
  limit?: number
  /** Overridable so tests do not depend on the wall clock. */
  today?: string
}

export function suggestFoods(
  data: AppData,
  need: Need,
  { limit = 3, today = todayIso() }: SuggestOptions = {}
): Food[] {
  const onPlate = new Set(entriesFor(data, today).map((e) => e.foodId).filter(Boolean))

  // Anything logged before, ever — the "you actually eat this" signal.
  const familiar = new Set(data.entries.map((e) => e.foodId).filter(Boolean))

  const eligible = allFoods(data).filter((f) => {
    if (onPlate.has(f.id)) return false
    if (f.kcal < MIN_KCAL) return false
    if (need === 'omega3') return OILY_FISH.test(f.name)
    return nutrient(f, need) >= FLOOR[need]
  })

  return eligible
    .sort((a, b) => {
      // Familiar first, then by density. A tie on both is settled by name so
      // the rail does not reshuffle between renders.
      const fa = familiar.has(a.id) ? 1 : 0
      const fb = familiar.has(b.id) ? 1 : 0
      if (fa !== fb) return fb - fa
      const d = density(b, need) - density(a, need)
      if (Math.abs(d) > 0.001) return d
      return a.name.localeCompare(b.name)
    })
    .slice(0, limit)
}

/** The one number worth showing beside a pick, already rounded for display. */
export function headlineFor(food: Food, need: Need): string {
  if (need === 'fibre') return `${Math.round(food.fibre)}g fibre`
  return `${Math.round(food.protein)}g protein`
}
