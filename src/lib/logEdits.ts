/**
 * Every edit the food log can take, as plain functions from one AppData to the
 * next.
 *
 * They lived inside `useLogging` as closures, which made the module that writes
 * every entry the only one in `lib/` with no unit tests — it could only be
 * reached through React, and so was only ever covered indirectly by the browser
 * suites. Pulling the arithmetic out changes no behaviour and makes the rules
 * below assertable: the serving floor, the quarter-step rounding, and the fact
 * that copying a day *replaces* the destination rather than merging into it.
 *
 * `mintId` is a parameter so a test can be deterministic without stubbing
 * globals.
 */
import type { AppData } from './store/types'
import { burnFor, clampMinutes } from './exercise'
import { normalisePetName } from './pet'
import type {
  AccessorySlot,
  ActivityLog,
  Exercise,
  Food,
  LogEntry,
  Macros,
  MealSlot,
  Recipe,
} from './types'

/** Smallest loggable portion, and the step every serving is rounded to. */
export const MIN_SERVINGS = 0.25
export const SERVING_STEP = 0.25

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `e${Date.now()}${Math.random().toString(16).slice(2)}`
}

const macrosOf = (m: Macros): Macros => ({
  kcal: m.kcal,
  protein: m.protein,
  carbs: m.carbs,
  fat: m.fat,
  fibre: m.fibre,
})

export function addFood(
  d: AppData,
  date: string,
  slot: MealSlot,
  food: Food,
  servings = 1,
  mintId: () => string = newId
): AppData {
  return {
    ...d,
    entries: [
      ...d.entries,
      {
        id: mintId(),
        date,
        slot,
        foodId: food.id,
        recipeId: null,
        // Snapshot a custom food's name too: it lives in the store, so deleting
        // it later would otherwise orphan every entry using it.
        customName: food.ownerId ? food.name : null,
        servings,
        notes: null,
        // Snapshot the macros so editing a food later cannot rewrite history.
        macros: macrosOf(food),
      },
    ],
  }
}

export function addRecipe(
  d: AppData,
  date: string,
  slot: MealSlot,
  recipe: Recipe,
  servings = 1,
  mintId: () => string = newId
): AppData {
  return {
    ...d,
    entries: [
      ...d.entries,
      {
        id: mintId(),
        date,
        slot,
        foodId: null,
        recipeId: recipe.id,
        customName: null,
        servings,
        notes: null,
        macros: macrosOf(recipe),
      },
    ],
  }
}

export function removeEntry(d: AppData, id: string): AppData {
  return { ...d, entries: d.entries.filter((e) => e.id !== id) }
}

/** Never below a quarter portion, and always on a quarter step. */
export function setServings(d: AppData, id: string, servings: number): AppData {
  const steps = Math.round(1 / SERVING_STEP)
  const clamped = Math.max(MIN_SERVINGS, Math.round(servings * steps) / steps)
  return {
    ...d,
    entries: d.entries.map((e) => (e.id === id ? { ...e, servings: clamped } : e)),
  }
}

export function toggleFavourite(d: AppData, foodId: string): AppData {
  return {
    ...d,
    favourites: d.favourites.includes(foodId)
      ? d.favourites.filter((f) => f !== foodId)
      : [...d.favourites, foodId],
  }
}

/**
 * Copy one day's meals onto another.
 *
 * This **replaces** the destination day rather than adding to it: the Week
 * screen's gesture is "make Tuesday look like Monday", and appending would
 * silently double a day someone copied onto twice.
 */
export function copyDay(
  d: AppData,
  from: string,
  to: string,
  mintId: () => string = newId
): AppData {
  const source = d.entries.filter((e) => e.date === from)
  const kept = d.entries.filter((e) => e.date !== to)
  return { ...d, entries: [...kept, ...source.map((e) => ({ ...e, id: mintId(), date: to }))] }
}

export function addCustomFood(
  d: AppData,
  food: Omit<Food, 'id' | 'slug' | 'ownerId'>,
  mintId: () => string = newId
): { data: AppData; id: string } {
  const id = `custom-${mintId()}`
  return {
    data: { ...d, customFoods: [...d.customFoods, { ...food, id, slug: id, ownerId: 'local' }] },
    id,
  }
}

/**
 * Remove a food from the catalogue. Past entries keep their snapshotted name
 * and macros, so history stays readable.
 */
