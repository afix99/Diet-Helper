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

/* --- dismissing it -------------------------------------------------------- */

/**
 * What was true when the warning was closed.
 *
 * Stored rather than a bare boolean, because "I have read this" is not the same
 * as "this no longer applies". Keeping the target and the last low day lets the
 * warning stay quiet about a situation you have already decided on, and still
 * speak up about a genuinely new one.
 */
export interface UnderEatingDismissal {
  /** ISO date it was closed. */
  at: string
  /** The calorie target at that moment. */
  targetKcal: number
  /** The most recent low day they had already seen. */
  throughDate: string
}

/**
 * Consecutive logged days at or above the floor that must pass before a new low
 * day counts as new news rather than as the same stretch continuing.
 */
export const RESURFACE_GAP_DAYS = 3

/**
 * Whether the warning should be on screen.
 *
 * The rule the user chose: closing it hides it for good *unless the situation
 * changes*. Two things count as change, and nothing else does.
 *
 * 1. **The target goes lower.** Dropping the target after reading the warning
 *    is a new decision about a number the warning is about, so the warning gets
 *    to speak once more. Raising it never re-triggers anything.
 * 2. **Low days start again after a real break.** A dip, then a few normal
 *    days, then another dip is a different pattern from one long stretch —
 *    and only the second one is news. `RESURFACE_GAP_DAYS` is what "a real
 *    break" means, measured in logged days, so a week of not logging at all
 *    cannot manufacture a break.
 *
 * Deliberately *not* time-based. A warning that returns every Monday because a
 * timer expired is exactly the nagging this was asked to stop.
 */
export function underEatingVisible(
  check: UnderEatingResult,
  dismissal: UnderEatingDismissal | null,
  targetKcal: number,
  /** The same window the check ran over, for spotting the break. */
  days: readonly DayRecord[]
): boolean {
  if (!check.triggered) return false
  if (!dismissal) return true

  // 1. They went lower.
  if (targetKcal < dismissal.targetKcal) return true

  // 2. A new low day, with a clear run of normal logged days before it.
  const fresh = check.lowDays.filter((d) => d.date > dismissal.throughDate)
  if (fresh.length === 0) return false

  const logged = days.filter((d) => d.kcal > 0)
  for (const low of fresh) {
    const between = logged.filter((d) => d.date > dismissal.throughDate && d.date < low.date)
    const normal = between.filter((d) => netIntake(d) >= check.floor)
    if (normal.length >= RESURFACE_GAP_DAYS && normal.length === between.length) return true
  }
  return false
}

/** What to store when the user closes it. */
export function dismissalFor(
  check: UnderEatingResult,
  targetKcal: number,
  today: string
): UnderEatingDismissal {
  const last = check.lowDays[check.lowDays.length - 1]
  return { at: today, targetKcal, throughDate: last ? last.date : today }
}

/**
 * Whether the small "your target is under what you burn at rest" line shows.
 *
 * Shares the card's dismissal on purpose. They are two views of one subject,
 * and closing one only to have the other keep saying it would read as the app
 * ignoring you. Lowering the target brings it back, for the same reason it
 * brings the card back.
 */
export function targetWarningVisible(
  belowResting: boolean,
  dismissal: UnderEatingDismissal | null,
  targetKcal: number
): boolean {
  if (!belowResting) return false
  if (!dismissal) return true
  return targetKcal < dismissal.targetKcal
}
