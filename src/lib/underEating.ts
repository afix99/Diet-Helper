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
 * - **Exercise is subtracted.** Eating 1,300 and burning 700 leaves 600, and
 *   that is precisely the case this check exists for. Comparing the gross
 *   figure against the floor would have stayed quiet through exactly the days
 *   that matter most.
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

/**
 * What a day actually left the body, once logged activity is taken off.
 *
 * Can go negative, and is allowed to: a day that nets below zero is a real
 * thing a diary can contain and rounding it up to zero would hide it.
 */
export function netIntake(day: Pick<DayRecord, 'kcal' | 'burned'>): number {
  return day.kcal - day.burned
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
  /** True when exercise is part of why these days came in low. */
  exerciseCounted: boolean
}

export function underEating(
  days: readonly DayRecord[],
  profile: UnderEatingProfile,
  today: string,
  /** Latest weigh-in, so the resting figure tracks the body you have now. */
  latestWeightKg?: number | null
): UnderEatingResult {
  const weight =
    latestWeightKg && latestWeightKg > 0 ? latestWeightKg : profile.startWeightKg
  const basal =
    profile.heightCm && profile.age
      ? bmr(weight, profile.heightCm, profile.age, profile.sex)
      : null

  const recent = days
    .filter((d) => d.date < today) // completed days only
    .slice(-WINDOW_DAYS)

  // `kcal > 0` still gates on something having been logged; the comparison
  // itself is against what was left after training.
  const lowDays = recent.filter((d) => d.kcal > 0 && netIntake(d) < MIN_DAILY_KCAL)

  return {
    triggered: lowDays.length >= MIN_LOW_DAYS,
    lowDays,
    floor: MIN_DAILY_KCAL,
    restingKcal: basal !== null && basal > MIN_DAILY_KCAL ? basal : null,
    exerciseCounted: lowDays.some((d) => d.burned > 0),
  }
}
