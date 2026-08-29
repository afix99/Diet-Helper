/**
 * Starter guide state and the one calculation it makes on the user's behalf.
 *
 * Kept in localStorage rather than AppData for the same reasons as the theme
 * preference: it describes this device's UI, not the person's diet, and it must
 * be readable without waiting on the store to load.
 */
import { MIN_DAILY_KCAL, bmr, tdee } from './nutrition'
import type { ActivityLevel, Sex } from './types'

export const ONBOARDING_KEY = 'memey-onboarding'

/** Deficit the app already quotes in Settings as ~0.3–0.4 kg per week. */
export const SUGGESTED_DEFICIT = 400
/**
 * Guardrails on a number the app puts in front of someone about their own body.
 *
 * TDEE minus a fixed deficit is fine for most profiles and unsafe for small
 * ones: a short, older, sedentary person can calculate out near 800 kcal, which
 * no one should be nudged toward by a default. The floor wins over the
 * arithmetic, always, and the deficit itself is capped so the suggestion can
 * never drift further from maintenance than this.
 */
export const MIN_SUGGESTED_KCAL = MIN_DAILY_KCAL
export const MAX_DEFICIT = 500

export interface SuggestInput {
  startWeightKg: number
  heightCm: number | null
  age: number | null
  sex: Sex
  activityLevel: ActivityLevel
}

/**
 * A starting calorie target, or null when there isn't enough to compute one.
 *
 * Null rather than a guess: without height and age there is no BMR, and an
 * invented number here would look just as authoritative as a real one.
 */
export function suggestedCalories(p: SuggestInput): number | null {
  if (!p.heightCm || !p.age || p.heightCm <= 0 || p.age <= 0) return null
  const maintenance = tdee(bmr(p.startWeightKg, p.heightCm, p.age, p.sex), p.activityLevel)
  const deficit = Math.min(SUGGESTED_DEFICIT, MAX_DEFICIT)
  return Math.max(MIN_SUGGESTED_KCAL, Math.round(maintenance - deficit))
}

export function hasSeenGuide(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) === 'done'
  } catch {
    // Blocked site data throws. Treat it as seen: repeatedly ambushing someone
    // with an intro they cannot dismiss is worse than never showing it.
    return true
  }
}

export function markGuideSeen(): void {
  try {
    window.localStorage.setItem(ONBOARDING_KEY, 'done')
  } catch {
    // Nothing to do — it reappears next launch, which is the harmless direction.
  }
}

export function clearGuideSeen(): void {
  try {
    window.localStorage.removeItem(ONBOARDING_KEY)
  } catch {
    // Ignored; the caller opens the guide directly rather than relying on this.
  }
}
