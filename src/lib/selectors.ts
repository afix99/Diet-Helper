/** Derived reads shared across screens. Keeps components free of arithmetic. */
import { FOODS, RECIPES } from './catalogue'
import {
  EMPTY_MACROS,
  badges,
  isSalmon,
  scaleMacros,
  streak,
  sumMacros,
  type DayRecord,
} from './nutrition'
import { daysBetween, todayIso, weekDates, weekOf } from './dates'
import type { AppData } from './store/types'
import type { Food, LogEntry, Macros, MealSlot } from './types'

export { weekDates, weekOf }

export function allFoods(data: AppData): Food[] {
  return [...FOODS, ...data.customFoods]
}

export function findFood(data: AppData, id: string): Food | undefined {
  return allFoods(data).find((f) => f.id === id)
}

/**
 * Display name for a log entry, whichever kind of thing it references.
 * `customFoods` is optional so callers without the store can still name
 * catalogue items.
 */
export function entryName(entry: LogEntry, customFoods: readonly Food[] = []): string {
  if (entry.customName) return entry.customName
  if (entry.recipeId) return RECIPES.find((r) => r.id === entry.recipeId)?.name ?? 'Recipe'
  const known = FOODS.find((f) => f.id === entry.foodId)
  if (known) return known.name
  // Custom foods live in the store, not the bundled catalogue.
  return customFoods.find((f) => f.id === entry.foodId)?.name ?? 'Food'
}

export function entriesFor(data: AppData, date: string): LogEntry[] {
  return data.entries.filter((e) => e.date === date)
}

export function entriesForSlot(data: AppData, date: string, slot: MealSlot): LogEntry[] {
  return data.entries.filter((e) => e.date === date && e.slot === slot)
}

export function entryMacros(entry: LogEntry): Macros {
  return scaleMacros(entry.macros, entry.servings)
}

export function dayTotals(data: AppData, date: string): Macros {
  const items = entriesFor(data, date).map(entryMacros)
  return items.length ? sumMacros(items) : { ...EMPTY_MACROS }
}

export function dayRecords(data: AppData, dates: readonly string[]): DayRecord[] {
  // Bucket once: filtering the full log per day is O(days x entries) and this
  // runs on every render of Today.
  const byDate = new Map<string, LogEntry[]>()
  for (const entry of data.entries) {
    const list = byDate.get(entry.date)
    if (list) list.push(entry)
    else byDate.set(entry.date, [entry])
  }
  return dates.map((date) => {
    const entries = byDate.get(date) ?? []
    const totals = entries.length ? sumMacros(entries.map(entryMacros)) : { ...EMPTY_MACROS }
    return {
      date,
      kcal: totals.kcal,
      protein: totals.protein,
      salmonMeals: entries.filter((e) => isSalmon(entryName(e, data.customFoods))).length,
    }
  })
}

export function latestWeight(data: AppData): number | null {
  if (data.weights.length === 0) return null
  const sorted = [...data.weights].sort((a, b) => a.date.localeCompare(b.date))
  return sorted[sorted.length - 1].weightKg
}

/**
 * Streaks run over the user's whole history, not just the visible week — the
 * sheet could only see seven days because that was all it stored.
 *
 * Only days up to and including today count. The Week screen writes real
 * entries for days you plan ahead, and a planned dinner is not a logged one.
 */
export function streakFor(data: AppData, today: string = todayIso()) {
  const past = data.entries.filter((e) => e.date <= today).map((e) => e.date)
  if (past.length === 0) return streak([])
  const first = past.reduce((min, d) => (d < min ? d : min), past[0])
  const span = daysBetween(first, today) + 1
  return streak(dayRecords(data, weekDates(today, Math.max(1, span))))
}

export function badgesFor(data: AppData, today: string = todayIso()) {
  return badges({
    // Same reasoning as streakFor: future days in this week are plans, not meals.
    days: dayRecords(data, weekOf(today).filter((d) => d <= today)),
    targets: data.targets,
    startWeightKg: data.profile.startWeightKg,
    goalWeightKg: data.profile.goalWeightKg,
    latestWeightKg: latestWeight(data),
    bestStreak: streakFor(data, today).best,
  })
}

/** Most recently logged foods, newest first, for the one-tap rail. */
export function recentFoods(data: AppData, slot: MealSlot, limit = 8): Food[] {
  const seen = new Set<string>()
  const out: Food[] = []
  const sorted = [...data.entries].sort((a, b) => b.date.localeCompare(a.date))
  // Prefer things previously eaten in this slot, then anything else.
  for (const pool of [sorted.filter((e) => e.slot === slot), sorted]) {
    for (const e of pool) {
      if (!e.foodId || seen.has(e.foodId)) continue
      const food = findFood(data, e.foodId)
      if (!food) continue
      seen.add(e.foodId)
      out.push(food)
      if (out.length >= limit) return out
    }
  }
  return out
}

export function favouriteFoods(data: AppData): Food[] {
  return data.favourites
    .map((id) => findFood(data, id))
    .filter((f): f is Food => Boolean(f))
}
