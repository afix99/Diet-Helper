/**
 * Formulas ported from Memey_Diet_Planner_v3.xlsx.
 *
 * Every function notes the workbook cell it came from so the two stay
 * traceable. Behaviour matches the sheet exactly unless a comment says
 * otherwise and explains why.
 */
import type { ActivityLevel, Macros, Sex, Targets } from './types'

export const EMPTY_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 }

/**
 * The floor below which a day's intake stops being a diet and starts being a
 * problem. Widely cited as the lowest an adult should sustain without
 * supervision; the app uses it in two places and they must not drift apart —
 * as the lowest calorie target the starter guide will ever suggest, and as the
 * threshold for warning that logged intake has been too low.
 *
 * It is a rule of thumb, not a clinical boundary, which is why the warning it
 * drives suggests a professional rather than pretending to be one.
 */
export const MIN_DAILY_KCAL = 1200

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

/**
 * Maintenance calories for the body you have *now*.
 *
 * Four call sites used to compute this independently, and two of them used the
 * starting weight — so once you had lost a few kilos the app quoted one TDEE on
 * Settings and a different one on Today. Weight is the only input that moves,
 * so it is the only one worth being careful about: a real weigh-in wins, and
 * the start weight is the fallback for someone who has not stepped on a scale.
 *
 * Null when height or age is missing, because Mifflin-St Jeor needs both and
 * guessing them would be worse than saying so.
 */
