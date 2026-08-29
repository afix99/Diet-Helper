/**
 * Deriving daily macro targets from a calorie goal.
 *
 * The order is protein, then fat, then carbs — not a percentage split. Protein
 * need tracks body mass rather than how much you happen to be eating, so
 * doubling your calories should not double your protein: it should mostly add
 * carbs and fat. Carbs are computed last from whatever calories remain, which
 * makes the totals reconcile by construction rather than by luck.
 *
 * Rules and their sources:
 * - Protein 1.4–2.0 g/kg of goal weight (the workbook says 1.4–1.6; ISSN puts
 *   1.4–2.0 as sufficient for exercising adults).
 * - Fat 25–30% of calories, never below the workbook's 0.8 g/kg floor.
 * - Fibre 14 g per 1000 kcal (the Adequate Intake figure).
 * - Water 35 ml/kg, the mid-point of the usual 30–40 ml/kg guidance.
 */
import type { ActivityLevel, Sex, Targets } from './types'
import { bmr, tdee } from './nutrition'

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const

export type TargetKey = keyof Targets
export type TargetLocks = Partial<Record<TargetKey, boolean>>

export type PresetId = 'balanced' | 'high_protein' | 'lower_carb'

interface Preset {
  id: PresetId
  label: string
  /** Grams of protein per kg of goal body weight. */
  proteinPerKg: number
  /** Share of total calories from fat. */
  fatShare: number
  description: string
}

export const PRESETS: Preset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    proteinPerKg: 1.6,
    fatShare: 0.28,
    description: 'The workbook default: enough protein to hold muscle, carbs for training.',
  },
  {
    id: 'high_protein',
    label: 'Protein',
    proteinPerKg: 2.0,
    fatShare: 0.25,
    description: 'More protein per kg. Most filling, and the most expensive to eat.',
  },
  {
    id: 'lower_carb',
    label: 'Low carb',
    proteinPerKg: 1.8,
    fatShare: 0.4,
    description: 'Fat takes the space carbs leave. Harder around rice-heavy meals.',
  },
]

export const DEFAULT_PRESET: PresetId = 'balanced'

/** The workbook's own minimum: below this, hormone production suffers. */
const FAT_FLOOR_PER_KG = 0.8
/** Below roughly this, protein stops protecting lean mass in a deficit. */
const PROTEIN_FLOOR_PER_KG = 1.0
const FIBRE_PER_1000_KCAL = 14
const WATER_ML_PER_KG = 35

const round = (n: number) => Math.max(0, Math.round(n))

export interface DistributeInput {
  kcal: number
  /** Protein and fat scale off goal weight — the workbook's own convention. */
  goalWeightKg: number
  /**
   * Actual current weight, used only for hydration: you have to hydrate the
   * body you have, not the one you are heading towards. Falls back to goal
   * weight when not supplied.
   */
  bodyWeightKg?: number
  preset?: PresetId
  /** Keys the user has set by hand; these pass through untouched. */
  locks?: TargetLocks
  /** Existing targets, used for any locked key. */
  current: Targets
}

/**
 * Recompute every unlocked target from the calorie goal and body weight.
 */
export function distributeTargets({
  kcal,
  goalWeightKg,
  bodyWeightKg,
  preset = DEFAULT_PRESET,
  locks = {},
  current,
}: DistributeInput): Targets {
  const p = PRESETS.find((x) => x.id === preset) ?? PRESETS[0]
  const weight = goalWeightKg > 0 ? goalWeightKg : 60
  const budget = Math.max(0, kcal)

  let protein = locks.protein ? current.protein : round(p.proteinPerKg * weight)
  let fat = locks.fat ? current.fat : round((budget * p.fatShare) / KCAL_PER_G.fat)

  // Fat has a hard floor regardless of what the percentage works out to.
  const fatFloor = round(FAT_FLOOR_PER_KG * weight)
  if (!locks.fat) fat = Math.max(fat, fatFloor)

  /*
   * The squeeze: at low calories protein plus fat can exceed the whole budget,
   * which would otherwise produce negative carbs. Give back fat first, down to
   * its floor, then protein down to its own floor. Only if that still doesn't
   * fit do we accept zero carbs and report the shortfall.
   */
  const cost = () => protein * KCAL_PER_G.protein + fat * KCAL_PER_G.fat
  if (cost() > budget) {
    if (!locks.fat) {
      const spare = (cost() - budget) / KCAL_PER_G.fat
      fat = Math.max(fatFloor, round(fat - spare))
    }
    if (cost() > budget && !locks.protein) {
      const proteinFloor = round(PROTEIN_FLOOR_PER_KG * weight)
      const spare = (cost() - budget) / KCAL_PER_G.protein
      protein = Math.max(proteinFloor, round(protein - spare))
    }
  }

  const remaining = budget - cost()
  const carbs = locks.carbs ? current.carbs : round(remaining / KCAL_PER_G.carbs)

  const fibre = locks.fibre
    ? current.fibre
    : Math.max(15, round((budget / 1000) * FIBRE_PER_1000_KCAL))

  const hydrationWeight = bodyWeightKg && bodyWeightKg > 0 ? bodyWeightKg : weight
  const waterMl = locks.waterMl
    ? current.waterMl
    : Math.max(1500, Math.round((hydrationWeight * WATER_ML_PER_KG) / 50) * 50)

  return { kcal: budget, protein, carbs, fat, fibre, waterMl }
}

/** Calories the macros actually account for. */
export function macroKcal(t: Pick<Targets, 'protein' | 'carbs' | 'fat'>): number {
  return (
    t.protein * KCAL_PER_G.protein + t.carbs * KCAL_PER_G.carbs + t.fat * KCAL_PER_G.fat
  )
}

/**
 * Whether the macros describe the same diet as the calorie target. Rounding to
 * whole grams costs up to a few kcal, so exact equality is the wrong test.
 */
export function reconciles(t: Targets, tolerance = 25): boolean {
  return Math.abs(macroKcal(t) - t.kcal) <= tolerance
}

export type EnergyBalance = 'deficit' | 'maintenance' | 'surplus' | 'unknown'

export interface EnergyVerdict {
  balance: EnergyBalance
  /** Signed difference from TDEE; null when TDEE can't be computed. */
  diff: number | null
  tdee: number | null
}

/**
 * How the calorie target actually relates to maintenance.
 *
 * The workbook's note said "moderate deficit" as fixed text, which kept
 * asserting a deficit at any calorie number the user typed. This computes it.
 */
export function energyBalance(profile: {
  startWeightKg: number
  heightCm: number | null
  age: number | null
  sex: Sex
  activityLevel: ActivityLevel
}, kcal: number): EnergyVerdict {
  if (!profile.heightCm || !profile.age) {
    return { balance: 'unknown', diff: null, tdee: null }
  }
  const maintenance = tdee(
    bmr(profile.startWeightKg, profile.heightCm, profile.age, profile.sex),
    profile.activityLevel
  )
  const diff = kcal - maintenance
  const balance: EnergyBalance =
    Math.abs(diff) <= 100 ? 'maintenance' : diff < 0 ? 'deficit' : 'surplus'
  return { balance, diff, tdee: maintenance }
}
