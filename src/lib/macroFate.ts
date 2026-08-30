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
 * - **Where the evidence is thin or contested, say that.** De novo lipogenesis
 *   and protein's effect on healthy kidneys are both places where the confident
 *   version of the story is wrong.
 * - **Numbers get their error bars.** The 7700 kcal/kg conversion is never
 *   printed without being called an approximation.
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
 * this file that uses it says the word "roughly" or "about" next to it.
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
  body: string[]
}

const g = (n: number) => `${Math.round(n)}g`
const kcal = (n: number) => Math.round(n).toLocaleString('en-GB')

/** Where the excess of this particular macro goes, physiologically. */
function pathway(key: MacroKey): string[] {
  switch (key) {
    case 'carbs':
      return [
        'Carbohydrate fills glycogen first — roughly 400 to 500 grams of it across your ' +
          'muscles and liver, and every gram is stored holding about 3 grams of water with it. ' +
          'That is why a rice-heavy day reads a kilogram heavier the next morning and is gone ' +
          'again two days later. It was water, not fat.',
        'Turning carbohydrate directly into body fat is a real pathway but a small one in ' +
          'people eating normally; researchers argue about how much it matters, and the honest ' +
          'answer is “not much, most days”. The route that does matter is indirect: your body ' +
          'burns the carbs first, so the fat you ate that day is what gets put away instead. ' +
          'Both routes still need the day to be in surplus overall.',
      ]
    case 'protein':
      return [
        'There is no protein store. Amino acids you do not need get the nitrogen stripped off, ' +
          'which leaves in your urine as urea, and the carbon left behind is burned for energy ' +
          'or turned into glucose. Nothing is set aside for later.',
        'Digesting protein also costs roughly 20 to 30 percent of its own calories, against ' +
          '5 to 10 percent for carbs and near nothing for fat. An overshoot on protein is the ' +
          'cheapest one to make. On healthy kidneys, high protein intakes have not been shown ' +
          'to cause damage; if you already have kidney disease it genuinely does matter, and ' +
          'that is a question for your doctor rather than for this app.',
      ]
    case 'fat':
      return [
        'Dietary fat is the cheapest thing for your body to store — it reaches fat tissue ' +
          'almost intact, losing only a few percent as heat along the way. That is the fact ' +
          'behind the reputation.',
        'Storing is not the same as gaining, though. Below maintenance that fat is what you ' +
          'burned rather than what you kept. What fat really does to a diary is arithmetic: at ' +
          '9 kcal a gram it is more than twice as dense as carbs or protein, so a generous hand ' +
          'with oil or santan moves a day further than any other single ingredient, and it is ' +
          'the easiest thing in the app to measure wrongly.',
      ]
    case 'fibre':
      return [
        'Fibre is a floor, not a ceiling. It is mostly not absorbed at all — the bacteria in ' +
          'your gut ferment part of it and hand back a small amount of energy, and the rest ' +
          'leaves. None of it is stored, and there is nothing here to undo.',
        'The only real cost of a large jump is comfort. Going well past what you are used to ' +
          'in one day — call it 50 to 60 grams if your usual is half that — brings gas, ' +
          'bloating and cramping, and very high intakes can bind some minerals. Raise it over ' +
          'weeks rather than in a day, and drink more water while you do.',
      ]
  }
}

/** The personalised verdict: is any of this actually being stored today. */
function verdict(f: {
  energy: EnergyBalance
  maintenanceKcal: number | null
  balanceKcal: number | null
  fatGainG: number
  totalKcal: number
  targetKcal: number
}): string {
  const eaten = `You are at ${kcal(f.totalKcal)} kcal today`

  if (f.energy === 'unknown') {
    const overTarget = f.totalKcal - f.targetKcal
    const proxy =
      overTarget > 0
        ? `${kcal(overTarget)} over your ${kcal(f.targetKcal)} target`
        : `under your ${kcal(f.targetKcal)} target`
    return (
      `${eaten}, ${proxy}. Storing fat depends on how that compares with what you burn, ` +
      `not with your target — and a target is usually set below what you burn on purpose, ` +
      `so being over it often still means losing. Add your height and age in Settings and ` +
      `this can tell you which side of that line you are on instead of guessing.`
    )
  }

  if (f.energy === 'surplus' && f.balanceKcal !== null) {
    return (
      `${eaten}, about ${kcal(f.balanceKcal)} kcal more than you burn. Roughly 7,700 kcal ` +
      `builds a kilogram of fat, so a surplus that size works out at around ${g(f.fatGainG)} ` +
      `of body fat — and that conversion is a rule of thumb that flatters the number upwards, ` +
      `not a measurement. One day over is counted in grams, not kilograms. Whatever the scale ` +
      `says tomorrow is mostly water, glycogen and what is still in your gut.`
    )
  }

  if (f.energy === 'maintenance') {
    return (
      `${eaten}, which is about what you burn. Nothing is being stored and nothing is being ` +
      `lost — the split just moved. Whatever the scale says tomorrow is water, glycogen and ` +
      `gut contents, not this.`
    )
  }

  return (
    `${eaten}, about ${kcal(Math.abs(f.balanceKcal ?? 0))} kcal less than you burn. Nothing ` +
    `you ate today is being stored as fat, whatever the bar looks like. Being over on one ` +
    `macro while under on energy is the split moving, not the diet failing.`
  )
}

const SERVING_CAVEAT =
  'Worth keeping in proportion: serving sizes are the biggest source of error in here. ' +
  'The gap between the portion you actually ate and the one in the catalogue is usually ' +
  'larger than the amount you are over by.'

export function macroFate(input: MacroFateInput, key: MacroKey): MacroFate {
  const { totals, targets, profile, latestWeightKg } = input

  const target = targets[key]
  const overBy = Math.max(0, round1(totals[key] - target))
  const overKcal =
    key === 'fibre' ? null : Math.round(overBy * KCAL_PER_G[key as 'protein' | 'carbs' | 'fat'])

  // Maintenance tracks the body you have, so a real weigh-in beats the start weight.
  const weight =
    latestWeightKg && latestWeightKg > 0 ? latestWeightKg : profile.startWeightKg
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

  const opening =
    overBy <= 0
      ? [
          `You are at ${g(totals[key])} against a ${g(target)} target, so there is no overage ` +
            `to explain. What follows is what would happen if there were.`,
        ]
      : overKcal === null
        ? []
        : [
            `That is ${g(overBy)} past ${g(target)}, worth about ${kcal(overKcal)} kcal on its own.`,
          ]

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
    body: [
      ...opening,
      ...pathway(key),
      verdict({
        energy: balance.balance,
        maintenanceKcal: balance.tdee,
        balanceKcal: balance.diff,
        fatGainG,
        totalKcal: totals.kcal,
        targetKcal: targets.kcal,
      }),
      SERVING_CAVEAT,
    ],
  }
}
