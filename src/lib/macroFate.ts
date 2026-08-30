/**
 * What actually happens to food eaten past a macro target.
 *
 * This exists because the app was creating anxiety it then refused to answer.
 * Today's screen would show `168/120g` of carbs and stop, which reads as an
 * accusation without a verdict.
 *
 * The verdict is not the one most calorie apps imply, so the rules below matter
 * more than the arithmetic:
 *
 * - **Which macro you go over on decides what fuel gets used. The energy
 *   balance decides whether anything is stored.** Going over on carbs while
 *   eating below maintenance stores nothing. Saying otherwise would be a lie,
 *   and it is the specific lie that makes people miserable about one heavy meal.
 * - **Maintenance, not the target, is the line that matters.** A calorie target
 *   is normally set *below* maintenance on purpose, so being over target and
 *   being in surplus are different things. When height and age are missing we
 *   cannot compute maintenance, and the copy says so instead of guessing.
 * - **Numbers get their error bars.** The 7700 kcal/kg conversion is never
 *   printed without the word "rough" beside it.
 *
 * And one rule about length, which the first version broke badly: **the answer
 * has to be readable in one glance.** It shipped at about 250 words for a 17g
 * overage, which is a wall, and a wall is a thing people close rather than
 * read. Three tiers now — the verdict, two steps, one closing line — and a test
 * caps the word count so it cannot quietly grow back.
 */
import { round1 } from './nutrition'
import { KCAL_PER_G, energyBalance, type EnergyBalance } from './targets'
import type { ActivityLevel, Macros, Sex, Targets } from './types'

export type MacroKey = 'protein' | 'carbs' | 'fat' | 'fibre'

export const MACRO_LABELS: Record<MacroKey, string> = {
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  fibre: 'Fibre',
}

/**
 * Wishnofsky's rule: the calories notionally stored in a kilogram of body fat.
 *
 * It is an approximation and an over-estimate of real-world gain — it assumes
 * every surplus calorie lands in fat tissue, ignores the lean mass that moves
 * with it, and ignores that expenditure rises as you eat more. Every string in
 * this file that uses it says "rough" next to it.
 */
export const KCAL_PER_KG_FAT = 7700

export interface FateProfile {
  startWeightKg: number
  heightCm: number | null
  age: number | null
  sex: Sex
  activityLevel: ActivityLevel
}

export interface MacroFateInput {
  totals: Macros
  targets: Targets
  profile: FateProfile
  /** Current weight, if there is a weigh-in. Maintenance tracks the body you have. */
  latestWeightKg?: number | null
}

/** One leg of the route the food takes. Bold lead, one sentence under it. */
export interface FateStep {
  lead: string
  detail: string
}

export interface MacroFate {
  key: MacroKey
  label: string
  /** Grams past the target. Zero at or below it. */
  overBy: number
  /** What those grams are worth in calories. Null for fibre, which is not fuel. */
  overKcal: number | null
  /** Where the whole day sits against maintenance — this, not the macro, decides storage. */
  energy: EnergyBalance
  /** Maintenance in kcal, when height and age allow it to be computed. */
  maintenanceKcal: number | null
  /** Signed kcal against maintenance; positive means surplus. Null when unknown. */
  balanceKcal: number | null
  /** Grams of body fat the surplus could account for. Zero unless in surplus. */
  fatGainG: number
  /** The day's total intake, so the sheet can show the comparison it is making. */
  totalKcal: number
  headline: string
  /** The answer, first and in bold. */
  verdict: { line: string; detail: string }
  /** Where it goes, in two beats. */
  steps: FateStep[]
  /** The one thing worth remembering afterwards. */
  footer: string
}

const g = (n: number) => `${Math.round(n)}g`
const kcal = (n: number) => Math.round(n).toLocaleString('en-GB')

