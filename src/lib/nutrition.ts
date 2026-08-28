/**
 * Formulas ported from Memey_Diet_Planner_v3.xlsx.
 *
 * Every function notes the workbook cell it came from so the two stay
 * traceable. Behaviour matches the sheet exactly unless a comment says
 * otherwise and explains why.
 */
import type { ActivityLevel, Macros, Sex, Targets } from './types'

export const EMPTY_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 }

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // Dashboard!D8
  moderate: 1.55, // Dashboard!B9
  active: 1.725, // Dashboard!D9
}

/**
 * Mifflin–St Jeor. Dashboard!B8 hardcodes the female constant (−161);
 * we take sex as a parameter so the app works for anyone.
 */
export function bmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex = 'female'
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(base + (sex === 'female' ? -161 : 5))
}

/** Dashboard!D8, B9, D9 */
export function tdee(basalRate: number, level: ActivityLevel): number {
  return Math.round(basalRate * ACTIVITY_FACTORS[level])
}

/** Dashboard!D10 — LBM = weight × (1 − bodyfat%) */
export function leanBodyMass(weightKg: number, bodyFatPct: number): number {
  return round1(weightKg * (1 - bodyFatPct / 100))
}

/** Scale a food's per-serving macros by a serving count. Weekly!E6 (INDEX×D6). */
export function scaleMacros(macros: Macros, servings: number): Macros {
  return {
    kcal: macros.kcal * servings,
    protein: macros.protein * servings,
    carbs: macros.carbs * servings,
    fat: macros.fat * servings,
    fibre: macros.fibre * servings,
  }
}

/** Weekly!E12:I12 — SUM over the day's six meal rows. */
export function sumMacros(items: readonly Macros[]): Macros {
  return items.reduce<Macros>(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      carbs: acc.carbs + m.carbs,
      fat: acc.fat + m.fat,
      fibre: acc.fibre + m.fibre,
    }),
    { ...EMPTY_MACROS }
  )
}

/** Weekly!E14 — (actual − target) / target. Null when nothing is logged. */
export function variance(actual: number, target: number): number | null {
  if (actual === 0 || target === 0) return null
  return (actual - target) / target
}

export type StatusBand = 'empty' | 'under' | 'on_target' | 'close' | 'over'

/**
 * Weekly!J12 / Streak & Badges!G6 — the four-band nested IF, verbatim:
 *   =0            → "—"
 *   < target−400  → "▼ Kurang sangat"
 *   ≤ target      → "✓ Ikut target"
 *   ≤ target+250  → "~ Dekat"
 *   else          → "▲ Lebih"
 */
export function statusBand(kcal: number, targetKcal: number): StatusBand {
  if (kcal === 0) return 'empty'
  if (kcal < targetKcal - 400) return 'under'
  if (kcal <= targetKcal) return 'on_target'
  if (kcal <= targetKcal + 250) return 'close'
  return 'over'
}

export const STATUS_LABELS: Record<StatusBand, { ms: string; en: string; mark: string }> = {
  empty: { ms: 'Belum log', en: 'Not logged', mark: '—' },
  under: { ms: 'Kurang sangat', en: 'Well under', mark: '▼' },
  on_target: { ms: 'Ikut target', en: 'On target', mark: '✓' },
  close: { ms: 'Dekat', en: 'Close', mark: '~' },
  over: { ms: 'Lebih', en: 'Over', mark: '▲' },
}

/**
 * Streak & Badges!B16 counts a day as "on target" when kcal is within
 * [target−400, target] — the same window the ✓ band uses.
 */
export function isOnTarget(kcal: number, targetKcal: number): boolean {
  return kcal >= targetKcal - 400 && kcal <= targetKcal
}

// --- Streaks ---------------------------------------------------------------

export interface DayRecord {
  date: string
  kcal: number
  protein: number
  salmonMeals: number
}

export interface StreakResult {
  /** Days actually logged in the unbroken run — forgiven misses don't count. */
  current: number
  best: number
  /** Whether the run is currently being held together by the grace day. */
  usingGrace: boolean
  graceRemaining: number
}

/**
 * Streak & Badges!F6:F12 chains `=IF(B7>0,F6+1,0)` — a single missed day
 * resets to zero.
 *
 * We deliberately soften that. The gamification literature is consistent that
 * hard-reset streaks burn out and drive abandonment, and evidence for streaks
 * improving *dietary* adherence specifically is weak. One forgiven day per
 * rolling seven keeps the run alive without making the number meaningless.
 */
export function streak(days: readonly DayRecord[], gracesPerWeek = 1): StreakResult {
  let current = 0
  let best = 0
  let usingGrace = false
  /** Indices of missed days we forgave, so the allowance can be windowed. */
  const forgiven: number[] = []

  days.forEach((day, i) => {
    if (day.kcal > 0) {
      current += 1
      usingGrace = false
      best = Math.max(best, current)
      return
    }
    // A grace holds a run together; it can never start one.
    const forgivenThisWeek = forgiven.filter((j) => j > i - 7).length
    if (current > 0 && forgivenThisWeek < gracesPerWeek) {
      forgiven.push(i)
      usingGrace = true
    } else {
      current = 0
      usingGrace = false
    }
  })

  const spentAtEnd = forgiven.filter((j) => j > days.length - 1 - 7).length
  return {
    current,
    best,
    usingGrace,
    graceRemaining: Math.max(0, gracesPerWeek - spentAtEnd),
  }
}

