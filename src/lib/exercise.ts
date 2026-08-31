/**
 * What exercise actually buys back.
 *
 * The formula every fitness app quotes is `kcal = MET × weightKg × hours`, and
 * it over-counts, because a MET is *total* energy expenditure — it includes the
 * resting metabolism you would have had lying on the sofa instead. Your calorie
 * target already contains that resting burn: it is derived from your BMR. Add
 * the gross figure on top and the same energy is counted twice.
 *
 * So this subtracts one MET:
 *
 *     kcal = (MET − 1) × 3.5 × weightKg ÷ 200 × minutes
 *
 * The 3.5 is the resting oxygen uptake in ml/kg/min that defines one MET, and
 * dividing by 200 converts millilitres of oxygen to kilocalories (about
 * 5 kcal per litre). The correction is small for running and close to 40% for
 * yoga, walking and housework — which is exactly where an inflated number would
 * do the most damage, because those are the activities people do for an hour.
 *
 * None of this is a measurement. Compendium values (Ainsworth et al., 2011) are
 * population means taken mostly from young lean adults, and individuals sit
 * 20-30% either side of them. Every screen that shows one of these numbers says
 * so.
 */
import { EXERCISES } from './catalogue'
import type { ActivityLog, Exercise } from './types'

/** One MET: what the body spends doing nothing, already inside the target. */
export const REST_MET = 1

/** Millilitres of oxygen per kg per minute at rest — the definition of a MET. */
const ML_O2_PER_KG_MIN = 3.5
/** ml of oxygen to kcal: about 5 kcal per litre, so 1000 / 5 = 200. */
const ML_O2_PER_KCAL = 200

/**
 * The part of an activity's cost that is not just being alive.
 *
 * Floored at zero: a 0.9-MET activity does not refund calories, and the
 * catalogue has nothing below 1 anyway.
 */
export function netMet(met: number): number {
  return Math.max(0, met - REST_MET)
}

/**
 * Calories burned above resting, rounded to whole kcal.
 *
 * Returns 0 for a 1-MET activity, which is the proof that the resting
 * correction is applied rather than merely described in a comment.
 */
export function burnFor(met: number, weightKg: number, minutes: number): number {
  if (!(weightKg > 0) || !(minutes > 0)) return 0
  const kcal = (netMet(met) * ML_O2_PER_KG_MIN * weightKg * minutes) / ML_O2_PER_KCAL
  return Math.round(kcal)
}

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id)
}

/**
 * The one body the whole app quotes — latest weigh-in, falling back to the
 * start weight. Same rule as `maintenanceFor` in `nutrition.ts`.
 */
export function bodyWeightFor(startWeightKg: number, latestWeightKg?: number | null): number {
  return latestWeightKg && latestWeightKg > 0 ? latestWeightKg : startWeightKg
}

/** Total burned across a set of activities. */
export function totalBurn(activities: readonly ActivityLog[]): number {
  return activities.reduce((sum, a) => sum + a.kcal, 0)
}

/**
 * Whether a bout is mental rather than physical work.
 *
 * The picker warns once, next to these, that mental fatigue is not the same as
 * running out of fuel — three hours of revision costs about 150 kcal and feels
 * like far more.
 */
export const MENTAL_CATEGORY = 'MIND & DESK'

export function isMentalWork(exercise: Pick<Exercise, 'category'>): boolean {
  return exercise.category === MENTAL_CATEGORY
}

/** Duration chips offered before anyone has to type a number. */
export const MINUTE_PRESETS = [15, 30, 45, 60] as const
export const DEFAULT_MINUTES = 30
/** A day of it, capped so a typo cannot claim a marathon. */
export const MAX_MINUTES = 600
export const MIN_MINUTES = 1

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_MINUTES
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(minutes)))
}
