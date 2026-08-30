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
  /** What the scale says your daily deficit has been. */
  impliedDeficitKcal: number | null
  /** What the diary says it should have been. */
  loggedDeficitKcal: number | null
  /** implied - logged. Negative is the ordinary under-reporting direction. */
  gapKcal: number | null
  reading: TrendReading | null
  etaWeeks: number | null
  etaDate: string | null
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

const EMPTY: Omit<Trend, 'ready' | 'needs' | 'weeks' | 'loggedDays'> = {
  ratePerWeekKg: null,
  avgIntakeKcal: null,
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

  // Gates, checked in the order that makes the advice most useful: tell someone
  // the one thing that would unlock this, not the whole list of what is missing.
  const notReady = (needs: string): Trend => ({
    ready: false,
    needs,
    weeks,
    loggedDays: logged.length,
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
  const balance = energyBalance({ ...profile, startWeightKg: latest }, avgIntakeKcal)
  const maintenanceKcal = balance.tdee

  const impliedDeficitKcal = Math.round((rate * KCAL_PER_KG_FAT) / 7)
  const loggedDeficitKcal = maintenanceKcal === null ? null : maintenanceKcal - avgIntakeKcal
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
    impliedDeficitKcal,
    loggedDeficitKcal,
    gapKcal,
    reading,
    etaWeeks,
    etaDate: etaWeeks === null ? null : addDays(today, etaWeeks * 7),
  }
}
