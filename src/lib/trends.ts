/**
 * Does the eating explain the weight?
 *
 * The app could already say what you ate and what you weigh, but never whether
 * one was producing the other. This puts them on the same axis and reports the
 * one number that matters: at the rate the scale is actually moving, what
 * deficit have you really been running, and how does that compare with the
 * deficit your diary claims.
 *
 * Honesty rules, because this is the part that could easily become an
 * accusation:
 *
 * - **The gap is a calibration figure, not a verdict on the user.** Intake
 *   under-reporting of 20-30% is the norm in the literature, across careful and
 *   careless people alike, and the formula's maintenance estimate is itself only
 *   an estimate. The copy names measurement before behaviour.
 * - **The rate is a least-squares slope**, not first-versus-last, so a single
 *   dehydrated Tuesday cannot swing the whole conclusion.
 * - **Every gate is stated.** Below the evidence threshold this returns what is
 *   missing rather than a confident number built on three data points.
 * - **7700 kcal/kg is an approximation** and is labelled as one wherever the
 *   number derived from it is shown.
 * - **Logged exercise belongs on the expenditure side, not the intake side.**
 *   Once activity is logged, the diary's claimed deficit is
 *   `maintenance + burned − intake`. Leaving the burn out would make the gap
 *   this reports fiction on exactly the weeks someone trained hardest.
 */
import { KCAL_PER_KG_FAT } from './macroFate'
import { round1, type DayRecord } from './nutrition'
import { energyBalance } from './targets'
import { addDays, daysBetween } from './dates'
import type { ActivityLevel, Sex, Targets, WeightLog } from './types'

/** Days between the first and last weigh-in before a slope means anything. */
export const MIN_SPAN_DAYS = 14
/** Two points draw a line through any noise; three is the minimum that argues. */
export const MIN_WEIGH_INS = 3
/** Logged days needed before an average intake is worth quoting. */
export const MIN_LOGGED_DAYS = 8
/** Weeks of history the chart shows at most. */
export const MAX_WEEKS = 12
/** Below this pace a projection is arithmetic on noise. */
export const MIN_RATE_FOR_ETA = 0.15
/** Daily kcal by which diary and scale may differ before it is worth mentioning. */
export const GAP_NOISE_KCAL = 150

export interface TrendProfile {
  startWeightKg: number
  heightCm: number | null
  age: number | null
  sex: Sex
  activityLevel: ActivityLevel
}

export interface TrendInput {
  /** Completed days, oldest first. Planned future days must be excluded. */
  days: readonly DayRecord[]
  weights: readonly WeightLog[]
  targets: Targets
  profile: TrendProfile
  goalWeightKg: number
  today: string
}

export interface TrendWeek {
  /** ISO key of the week's first day. */
  start: string
  /** Mean intake across the week's *logged* days. Null when none were logged. */
  avgKcal: number | null
  daysLogged: number
  /** Mean of the week's weigh-ins. Null when there were none. */
  weightKg: number | null
}

export type TrendReading = 'agrees' | 'slower_than_diary' | 'faster_than_diary' | 'stalled'

export interface Trend {
  ready: boolean
  /** What is still missing, when not ready. Null once ready. */
  needs: string | null
  weeks: TrendWeek[]
  /** Kilograms lost per week. Negative means gaining. */
  ratePerWeekKg: number | null
  avgIntakeKcal: number | null
  /** Days that actually carry an intake, which is what the average is over. */
  loggedDays: number
  maintenanceKcal: number | null
  /** Mean kcal burned per logged day by logged activity. Zero when none was. */
  avgBurnedKcal: number
  /** What the scale says your daily deficit has been. */
  impliedDeficitKcal: number | null
  /** What the diary says it should have been. */
  loggedDeficitKcal: number | null
  /** implied - logged. Negative is the ordinary under-reporting direction. */
  gapKcal: number | null
  reading: TrendReading | null
  etaWeeks: number | null
  etaDate: string | null
  /** Days from the first weigh-in to the last — the window the slope is measured over. */
  spanDays: number
  /**
   * Logged days *inside* that window, which is a different question from
   * `loggedDays`: a diary can be complete for a fortnight and empty for the two
   * months of weigh-ins around it. Anything reasoning about how much of the
   * eating the app actually saw has to use this one.
   */
  loggedDaysInSpan: number
  /**
   * Standard error of the weight slope, in kg/week. Null below three readings.
   * This is how an estimate built on the slope can widen its own error bars
   * when the scale is noisy and narrow them when it is not.
   */
  rateStdErrPerWeekKg: number | null
}

