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
import type { AppData } from './store/types'
import type { Food, LogEntry, Macros, MealSlot } from './types'

export function allFoods(data: AppData): Food[] {
  return [...FOODS, ...data.customFoods]
}

export function findFood(data: AppData, id: string): Food | undefined {
  return allFoods(data).find((f) => f.id === id)
}

/** Display name for a log entry, whichever kind of thing it references. */
export function entryName(entry: LogEntry): string {
  if (entry.customName) return entry.customName
  if (entry.recipeId) return RECIPES.find((r) => r.id === entry.recipeId)?.name ?? 'Resipi'
  return FOODS.find((f) => f.id === entry.foodId)?.name ?? 'Makanan'
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

/** ISO dates for the seven days ending at `end`, oldest first. */
export function weekDates(end: string, length = 7): string[] {
  const base = new Date(`${end}T00:00:00`)
  return Array.from({ length }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() - (length - 1 - i))
    return d.toISOString().slice(0, 10)
  })
}

/** Monday-first week containing `date`. Matches the sheet's Isnin→Ahad order. */
export function weekOf(date: string): string[] {
  const d = new Date(`${date}T00:00:00`)
  const dow = (d.getDay() + 6) % 7 // Monday = 0
  const monday = new Date(d)
  monday.setDate(d.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    return x.toISOString().slice(0, 10)
  })
}

export function dayRecords(data: AppData, dates: readonly string[]): DayRecord[] {
  return dates.map((date) => {
    const entries = entriesFor(data, date)
    const totals = entries.length
      ? sumMacros(entries.map(entryMacros))
      : { ...EMPTY_MACROS }
    return {
      date,
      kcal: totals.kcal,
      protein: totals.protein,
      salmonMeals: entries.filter((e) => isSalmon(entryName(e))).length,
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
 */
export function streakFor(data: AppData, today: string) {
  const dates = data.entries.map((e) => e.date)
  if (dates.length === 0) return streak([])
  const first = dates.reduce((min, d) => (d < min ? d : min), dates[0])
  const span =
    Math.round(
      (new Date(`${today}T00:00:00`).getTime() - new Date(`${first}T00:00:00`).getTime()) /
        86_400_000
    ) + 1
  return streak(dayRecords(data, weekDates(today, Math.max(1, span))))
}

export function badgesFor(data: AppData, today: string) {
  return badges({
    days: dayRecords(data, weekOf(today)),
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
