/**
 * The workbook's non-food seeds: starting numbers, target notes, the shopping
 * list, vendors, prep steps, methodology and supplements.
 *
 * These used to live in `catalogue.ts` alongside `FOODS`, which was tidy right
 * up until it cost every screen 22 KB. `store/defaults.ts` needs three
 * constants from here to build a new account, the provider needs
 * `store/defaults.ts`, and the root layout renders the provider — so importing
 * `DEFAULT_TARGETS` from the same module that builds the 441-food catalogue put
 * all 441 foods in the chunk every route loads, including Shop and Supplements,
 * which never show a food.
 *
 * Webpack cannot drop `FOODS` on its own: it is built with `.map()` calls it
 * has to assume impure. A module boundary is what makes the difference, so this
 * file must never import `catalogue.ts` — that would quietly undo the split.
 */
import defaultsJson from '../../seed/defaults.json'
import shoppingJson from '../../seed/shopping.json'
import vendorsJson from '../../seed/vendors.json'
import prepJson from '../../seed/prep.json'
import methodologyJson from '../../seed/methodology.json'
import supplementsJson from '../../seed/supplements.json'
import type { Targets } from './types'

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