// --- Badges ----------------------------------------------------------------

export interface BadgeContext {
  days: readonly DayRecord[]
  targets: Targets
  startWeightKg: number
  goalWeightKg: number
  latestWeightKg: number | null
  bestStreak: number
}

export interface Badge {
  id: string
  name: { ms: string; en: string }
  requirement: { ms: string; en: string }
  emoji: string
  unlocked: boolean
  /** 0–1, for the progress ring on locked badges. */
  progress: number
}

const ratio = (value: number, goal: number) =>
  goal <= 0 ? 0 : Math.min(1, Math.max(0, value / goal))

/** All nine badges from Streak & Badges!F20:F28, conditions unchanged. */
export function badges(ctx: BadgeContext): Badge[] {
  const { days, targets, startWeightKg, goalWeightKg, latestWeightKg, bestStreak } = ctx
  const logged = days.filter((d) => d.kcal > 0).length
  const onTarget = days.filter((d) => isOnTarget(d.kcal, targets.kcal)).length
  const salmon = days.reduce((sum, d) => sum + d.salmonMeals, 0)
  const proteinDays = days.filter((d) => d.protein >= targets.protein).length
  const lost = latestWeightKg === null ? 0 : startWeightKg - latestWeightKg

  return [
    {
      id: 'first_step',
      name: { ms: 'Langkah Pertama', en: 'First Step' },
      requirement: { ms: 'Log mana-mana satu hari', en: 'Log any single day' },
      emoji: '👣',
      unlocked: logged >= 1,
      progress: ratio(logged, 1),
    },
    {
      id: 'three_in_a_row',
      name: { ms: 'Tiga Hari Lurus', en: 'Three in a Row' },
      requirement: { ms: 'Streak 3 hari berturut-turut', en: '3-day streak' },
      emoji: '🔥',
      unlocked: bestStreak >= 3,
      progress: ratio(bestStreak, 3),
    },
    {
      id: 'full_week',
      name: { ms: 'Seminggu Penuh', en: 'Full Week' },
      requirement: { ms: 'Log semua 7 hari', en: 'Log all 7 days' },
      emoji: '📅',
      unlocked: logged >= 7,
      progress: ratio(logged, 7),
    },
    {
      id: 'omega_squad',
      name: { ms: 'Omega Squad', en: 'Omega Squad' },
      requirement: { ms: '3 hidangan salmon seminggu', en: '3 salmon meals in a week' },
      emoji: '🐟',
      unlocked: salmon >= 3,
      progress: ratio(salmon, 3),
    },
    {
      id: 'protein_power',
      name: { ms: 'Protein Power', en: 'Protein Power' },
      requirement: { ms: '4 hari capai target protein', en: '4 days hitting protein' },
      emoji: '💪',
      unlocked: proteinDays >= 4,
      progress: ratio(proteinDays, 4),
    },
    {
      id: 'disiplin',
      name: { ms: 'Disiplin', en: 'Discipline' },
      requirement: { ms: '5 hari ikut target kalori', en: '5 days on calorie target' },
      emoji: '🎯',
      unlocked: onTarget >= 5,
      progress: ratio(onTarget, 5),
    },
    {
      id: 'down_1kg',
      name: { ms: 'Turun 1 kg', en: 'Down 1 kg' },
      requirement: { ms: 'Berat turun 1 kg dari mula', en: '1 kg down from start' },
      emoji: '⚖️',
      unlocked: lost >= 1,
      progress: ratio(lost, 1),
    },
    {
      id: 'down_3kg',
      name: { ms: 'Turun 3 kg', en: 'Down 3 kg' },
      requirement: { ms: 'Berat turun 3 kg dari mula', en: '3 kg down from start' },
      emoji: '🏅',
      unlocked: lost >= 3,
      progress: ratio(lost, 3),
    },
    {
      id: 'goal_reached',
      name: { ms: 'Sampai Goal', en: 'Goal Reached' },
      requirement: { ms: 'Capai berat sasaran', en: 'Hit your target weight' },
      emoji: '🏆',
      unlocked: latestWeightKg !== null && latestWeightKg <= goalWeightKg,
      progress:
        latestWeightKg === null
          ? 0
          : ratio(startWeightKg - latestWeightKg, startWeightKg - goalWeightKg),
    },
  ]
}

// --- Progress --------------------------------------------------------------

/**
 * Body Composition!D — the sheet leaves the "7-Day Avg" column for manual
 * entry; we compute a trailing mean so the app follows its own advice on the
 * Methodology tab: track the rolling average, not single weigh-ins.
 */
export function rollingAverage(values: readonly number[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1)
    if (slice.length === 0) return null
    return round1(slice.reduce((a, b) => a + b, 0) / slice.length)
  })
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Detect a salmon-containing entry the way Streak & Badges!D6 does: name match. */
export function isSalmon(name: string): boolean {
  return /salmon/i.test(name)
}
