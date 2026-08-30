/**
 * Date helpers for ISO `YYYY-MM-DD` day keys.
 *
 * Every function here does its arithmetic in UTC. Mixing a locally-constructed
 * Date with `toISOString()` silently shifts the day for any user east of
 * Greenwich — in UTC+8 it returned yesterday — which corrupted week ranges and
 * dropped today out of streak calculations entirely. Parsing and formatting
 * both stay in UTC so a day key means the same thing at every step.
 *
 * The one place local time is correct is deciding what "today" is, which is a
 * question about the user's wall clock rather than about a stored key.
 */

import type { MealSlot } from './types'

const MS_PER_DAY = 86_400_000

/** The user's current calendar date, from their wall clock. */
export function todayIso(): string {
  const now = new Date()
  return isoOf(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  )
}

/** Parse a day key to UTC midnight. */
export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Format a UTC date as a day key. */
export function isoOf(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  return isoOf(new Date(parseIso(iso).getTime() + days * MS_PER_DAY))
}

/** Whole days from `a` to `b`; negative when `b` is earlier. */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / MS_PER_DAY)
}

/** 0 = Monday … 6 = Sunday, matching the workbook's Isnin→Ahad ordering. */
export function dayOfWeek(iso: string): number {
  return (parseIso(iso).getUTCDay() + 6) % 7
}

/** The Monday-first week containing `iso`, oldest first. */
export function weekOf(iso: string): string[] {
  const monday = addDays(iso, -dayOfWeek(iso))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** `length` consecutive days ending at `end` (inclusive), oldest first. */
export function weekDates(end: string, length = 7): string[] {
  return Array.from({ length }, (_, i) => addDays(end, -(length - 1 - i)))
}

/** Human label for a day key, rendered from its UTC parts. */
export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions): string {
  return parseIso(iso).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' })
}

/**
 * Best guess at which meal you mean, from the time of day.
 *
 * Lived on Today as an inline useMemo. Progress now logs food too — from the
 * suggestion rail — and a second copy of these boundaries would be a second
 * thing to keep in step.
 */
export function slotForNow(hour = new Date().getHours()): MealSlot {
  if (hour < 10) return 'breakfast'
  if (hour < 12) return 'morning_snack'
  if (hour < 15) return 'lunch'
  if (hour < 18) return 'afternoon_snack'
  if (hour < 21) return 'dinner'
  return 'evening'
}
