/**
 * What her body actually seems to burn, rather than what a formula predicts.
 *
 * Every calorie figure in this app currently descends from Mifflin–St Jeor
 * times a fixed activity multiplier. That estimate is doing a lot of work — it
 * sets the burned line on the chart, decides whether a big day was a surplus in
 * `macroFate.ts`, and anchors the target suggestion — and for most people it is
 * wrong by a few hundred calories in one direction or the other, because a
 * 1990 regression on a few hundred strangers cannot know about *this* body.
 *
 * The diary already contains the answer. Over a long enough window, energy
 * balance is not a theory:
 *
 *     expenditure = intake − (energy that left the body)
 *
 * and the scale measures the second term. So this reads the same numbers
 * `trends.ts` already computes and asks the inverse question: not "does the
 * scale agree with the formula" but "what would the formula have to say for the
 * scale and the diary to agree". That falls out of the gap `trends` already
 * reports, which is why this module is arithmetic rather than a second engine:
 *
 *     observed = maintenance + gap
 *
 * ---
 *
 * **The dangerous direction, and the reason most of this file is caution.**
 *
 * Under-reported intake biases this downward, one calorie for one calorie. Log
 * 1,500 when you ate 2,000 and this returns a number 500 too low. Under-reporting
 * of 20–30% is the norm in the literature — among careful people, not careless
 * ones — so the *expected* error here points at telling someone their body burns
 * less than it does. In an app that carries an under-eating warning, a number
 * that quietly argues for eating less would be the most harmful thing in it.
 *
 * Four defences, and none of them is optional:
 *
 * 1. **A completeness gate.** `trends` will happily run on eight logged days
 *    inside a three-month window; this will not. Below `MIN_COMPLETENESS` of
 *    the days in the measured window carrying an intake, it refuses and says
 *    what is missing. Missing days are not neutral — they are meals that
 *    happened and were not counted.
 * 2. **A band, not a point**, widened by the actual standard error of the
 *    weight slope, so a noisy scale produces a visibly vaguer answer.
 * 3. **Copy that leads with measurement.** Below the formula, the first
 *    explanation offered is unlogged food, never a slow metabolism.
 * 4. **It changes no target and raises no warning.** This module is read-only
 *    advice about what the app *reports*; `targets.ts` never imports it.
 */

import type { Trend } from './trends'

/**
 * How much of the window has to be logged.
 *
 * Eighty per cent is roughly six days in seven — a diary with a couple of
 * ordinary gaps, not one kept only on good weeks. Below that, the average
 * intake is not an average of what was eaten, and everything derived from it
 * inherits the hole.
 */
export const MIN_COMPLETENESS = 0.8

/**
 * The narrowest band worth quoting, in kcal/day.
 *
 * Even with a perfectly measured slope, 7,700 kcal/kg is an approximation, body
 * composition shifts change what a kilogram is worth, and the diary carries its
 * own error. A band tighter than this would be false precision no matter how
 * many times she stood on the scale.
 */
export const MIN_BAND_KCAL = 60

/** kcal/day by which observed and formula may differ before it is worth saying. */
export const AGREEMENT_KCAL = 100

const KCAL_PER_KG_FAT = 7700

export type BurnReading = 'above_formula' | 'below_formula' | 'agrees'

export interface BurnRate {
  ready: boolean
  /** What is still missing, when not ready. Null once ready. */
  needs: string | null
  /** Best estimate of daily burn excluding logged exercise, matching `maintenanceFor`. */
  observedKcal: number | null
  /** The honest band around it. */
  lowKcal: number | null
  highKcal: number | null
  /** What Mifflin–St Jeor predicted, for comparison. */
  formulaKcal: number | null
  /** observed − formula. Positive means her body burns more than the formula thought. */
  differenceKcal: number | null
  reading: BurnReading | null
  /** Share of days in the measured window carrying an intake, 0–1. */
  completeness: number
  /** Days the estimate is measured over. */
  spanDays: number
}