const mean = (ns: readonly number[]) =>
  ns.length === 0 ? 0 : ns.reduce((a, b) => a + b, 0) / ns.length

/**
 * Kilograms lost per week, as the least-squares slope of weight against date.
 *
 * First-versus-last was the old approach and it gives the two endpoints all the
 * authority: one weigh-in taken dehydrated, or the morning after a salty meal,
 * moves the answer by several tenths. A regression lets every reading vote.
 *
 * Positive means losing. Null below two readings, or when they share a date.
 */
export function ratePerWeek(weights: readonly WeightLog[]): number | null {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 2) return null

  const origin = sorted[0].date
  const xs = sorted.map((w) => daysBetween(origin, w.date))
  const ys = sorted.map((w) => w.weightKg)
  const mx = mean(xs)
  const my = mean(ys)

  let sxy = 0
  let sxx = 0
  for (let i = 0; i < xs.length; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) ** 2
  }
  if (sxx === 0) return null

  // Slope is kg per day and negative while losing; report the friendly sense.
  return round1(-(sxy / sxx) * 7 * 100) / 100
}

/**
 * How much the slope could be wrong, in kg/week.
 *
 * The rate is a regression, so it comes with an honest uncertainty, and any
 * calorie figure derived from it inherits that uncertainty. Quoting a single
 * number from four noisy weigh-ins and the same number from forty would be
 * claiming a precision the data does not have; this is what lets the estimate
 * built on top say "about 2,000" when the readings are sparse and "2,010 to
 * 2,060" when they are not.
 *
 * Residual standard error of the slope: sqrt(SSE / (n-2) / Sxx). Null below
 * three readings, because two points fit a line exactly and leave no residual
 * to measure.
 */
export function rateStdErrPerWeek(weights: readonly WeightLog[]): number | null {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length < 3) return null

  const origin = sorted[0].date
  const xs = sorted.map((w) => daysBetween(origin, w.date))
  const ys = sorted.map((w) => w.weightKg)
  const mx = mean(xs)
  const my = mean(ys)

  let sxy = 0
  let sxx = 0
  for (let i = 0; i < xs.length; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my)
    sxx += (xs[i] - mx) ** 2
  }
  if (sxx === 0) return null

  const slope = sxy / sxx
  const intercept = my - slope * mx
  let sse = 0
  for (let i = 0; i < xs.length; i += 1) sse += (ys[i] - (intercept + slope * xs[i])) ** 2

  return Math.sqrt(sse / (xs.length - 2) / sxx) * 7
}

/** Seven-day blocks ending on `today`, oldest first. */
function bucketWeeks(input: TrendInput): TrendWeek[] {
  const { days, weights, today } = input
  const earliest = [...days.map((d) => d.date), ...weights.map((w) => w.date)].sort()[0]
  if (!earliest) return []

  const span = daysBetween(earliest, today) + 1
  const count = Math.min(MAX_WEEKS, Math.max(1, Math.ceil(span / 7)))

  return Array.from({ length: count }, (_, i) => {
    // Blocks are anchored to today, so the rightmost bar is always the current week.
    const start = addDays(today, -7 * (count - i) + 1)
    const end = addDays(start, 6)
    const inWeek = days.filter((d) => d.date >= start && d.date <= end && d.kcal > 0)
    const scale = weights.filter((w) => w.date >= start && w.date <= end)
    return {
      start,
      avgKcal: inWeek.length ? Math.round(mean(inWeek.map((d) => d.kcal))) : null,
      daysLogged: inWeek.length,
      weightKg: scale.length ? round1(mean(scale.map((w) => w.weightKg))) : null,
    }
  })
}

const EMPTY: Omit<
  Trend,
  'ready' | 'needs' | 'weeks' | 'loggedDays' | 'spanDays' | 'loggedDaysInSpan' | 'rateStdErrPerWeekKg'
> = {
  ratePerWeekKg: null,
  avgIntakeKcal: null,
  avgBurnedKcal: 0,
  maintenanceKcal: null,
  impliedDeficitKcal: null,
  loggedDeficitKcal: null,
  gapKcal: null,
  reading: null,
  etaWeeks: null,
  etaDate: null,
}