export function deleteCustomFood(d: AppData, id: string): AppData {
  return {
    ...d,
    customFoods: d.customFoods.filter((f) => f.id !== id),
    favourites: d.favourites.filter((f) => f !== id),
  }
}

// --- Activities -------------------------------------------------------------

/**
 * Log a bout of exercise.
 *
 * The kcal figure is computed here and stored, rather than derived at read
 * time, for the same reason food entries snapshot their macros: a weigh-in next
 * month should not quietly re-price last week's badminton.
 */
export function addActivity(
  d: AppData,
  date: string,
  exercise: Exercise,
  minutes: number,
  weightKg: number,
  mintId: () => string = newId
): AppData {
  const mins = clampMinutes(minutes)
  return {
    ...d,
    activities: [
      ...d.activities,
      {
        id: mintId(),
        date,
        exerciseId: exercise.id,
        customName: null,
        minutes: mins,
        kcal: burnFor(exercise.met, weightKg, mins),
      },
    ],
  }
}

export function removeActivity(d: AppData, id: string): AppData {
  return { ...d, activities: d.activities.filter((a) => a.id !== id) }
}

/**
 * Change how long a bout lasted, re-pricing it from the same MET and the same
 * body weight it was first logged against — so editing a duration cannot
 * smuggle in a weight change.
 */
export function setActivityMinutes(d: AppData, id: string, minutes: number): AppData {
  const mins = clampMinutes(minutes)
  return {
    ...d,
    activities: d.activities.map((a) => {
      if (a.id !== id) return a
      // kcal is linear in minutes, so the original rate is recoverable exactly.
      const perMinute = a.minutes > 0 ? a.kcal / a.minutes : 0
      return { ...a, minutes: mins, kcal: Math.round(perMinute * mins) }
    }),
  }
}

// --- The streak cat -----------------------------------------------------------

export function renamePet(d: AppData, name: string): AppData {
  return { ...d, pet: { ...d.pet, name: normalisePetName(name) } }
}

export function sendPetHome(d: AppData): AppData {
  return { ...d, pet: { ...d.pet, out: false } }
}

export function callPetOut(d: AppData): AppData {
  return { ...d, pet: { ...d.pet, out: true } }
}

/**
 * Record that a stage has been celebrated.
 *
 * Monotonic on purpose: a celebration cannot re-fire, and a diary edit that
 * lowered the best streak must not re-arm one either. `Math.max` is what makes
 * "once, ever" true rather than "once, usually".
 */
export function markPetStageSeen(d: AppData, stageIndex: number): AppData {
  if (stageIndex <= d.pet.seenStage) return d
  return { ...d, pet: { ...d.pet, seenStage: Math.max(d.pet.seenStage, stageIndex) } }
}

// --- The wardrobe -------------------------------------------------------------

/**
 * Wear one item in its slot.
 *
 * Takes any costume off, because a costume is a whole look — leaving it on
 * while one of its slots was overridden would draw a chef with a snorkel and
 * no way to explain where the apron went. What was worn underneath is left in
 * `worn` untouched, so `takeOffCostume` can restore it.
 */
export function wearItem(d: AppData, slot: AccessorySlot, id: string): AppData {
  return {
    ...d,
    pet: { ...d.pet, costume: null, worn: { ...d.pet.worn, [slot]: id } },
  }
}

export function removeItem(d: AppData, slot: AccessorySlot): AppData {
  return { ...d, pet: { ...d.pet, costume: null, worn: { ...d.pet.worn, [slot]: null } } }
}

/** Put a costume on. `worn` is deliberately not cleared — see `wearItem`. */
export function wearCostume(d: AppData, costumeId: string): AppData {
  return { ...d, pet: { ...d.pet, costume: costumeId } }
}

export function takeOffCostume(d: AppData): AppData {
  return { ...d, pet: { ...d.pet, costume: null } }
}

/**
 * Mark unlock ids as seen, so the "new" dot clears.
 *
 * Idempotent, and a union rather than a replacement: two wardrobe screens open
 * at once must not be able to un-see something.
 */
export function markUnlocksSeen(d: AppData, ids: readonly string[]): AppData {
  const seen = new Set(d.pet.seenUnlocks)
  const before = seen.size
  for (const id of ids) seen.add(id)
  if (seen.size === before) return d
  return { ...d, pet: { ...d.pet, seenUnlocks: [...seen] } }
}

export type { ActivityLog, LogEntry }