const NOT_READY = {
  ready: false as const,
  observedKcal: null,
  lowKcal: null,
  highKcal: null,
  formulaKcal: null,
  differenceKcal: null,
  reading: null,
}

/**
 * Read an observed daily burn out of a computed trend.
 *
 * Takes the `Trend` rather than the raw diary on purpose: every gate `trends`
 * applies — three weigh-ins, a fortnight of span, enough logged days — is a
 * gate this needs too, and duplicating them here would be a second set to keep
 * in sync with the first.
 */
export function burnRate(trend: Trend): BurnRate {
  const completeness =
    trend.spanDays > 0 ? Math.min(1, trend.loggedDaysInSpan / (trend.spanDays + 1)) : 0

  const base = { completeness, spanDays: trend.spanDays }

  // Whatever `trends` is still waiting for, this is waiting for it too, and it
  // has already written the better sentence about it.
  if (!trend.ready) return { ...NOT_READY, ...base, needs: trend.needs }

  if (trend.maintenanceKcal === null || trend.gapKcal === null) {
    return {
      ...NOT_READY,
      ...base,
      needs: 'Your height and age, in Settings. Without them there is no formula to correct.',
    }
  }

  if (completeness < MIN_COMPLETENESS) {
    const missing = trend.spanDays + 1 - trend.loggedDaysInSpan
    return {
      ...NOT_READY,
      ...base,
      needs: `${missing} ${missing === 1 ? 'day' : 'days'} in this stretch have nothing logged. Unlogged food would make this read low, so it waits for a fuller fortnight rather than guessing.`,
    }
  }

  const observedKcal = Math.round(trend.maintenanceKcal + trend.gapKcal)

  /*
   * The band comes from the slope's own standard error, converted to kcal/day
   * at the same 7,700 kcal/kg this whole estimate rests on. More weigh-ins
   * genuinely narrow it, which is the honest incentive: the way to a sharper
   * answer is more data, not more confidence.
   */
  const slopeBand =
    trend.rateStdErrPerWeekKg === null
      ? 0
      : Math.abs((trend.rateStdErrPerWeekKg / 7) * KCAL_PER_KG_FAT)
  const band = Math.max(MIN_BAND_KCAL, Math.round(slopeBand))

  const differenceKcal = observedKcal - trend.maintenanceKcal
  const reading: BurnReading =
    Math.abs(differenceKcal) <= AGREEMENT_KCAL
      ? 'agrees'
      : differenceKcal > 0
        ? 'above_formula'
        : 'below_formula'

  return {
    ...base,
    ready: true,
    needs: null,
    observedKcal,
    lowKcal: observedKcal - band,
    highKcal: observedKcal + band,
    formulaKcal: trend.maintenanceKcal,
    differenceKcal,
    reading,
  }
}

/**
 * The sentence under the number.
 *
 * Split out from the component so the wording is testable — this is the copy
 * that decides whether the feature is honest or quietly coercive, and it should
 * not be reachable only by rendering React.
 *
 * The `below_formula` case is the one that matters. Measurement error explains
 * that direction before physiology does, and it says so first.
 */
export function burnRateCopy(rate: BurnRate): string {
  if (!rate.ready || rate.differenceKcal === null) return ''
  const by = Math.abs(rate.differenceKcal)

  if (rate.reading === 'agrees') {
    return 'That is within a hundred calories of what the formula assumed, so the numbers this app shows you were already about right.'
  }
  if (rate.reading === 'above_formula') {
    return `That is about ${by} a day more than the formula assumed. Your body is doing more than the estimate gave it credit for, and the burned line on the chart has been reading low.`
  }
  return `That is about ${by} a day less than the formula assumed — but read that carefully. The likeliest cause is food that went unlogged rather than a slow metabolism: anything eaten and not written down lands here as a lower burn, calorie for calorie. It is not a reason to eat less.`
}