export function trends(input: TrendInput): Trend {
  const { days, weights, profile, goalWeightKg, today } = input
  const weeks = bucketWeeks(input)
  const logged = days.filter((d) => d.kcal > 0)
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  const span = sorted.length >= 2 ? daysBetween(sorted[0].date, sorted[sorted.length - 1].date) : 0
  const from = sorted.length >= 2 ? sorted[0].date : null
  const to = sorted.length >= 2 ? sorted[sorted.length - 1].date : null
  const loggedDaysInSpan =
    from && to ? logged.filter((d) => d.date >= from && d.date <= to).length : 0
  const rateStdErrPerWeekKg = rateStdErrPerWeek(sorted)

  // Gates, checked in the order that makes the advice most useful: tell someone
  // the one thing that would unlock this, not the whole list of what is missing.
  const notReady = (needs: string): Trend => ({
    ready: false,
    needs,
    weeks,
    loggedDays: logged.length,
    spanDays: span,
    loggedDaysInSpan,
    rateStdErrPerWeekKg,
    ...EMPTY,
  })
  if (sorted.length < MIN_WEIGH_INS) {
    const more = MIN_WEIGH_INS - sorted.length
    return notReady(
      `${more} more ${more === 1 ? 'weigh-in' : 'weigh-ins'}, a week or so apart, and this fills in.`
    )
  }
  if (span < MIN_SPAN_DAYS) {
    return notReady(
      `Your weigh-ins cover ${span} days. Weight moves 1-3% on water alone, so this waits for ${MIN_SPAN_DAYS} before drawing a line through them.`
    )
  }
  if (logged.length < MIN_LOGGED_DAYS) {
    const more = MIN_LOGGED_DAYS - logged.length
    return notReady(
      `${more} more logged ${more === 1 ? 'day' : 'days'}. Comparing intake with the scale needs an intake to compare.`
    )
  }

  const rate = ratePerWeek(sorted)
  if (rate === null) return notReady('Not enough spread in your weigh-ins yet.')

  const avgIntakeKcal = Math.round(mean(logged.map((d) => d.kcal)))
  const latest = sorted[sorted.length - 1].weightKg
  const balance = energyBalance(profile, avgIntakeKcal, latest)
  const maintenanceKcal = balance.tdee

  /*
   * Averaged over the logged days rather than every day in the span, so it sits
   * on the same denominator as the intake it is compared against. A day with no
   * diary contributes to neither.
   */
  const avgBurnedKcal = Math.round(mean(logged.map((d) => d.burned)))

  const impliedDeficitKcal = Math.round((rate * KCAL_PER_KG_FAT) / 7)
  const loggedDeficitKcal =
    maintenanceKcal === null ? null : maintenanceKcal + avgBurnedKcal - avgIntakeKcal
  const gapKcal = loggedDeficitKcal === null ? null : impliedDeficitKcal - loggedDeficitKcal

  let reading: TrendReading | null = null
  if (gapKcal !== null && loggedDeficitKcal !== null) {
    // Flat weight while the diary claims a deficit is its own case: the honest
    // reading is that the formula's maintenance is too high for this body, not
    // that the diary is lying.
    if (rate <= 0.05 && loggedDeficitKcal > GAP_NOISE_KCAL) reading = 'stalled'
    else if (gapKcal < -GAP_NOISE_KCAL) reading = 'slower_than_diary'
    else if (gapKcal > GAP_NOISE_KCAL) reading = 'faster_than_diary'
    else reading = 'agrees'
  }

  const toGo = round1(latest - goalWeightKg)
  const etaWeeks = rate > MIN_RATE_FOR_ETA && toGo > 0 ? Math.ceil(toGo / rate) : null

  return {
    ready: true,
    needs: null,
    weeks,
    ratePerWeekKg: rate,
    avgIntakeKcal,
    loggedDays: logged.length,
    maintenanceKcal,
    avgBurnedKcal,
    impliedDeficitKcal,
    loggedDeficitKcal,
    gapKcal,
    reading,
    etaWeeks,
    etaDate: etaWeeks === null ? null : addDays(today, etaWeeks * 7),
    spanDays: span,
    loggedDaysInSpan,
    rateStdErrPerWeekKg,
  }
}