export function maintenanceFor(
  profile: {
    startWeightKg: number
    heightCm: number | null
    age: number | null
    sex: Sex
    activityLevel: ActivityLevel
  },
  latestWeightKg?: number | null
): number | null {
  if (!profile.heightCm || !profile.age) return null
  const weight =
    latestWeightKg && latestWeightKg > 0 ? latestWeightKg : profile.startWeightKg
  return tdee(bmr(weight, profile.heightCm, profile.age, profile.sex), profile.activityLevel)
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

export const STATUS_LABELS: Record<
  StatusBand,
  { label: string; icon: 'dash' | 'arrowDown' | 'check' | 'tilde' | 'arrowUp' }
> = {
  empty: { label: 'Not logged', icon: 'dash' },
  under: { label: 'Well under', icon: 'arrowDown' },
  on_target: { label: 'On target', icon: 'check' },
  close: { label: 'Close', icon: 'tilde' },
  over: { label: 'Over', icon: 'arrowUp' },
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
  /** Carried so the macro chart can plot a week of them, not just today. */
  carbs: number
  fat: number
  fibre: number
  /**
   * Calories burned above rest by logged activity. Zero when nothing was
   * logged, which is also the honest reading: unlogged exercise is not
   * evidence of exercise.
   */
  burned: number
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
  /*
   * The fields below look at the whole diary rather than the current week, and
   * are optional so a caller that only has this week's records still compiles.
   * `badgesFor` works them all out in one pass over the entries.
   */
  /** Distinct catalogue foods logged, ever. */
  foodsTried?: number
  /** Distinct food categories logged, ever. */
  categoriesTried?: number
  /** Recipes logged, ever. */
  recipesCooked?: number
  /** Days the water target was met. */
  hydratedDays?: number
  /**
   * Whether a gap of several days was ever followed by logging again.
   *
   * The one badge here for something that looks like failure. All-or-nothing
   * collapse after a missed week is the single most common way a food diary
   * dies, so coming back is worth marking more than a perfect run is.
   */
  returned?: boolean
}

export interface Badge {
  /** Also the artwork filename: public/badges/<id>.png */
  id: string
  name: string
  requirement: string
  unlocked: boolean
  /** 0–1, for the progress ring on locked badges. */
  progress: number
}

const ratio = (value: number, goal: number) =>
  goal <= 0 ? 0 : Math.min(1, Math.max(0, value / goal))

/**
 * The most days matching `hit` inside any `window`-day span of the diary.
 *
 * The week badges used to count the *current calendar week*, which meant they
 * un-earned themselves every Monday: on a Monday morning with nothing logged
 * yet, `weekOf(today)` yields a single day, so First Step read as locked to
 * someone on a nineteen-day streak. A trophy case that empties weekly is worse
 * than no trophy case. These look for the best week you have ever had, so a
 * badge once earned stays earned.
 *
 * `days` must be contiguous dates, which is what `dayRecords` over a date range
 * produces.
 */
function bestWindow(
  days: readonly DayRecord[],
  hit: (d: DayRecord) => number,
  window = 7
): number {
  let best = 0
  let sum = 0
  for (let i = 0; i < days.length; i += 1) {
    sum += hit(days[i])
    if (i >= window) sum -= hit(days[i - window])
    if (sum > best) best = sum
  }
  return best
}

/**
 * The trophy case.
 *
 * The nine from Streak & Badges!F20:F28 keep their original conditions; the
 * rest were added later and follow one rule — a badge may reward logging,
 * consistency, variety, adequacy or coming back, and never eating less. There
 * is deliberately nothing here for the smallest day or the longest gap between
 * meals.
 */
export function badges(ctx: BadgeContext): Badge[] {
  const {
    days,
    targets,
    startWeightKg,
    goalWeightKg,
    latestWeightKg,
    bestStreak,
    foodsTried = 0,
    categoriesTried = 0,
    recipesCooked = 0,
    hydratedDays = 0,
    returned = false,
  } = ctx
  // Ever, for the milestones.
  const logged = days.filter((d) => d.kcal > 0).length
  // Best week ever, for the ones that describe a week.
  const loggedWeek = bestWindow(days, (d) => (d.kcal > 0 ? 1 : 0))
  const onTarget = bestWindow(days, (d) => (isOnTarget(d.kcal, targets.kcal) ? 1 : 0))
  const salmon = bestWindow(days, (d) => d.salmonMeals)
  const proteinDays = bestWindow(days, (d) => (d.protein >= targets.protein ? 1 : 0))
  const fibreDays = bestWindow(days, (d) => (d.kcal > 0 && d.fibre >= targets.fibre ? 1 : 0))
  const lost = latestWeightKg === null ? 0 : startWeightKg - latestWeightKg

  return [
    {
      id: 'first_step',
      name: 'First Step',
      requirement: 'Log any single day',
      unlocked: logged >= 1,
      progress: ratio(logged, 1),
    },
    {
      id: 'three_in_a_row',
      name: 'Three in a Row',
      requirement: 'Hit a 3-day streak',
      unlocked: bestStreak >= 3,
      progress: ratio(bestStreak, 3),
    },
    {
      id: 'full_week',
      name: 'Full Week',
      requirement: 'Log 7 days in one week',
      unlocked: loggedWeek >= 7,
      progress: ratio(loggedWeek, 7),
    },
    {
      id: 'two_weeks',
      name: 'Two Weeks',
      requirement: 'Hit a 14-day streak',
      unlocked: bestStreak >= 14,
      progress: ratio(bestStreak, 14),
    },
    {
      id: 'thirty_days',
      name: 'Thirty Days',
      requirement: 'Log 30 days in total',
      unlocked: logged >= 30,
      progress: ratio(logged, 30),
    },
    {
      id: 'comeback',
      name: 'Comeback',
      requirement: 'Log again after a few days off',
      unlocked: returned,
      progress: returned ? 1 : 0,
    },
    {
      id: 'omega_squad',
      name: 'Omega Squad',
      requirement: '3 salmon meals in a week',
      unlocked: salmon >= 3,
      progress: ratio(salmon, 3),
    },
    {
      id: 'protein_power',
      name: 'Protein Power',
      requirement: '4 days hitting your protein target',
      unlocked: proteinDays >= 4,
      progress: ratio(proteinDays, 4),
    },
    {
      id: 'fibre_friend',
      name: 'Fibre Friend',
      requirement: '4 days hitting your fibre target',
      unlocked: fibreDays >= 4,
      progress: ratio(fibreDays, 4),
    },
    {
      id: 'hydrated',
      name: 'Hydrated',
      requirement: 'Hit your water target 5 times',
      unlocked: hydratedDays >= 5,
      progress: ratio(hydratedDays, 5),
    },
    {
      id: 'disiplin',
      name: 'Discipline',
      requirement: '5 days on your calorie target',
      unlocked: onTarget >= 5,
      progress: ratio(onTarget, 5),
    },
    {
      id: 'explorer',
      name: 'Explorer',
      requirement: 'Try 25 different foods',
      unlocked: foodsTried >= 25,
      progress: ratio(foodsTried, 25),
    },
    {
      id: 'well_rounded',
      name: 'Well Rounded',
      requirement: 'Eat from 10 food groups',
      unlocked: categoriesTried >= 10,
      progress: ratio(categoriesTried, 10),
    },
    {
      id: 'home_cook',
      name: 'Home Cook',
      requirement: 'Cook 5 recipes',
      unlocked: recipesCooked >= 5,
      progress: ratio(recipesCooked, 5),
    },
    {
      id: 'down_1kg',
      name: 'Down 1 kg',
      requirement: '1 kg below your starting weight',
      unlocked: lost >= 1,
      progress: ratio(lost, 1),
    },
    {
      id: 'down_3kg',
      name: 'Down 3 kg',
      requirement: '3 kg below your starting weight',
      unlocked: lost >= 3,
      progress: ratio(lost, 3),
    },
    {
      id: 'down_5kg',
      name: 'Down 5 kg',
      requirement: '5 kg below your starting weight',
      unlocked: lost >= 5,
      progress: ratio(lost, 5),
    },
    {
      id: 'goal_reached',
      name: 'Goal Reached',
      requirement: 'Reach your target weight',
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

/**
 * How a food's calories are divided between protein, carbohydrate and fat.
 *
 * For the composition bar on the Foods list. Two decisions make it honest
 * rather than decorative:
 *
 * - **Energy share, not gram share.** A gram of fat carries nine calories
 *   against four for the other two, so a bar drawn on grams would show a
 *   spoonful of oil as a sliver and make every fatty food look lean. The whole
 *   point of the bar is "where did these calories come from".
 * - **Fibre is not a fourth slice.** It is already inside the carbohydrate
 *   figure, so giving it its own segment would count it twice and shrink
 *   everything else to make room. It keeps its number on the row; it does not
 *   get a share of the bar.
 *
 * Returns fractions summing to 1, or all zeroes for a food with no macros at
 * all — the caller draws nothing rather than dividing by zero.
 */
export function macroSplit(food: {
  protein: number
  carbs: number
  fat: number
}): { protein: number; carbs: number; fat: number } {
  const p = Math.max(0, food.protein) * 4
  const c = Math.max(0, food.carbs) * 4
  const f = Math.max(0, food.fat) * 9
  const total = p + c + f
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 }
  return { protein: p / total, carbs: c / total, fat: f / total }
}
