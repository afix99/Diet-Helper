import { DEFAULT_TARGETS, DEFAULTS, SHOPPING_SEED } from '../catalogue'
import { todayIso } from '../dates'
import { DEFAULT_PRESET } from '../targets'

export { todayIso }
import type { Profile } from '../types'
import type { AppData, ShoppingItem } from './types'


/**
 * A new account starts on the workbook's own numbers (62 kg → 55 kg, 1500 kcal)
 * so the app is immediately useful, and every one of them is editable in
 * Settings.
 */
export function defaultProfile(): Profile {
  return {
    id: 'local',
    displayName: null,
    sex: 'female',
    heightCm: null,
    age: null,
    startWeightKg: DEFAULTS.startWeightKg ?? 62,
    goalWeightKg: DEFAULTS.goalWeightKg ?? 55,
    bodyFatPct: null,
    startDate: todayIso(),
    activityLevel: 'sedentary',
  }
}

export function defaultShopping(): ShoppingItem[] {
  return SHOPPING_SEED.map((s, i) => ({
    id: `seed-${i}`,
    category: s.category ?? 'OTHER',
    item: s.item,
    qty: s.qty,
    estCostRm: s.estCostRm,
    vendor: s.vendor,
    priority: s.priority,
    checked: false,
  }))
}

export function defaultData(): AppData {
  return {
    profile: defaultProfile(),
    targets: { ...DEFAULT_TARGETS },
    entries: [],
    activities: [],
    weights: [],
    customFoods: [],
    shopping: defaultShopping(),
    favourites: [],
    checkedPrep: [],
    water: {},
    micronutrients: {},
    supplements: {},
    targetLocks: {},
    targetPreset: DEFAULT_PRESET,
  }
}
