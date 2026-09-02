/**
 * What you actually eat in this slot, ready to log in one tap.
 *
 * The app already knew this and made you search anyway. Logging a familiar
 * breakfast cost five steps — find the slot, open the picker, wait for the
 * sheet, search or scroll 415 rows, tap — for a food eaten forty times before.
 * Every one of those steps is a place to give up, and giving up is the failure
 * mode this app has to design around.
 *
 * Two rules shape the ranking:
 *
 * - **Slot-specific.** Nasi lemak at 8am and nasi lemak at 9pm are different
 *   habits. Ranking across the whole day would put dinner in your breakfast.
 * - **Recency-weighted, not just counted.** A food eaten daily for a month and
 *   then dropped would otherwise outrank what you have actually been eating
 *   this week, forever. The weight halves roughly every three weeks, so the
 *   list follows you.
 */
import { entriesFor, favouriteFoods, findFood } from './selectors'
import { daysBetween, todayIso } from './dates'
import type { AppData } from './store/types'
import type { Food, MealSlot } from './types'

/** Days after which a log counts for half. Three weeks: a habit, not a phase. */
export const HALF_LIFE_DAYS = 21

/** Older than this and it is history, not a habit. */
const WINDOW_DAYS = 90

export interface UsualOptions {
  limit?: number
  /** Overridable so tests do not depend on the wall clock. */
  today?: string
}

/** How much a log from `date` still counts for, 0–1. */
export function weightFor(date: string, today: string): number {
  const age = daysBetween(date, today)
  if (age < 0 || age > WINDOW_DAYS) return 0
  return Math.pow(0.5, age / HALF_LIFE_DAYS)
}

export function usualFor(
  data: AppData,
  slot: MealSlot,
  { limit = 3, today = todayIso() }: UsualOptions = {}
): Food[] {
  // Never offer what is already on today's plate — suggesting the thing you
  // logged ten minutes ago reads as an app that is not paying attention.
  const onPlate = new Set(entriesFor(data, today).map((e) => e.foodId).filter(Boolean))

  const score = new Map<string, number>()
  for (const e of data.entries) {
    if (!e.foodId || e.slot !== slot || e.date > today || onPlate.has(e.foodId)) continue
    const w = weightFor(e.date, today)
    if (w === 0) continue
    score.set(e.foodId, (score.get(e.foodId) ?? 0) + w)
  }

  const ranked = [...score.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => findFood(data, id))
    .filter((f): f is Food => Boolean(f))
    .slice(0, limit)

  if (ranked.length >= limit) return ranked

  /*
   * A slot with no history falls back to favourites, then to nothing. Padding
   * with an arbitrary catalogue food would be a guess dressed as a habit, and
   * the empty state — just "+ Add food" — is honest and already fine.
   */
  const seen = new Set(ranked.map((f) => f.id))
  for (const f of favouriteFoods(data)) {
    if (ranked.length >= limit) break
    if (seen.has(f.id) || onPlate.has(f.id)) continue
    seen.add(f.id)
    ranked.push(f)
  }
  return ranked
}

/**
 * What she eats most, across the whole day rather than one slot.
 *
 * `usualFor` above answers "what goes in *this* meal", and carries two rules
 * that belong to the Today screen and nowhere else: it is scoped to a slot, and
 * it hides anything already on today's plate. Both are wrong for a browsable
 * list — you should be able to find your usual breakfast at nine at night, and
 * logging something should not make it vanish from the catalogue.
 *
 * So this shares the scoring and none of the Today-specific rules: the same
 * `weightFor` half-life, the same ninety-day window, summed across every slot.
 */
export function oftenLogged(
  data: AppData,
  { limit = 8, today = todayIso() }: UsualOptions = {}
): Food[] {
  const score = new Map<string, number>()
  for (const e of data.entries) {
    if (!e.foodId || e.date > today) continue
    const w = weightFor(e.date, today)
    if (w === 0) continue
    score.set(e.foodId, (score.get(e.foodId) ?? 0) + w)
  }

  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id]) => findFood(data, id))
    .filter((f): f is Food => Boolean(f))
    .slice(0, limit)
}