/** The route this particular macro takes. Two beats, no more. */
const STEPS: Record<MacroKey, FateStep[]> = {
  carbs: [
    {
      lead: 'Tops up your glycogen tank first.',
      detail:
        'Muscles and liver hold 400 to 500g, each gram holding 3g of water. That water ' +
        'is why rice spikes the scale, then drops two days later.',
    },
    {
      lead: 'The rest gets burned before fat does.',
      detail:
        'Carbs jump the queue. Turning them straight into body fat barely happens.',
    },
  ],
  protein: [
    {
      lead: 'There is nowhere to put it.',
      detail:
        'You have no protein store. The spare nitrogen leaves in your pee and the rest gets burned.',
    },
    {
      lead: 'It is the cheapest thing to overshoot.',
      detail:
        'Digesting protein costs 20 to 30% of its own calories. Carbs cost 5 to 10%, fat almost nothing.',
    },
  ],
  fat: [
    {
      lead: 'It parks the most easily.',
      detail:
        'Dietary fat reaches your fat stores almost intact. That part of its reputation is fair.',
    },
    {
      lead: 'Parking is not gaining.',
      detail: 'Under your burn, that is the fat you used, not the fat you kept.',
    },
  ],
  fibre: [
    {
      lead: 'Almost none of it counts.',
      detail:
        'Fibre is a floor, not a ceiling. Most passes straight through; your gut bacteria nibble the rest.',
    },
    {
      lead: 'Nothing to undo.',
      detail: 'A big jump just means gas and bloating. Build it up slowly and drink more water.',
    },
  ],
}

/** The answer, before any of the biology. */
function verdictFor(f: {
  energy: EnergyBalance
  balanceKcal: number | null
  fatGainG: number
  totalKcal: number
}): { line: string; detail: string } {
  const eaten = kcal(f.totalKcal)

  if (f.energy === 'unknown') {
    return {
      line: 'Cannot tell yet.',
      detail:
        'Your target is not the same thing as what you burn. Add your height and age and ' +
        'this can answer properly.',
    }
  }

  if (f.energy === 'surplus' && f.balanceKcal !== null) {
    return {
      line: `About ${g(f.fatGainG)} of it could stick.`,
      detail:
        `${eaten} eaten, about ${kcal(f.totalKcal - f.balanceKcal)} burned. Rough ` +
        `7,700 kcal-per-kilo maths, and tomorrow's scale is mostly water anyway.`,
    }
  }

  if (f.energy === 'maintenance') {
    return {
      line: 'Nothing stored, nothing lost.',
      detail: `${eaten} eaten, about the same burned.`,
    }
  }

  return {
    line: 'None of it gets stored.',
    detail: `${eaten} eaten, about ${kcal(f.totalKcal - (f.balanceKcal ?? 0))} burned.`,
  }
}

export function macroFate(input: MacroFateInput, key: MacroKey): MacroFate {
  const { totals, targets, profile, latestWeightKg } = input

  const target = targets[key]
  const overBy = Math.max(0, round1(totals[key] - target))
  const overKcal =
    key === 'fibre' ? null : Math.round(overBy * KCAL_PER_G[key as 'protein' | 'carbs' | 'fat'])

  // Maintenance tracks the body you have, so a real weigh-in beats the start weight.
  const weight = latestWeightKg && latestWeightKg > 0 ? latestWeightKg : profile.startWeightKg
  const balance = energyBalance({ ...profile, startWeightKg: weight }, totals.kcal)

  const fatGainG =
    balance.balance === 'surplus' && balance.diff !== null
      ? Math.round((balance.diff / KCAL_PER_KG_FAT) * 1000)
      : 0

  const headline =
    overBy <= 0
      ? `${MACRO_LABELS[key]} is within target`
      : key === 'fibre'
        ? `${g(overBy)} past your fibre target`
        : `${g(overBy)} over on ${MACRO_LABELS[key].toLowerCase()}`

  return {
    key,
    label: MACRO_LABELS[key],
    overBy,
    overKcal,
    energy: balance.balance,
    maintenanceKcal: balance.tdee,
    balanceKcal: balance.diff,
    fatGainG,
    totalKcal: totals.kcal,
    headline,
    verdict: verdictFor({
      energy: balance.balance,
      balanceKcal: balance.diff,
      fatGainG,
      totalKcal: totals.kcal,
    }),
    steps: STEPS[key],
    footer:
      overBy > 0
        ? `Your portion guess is probably off by more than ${g(overBy)} anyway.`
        : 'Portion guesses move a day further than a few grams either way.',
  }
}
