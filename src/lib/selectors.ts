/** Derived reads shared across screens. Keeps components free of arithmetic. */
import { FOODS } from './catalogue'
import { RECIPES } from './recipes'
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
import {
  MEAL_SLOTS,
  type ActivityLog,
  type Food,
  type LogEntry,
  type Macros,
  type MealSlot,
} from './types'

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

/**
 * A day's entries, bucketed by meal slot in one pass.
 *
 * Today renders six meal cards, and each one calling `entriesForSlot` meant six
 * full scans of the whole diary on every render. Same reasoning as `dayRecords`
 * below: bucket once, hand out the lists.
 */
export function entriesBySlot(data: AppData, date: string): Record<MealSlot, LogEntry[]> {
  const out = Object.fromEntries(MEAL_SLOTS.map((s) => [s, [] as LogEntry[]])) as Record<
    MealSlot,
    LogEntry[]
  >
  for (const e of data.entries) {
    if (e.date === date) out[e.slot]?.push(e)
  }
  return out
}

export function entryMacros(entry: LogEntry): Macros {
  return scaleMacros(entry.macros, entry.servings)
}

export function dayTotals(data: AppData, date: string): Macros {
  const items = entriesFor(data, date).map(entryMacros)
  return items.length ? sumMacros(items) : { ...EMPTY_MACROS }
}

export function activitiesFor(data: AppData, date: string): ActivityLog[] {
  return data.activities.filter((a) => a.date === date)
}

/** Calories burned above rest on a day, from logged activity. */
export function burnedOn(data: AppData, date: string): number {
  let sum = 0
  for (const a of data.activities) if (a.date === date) sum += a.kcal
  return sum
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
  // Same one-pass bucketing for activity: the under-eating check reads a
  // fortnight of it on every render of Today.
  const burnByDate = new Map<string, number>()
  for (const a of data.activities) {
    burnByDate.set(a.date, (burnByDate.get(a.date) ?? 0) + a.kcal)
  }
  return dates.map((date) => {
    const entries = byDate.get(date) ?? []
    const totals = entries.length ? sumMacros(entries.map(entryMacros)) : { ...EMPTY_MACROS }
    return {
      date,
      kcal: totals.kcal,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      fibre: totals.fibre,
      burned: burnByDate.get(date) ?? 0,
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

/**
 * `bestStreak` is a parameter because `streakFor` walks the diary from the first
 * entry to today, and Today needs the streak for its own header anyway. Working
 * it out here as well meant a year of logging was traversed twice on every
 * render. Callers that do not already have it can leave it out.
 */
/** Every date from the first entry to today, so a rolling window has no holes. */
function loggedSpan(data: AppData, today: string): string[] {
  const past = data.entries.filter((e) => e.date <= today).map((e) => e.date)
  if (past.length === 0) return []
  const first = past.reduce((min, d) => (d < min ? d : min), past[0])
  return weekDates(today, Math.max(1, daysBetween(first, today) + 1))
}

/** Longest gap, in days, that still counts as "carried on" rather than a lapse. */
const LAPSE_DAYS = 3

/**
 * Everything the whole-diary badges need, in one pass over the entries.
 *
 * Six separate scans would be tidier to read and six times the work on a screen
 * that already re-renders on every keystroke.
 */
function history(data: AppData, today: string) {
  const catalogue = new Map(allFoods(data).map((f) => [f.id, f.category]))
  const dates = new Set<string>()
  const foods = new Set<string>()
  const categories = new Set<string>()
  let recipesCooked = 0

  for (const e of data.entries) {
    if (e.date > today) continue // planned meals are not eaten meals
    dates.add(e.date)
    if (e.recipeId) recipesCooked += 1
    if (!e.foodId) continue
    foods.add(e.foodId)
    const category = catalogue.get(e.foodId)
    if (category) categories.add(category)
  }

  // A gap longer than a lapse, followed by anything at all, is a comeback.
  const sorted = [...dates].sort()
  let returned = false
  for (let i = 1; i < sorted.length; i += 1) {
    if (daysBetween(sorted[i - 1], sorted[i]) > LAPSE_DAYS) {
      returned = true
      break
    }
  }

  const hydratedDays = Object.entries(data.water).filter(
    ([date, ml]) => date <= today && ml >= data.targets.waterMl
  ).length

  return {
    foodsTried: foods.size,
    categoriesTried: categories.size,
    recipesCooked,
    hydratedDays,
    returned,
  }
}

export function badgesFor(
  data: AppData,
  today: string = todayIso(),
  bestStreak: number = streakFor(data, today).best
) {
  return badges({
    /*
     * The whole diary, not this calendar week. The week badges look for your
     * best week inside it — see bestWindow in nutrition.ts — because scoping
     * them to the current week meant they un-earned themselves every Monday.
     * Future dates are excluded: a planned meal is not an eaten one.
     */
    days: dayRecords(data, loggedSpan(data, today)),
    targets: data.targets,
    startWeightKg: data.profile.startWeightKg,
    goalWeightKg: data.profile.goalWeightKg,
    latestWeightKg: latestWeight(data),
    bestStreak,
    ...history(data, today),
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
