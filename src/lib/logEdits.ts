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
import type { ActivityLog, Exercise, Food, LogEntry, Macros, MealSlot, Recipe } from './types'

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

export type { ActivityLog, LogEntry }
