/**
 * Warns when logged intake has been below the daily floor for several days.
 *
 * This is the one place the app raises its voice, so the rules around it matter
 * as much as the arithmetic:
 *
 * - **Only completed days count.** Today is still in progress; at 9am a real
 *   diary looks identical to a starved one. Counting it would fire the warning
 *   at breakfast every morning, which teaches people to ignore it.
 * - **Only logged days count.** A day with nothing in it means the app was not
 *   opened, not that nothing was eaten.
 * - **The window is recent.** Two bad days last month are history; two in the
 *   last week are a pattern worth mentioning.
 *
 * It cannot distinguish under-eating from under-logging, so the copy it drives
 * says so rather than accusing anyone.
 */
import { MIN_DAILY_KCAL, bmr, type DayRecord } from './nutrition'
import type { Sex } from './types'

/** Days back to look. A week, so the signal reflects now rather than ever. */
export const WINDOW_DAYS = 7
/** Days below the floor before saying anything. */
export const MIN_LOW_DAYS = 2

export interface UnderEatingProfile {
  startWeightKg: number
  heightCm: number | null
  age: number | null
  sex: Sex
}

export interface UnderEatingResult {
  /** True once enough recent completed days fall below the floor. */
  triggered: boolean
  /** The offending days, oldest first. */
  lowDays: DayRecord[]
  /** The floor applied, in kcal. */
  floor: number
  /**
   * Their resting requirement, when height and age are known and it sits above
   * the floor. Lets the copy say "below even what you burn asleep".
   */
  restingKcal: number | null
}

export function underEating(
  days: readonly DayRecord[],
  profile: UnderEatingProfile,
  today: string
): UnderEatingResult {
  const basal =
    profile.heightCm && profile.age
      ? bmr(profile.startWeightKg, profile.heightCm, profile.age, profile.sex)
      : null

  const recent = days
    .filter((d) => d.date < today) // completed days only
    .slice(-WINDOW_DAYS)

  const lowDays = recent.filter((d) => d.kcal > 0 && d.kcal < MIN_DAILY_KCAL)

  return {
    triggered: lowDays.length >= MIN_LOW_DAYS,
    lowDays,
    floor: MIN_DAILY_KCAL,
    restingKcal: basal !== null && basal > MIN_DAILY_KCAL ? basal : null,
  }
}
