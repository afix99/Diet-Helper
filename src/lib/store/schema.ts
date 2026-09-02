/**
 * Making sense of whatever comes back out of storage.
 *
 * `load()` used to spread the stored object over the defaults one level deep
 * and hand the result to the app. That works for the happy path and for the
 * one case it was designed for — a document written by an older build, missing
 * a key added since. It has nothing to say about a document that is *wrong*:
 * `entries` arriving as an object, a `servings` of `null` that turns every
 * total into `NaN`, a water map with a string in it, a save truncated when the
 * quota ran out mid-write (`local.ts` swallows that failure silently, so the
 * next load is the first anyone hears of it).
 *
 * The failure mode matters more than the detection. This is a food diary
 * someone has been keeping for months; the right answer to one bad row is
 * never "your file is invalid, here is an empty app". So every collection is
 * filtered element by element and every scalar falls back on its own: one
 * unreadable entry costs you that entry and nothing else. `repair` reports how
 * many it dropped so the behaviour is testable rather than merely hoped for.
 *
 * Written by hand rather than with Zod. Zod is ~14 KB gzipped and would land
 * in the chunk every route loads — the exact cost `catalogue.ts` was just
 * split up to avoid — and its default behaviour is to reject an object or
 * strip a field, where what is wanted here is per-field salvage.
 */
import { DEFAULT_TARGETS } from '../seedDefaults'
import { DEFAULT_PRESET, PRESETS, type PresetId } from '../targets'
import { DEFAULT_PET_NAME } from '../pet'
import { MEAL_SLOTS, type AccessorySlot, type ActivityLevel, type MealSlot } from '../types'
import type { AppData, ShoppingItem } from './types'
import { defaultData } from './defaults'

/** What `repair` had to throw away, so a caller can say so and a test can assert it. */
export interface RepairReport {
  entries: number
  activities: number
  weights: number
  customFoods: number
  shopping: number
  favourites: number
  checkedPrep: number
  water: number
  micronutrients: number
  supplements: number
}

export interface RepairResult {
  data: AppData
  /** True when anything at all was dropped or coerced back to a default. */
  repaired: boolean
  dropped: RepairReport
}

const SLOTS = new Set<string>(MEAL_SLOTS)
const ACCESSORY_SLOTS = new Set<string>(['head', 'face', 'neck', 'body', 'back'])
const PRESET_IDS = new Set<string>(PRESETS.map((p) => p.id))
const TARGET_KEYS = ['kcal', 'protein', 'carbs', 'fat', 'fibre', 'waterMl'] as const

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * A finite number, and nothing that merely looks like one.
 *
 * `NaN` is the dangerous case: it is a number by `typeof`, it survives JSON as
 * `null`, and one of them anywhere in a day's entries makes every total on
 * Today read `NaN` with no clue where it came from.
 */
const num = (v: unknown, fallback: number, { min, max }: { min?: number; max?: number } = {}) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  if (min !== undefined && v < min) return fallback
  if (max !== undefined && v > max) return fallback
  return v
}

/** Same, but a bad value fails the row rather than being replaced. */
const strictNum = (v: unknown, { min, max }: { min?: number; max?: number } = {}): number | null => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  if (min !== undefined && v < min) return null
  if (max !== undefined && v > max) return null
  return v
}

const str = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback)
const nullableStr = (v: unknown) => (typeof v === 'string' ? v : null)
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback)

/** ISO calendar date. Every date in the diary is a map key or a sort key. */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const isoDate = (v: unknown): string | null =>
  typeof v === 'string' && ISO_DATE.test(v) ? v : null

const nullableNum = (v: unknown, opts: { min?: number; max?: number } = {}) =>
  strictNum(v, opts)

/**
 * Keep the rows that survive `pick`, count the rest.
 *
 * A non-array collection (an object, a string, `undefined`) is not an error to
 * report row by row — there are no rows — so it yields the empty list and a
 * count of zero.
 */
function salvage<T>(raw: unknown, pick: (row: unknown) => T | null): [T[], number] {
  if (!Array.isArray(raw)) return [[], 0]
  const out: T[] = []
  let dropped = 0
  for (const row of raw) {
    const kept = pick(row)
    if (kept === null) dropped += 1
    else out.push(kept)
  }
  return [out, dropped]
}

const macrosOf = (v: unknown) => {
  const m = isObject(v) ? v : {}
  return {
    kcal: num(m.kcal, 0, { min: 0 }),
    protein: num(m.protein, 0, { min: 0 }),
    carbs: num(m.carbs, 0, { min: 0 }),
    fat: num(m.fat, 0, { min: 0 }),
    fibre: num(m.fibre, 0, { min: 0 }),
  }
}

/**
 * A string map keyed by ISO date, e.g. water and the supplement ticks.
 *
 * Keys that are not dates are dropped rather than kept: everything that reads
 * these maps looks the key up by date, so a junk key is invisible weight that
 * would ride along through every save from then on.
 */
function salvageDateMap<T>(raw: unknown, value: (v: unknown) => T | null): [Record<string, T>, number] {
  if (!isObject(raw)) return [{}, 0]
  const out: Record<string, T> = {}
  let dropped = 0
  for (const [k, v] of Object.entries(raw)) {
    const date = isoDate(k)
    const val = date === null ? null : value(v)
    if (date === null || val === null) dropped += 1
    else out[date] = val
  }
  return [out, dropped]
}

const stringList = (v: unknown): string[] | null =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null

/**
 * Turn anything at all into a usable diary.
 *
 * Never throws and never returns a partial `AppData`: the result is always
 * complete, because the whole point is that the screens downstream can stop
 * defending themselves.
 */
export function repair(raw: unknown): RepairResult {
  const base = defaultData()
  const d = isObject(raw) ? raw : {}

  const dropped: RepairReport = {
    entries: 0,
    activities: 0,
    weights: 0,
    customFoods: 0,
    shopping: 0,
    favourites: 0,
    checkedPrep: 0,
    water: 0,
    micronutrients: 0,
    supplements: 0,
  }

  // --- profile -------------------------------------------------------------
  const p = isObject(d.profile) ? d.profile : {}
  const profile = {
    id: str(p.id, base.profile.id),
    displayName: nullableStr(p.displayName),
    sex: p.sex === 'male' ? ('male' as const) : ('female' as const),
    heightCm: nullableNum(p.heightCm, { min: 1, max: 300 }),
    age: nullableNum(p.age, { min: 1, max: 150 }),
    startWeightKg: num(p.startWeightKg, base.profile.startWeightKg, { min: 1, max: 700 }),
    goalWeightKg: num(p.goalWeightKg, base.profile.goalWeightKg, { min: 1, max: 700 }),
    bodyFatPct: nullableNum(p.bodyFatPct, { min: 1, max: 99 }),
    startDate: isoDate(p.startDate) ?? base.profile.startDate,
    activityLevel: (p.activityLevel === 'moderate' || p.activityLevel === 'active'
      ? p.activityLevel
      : 'sedentary') as ActivityLevel,
  }

  // --- targets -------------------------------------------------------------
  const t = isObject(d.targets) ? d.targets : {}
  const targets = { ...DEFAULT_TARGETS }
  for (const k of TARGET_KEYS) targets[k] = num(t[k], DEFAULT_TARGETS[k], { min: 0 })

  // --- the diary -----------------------------------------------------------
  const [entries, entriesDropped] = salvage(d.entries, (row) => {
    if (!isObject(row)) return null
    const date = isoDate(row.date)
    const servings = strictNum(row.servings, { min: 0 })
    if (date === null || servings === null) return null
    const slot = SLOTS.has(row.slot as string) ? (row.slot as MealSlot) : 'lunch'
    return {
      id: str(row.id, `${date}-${slot}-${Math.random().toString(36).slice(2, 10)}`),
      date,
      slot,
      foodId: nullableStr(row.foodId),
      recipeId: nullableStr(row.recipeId),
      customName: nullableStr(row.customName),
      servings,
      notes: nullableStr(row.notes),
      macros: macrosOf(row.macros),
    }
  })
  dropped.entries = entriesDropped

  const [activities, activitiesDropped] = salvage(d.activities, (row) => {
    if (!isObject(row)) return null
    const date = isoDate(row.date)
    const minutes = strictNum(row.minutes, { min: 0 })
    const kcal = strictNum(row.kcal, { min: 0 })
    if (date === null || minutes === null || kcal === null) return null
    return {
      id: str(row.id, `${date}-${Math.random().toString(36).slice(2, 10)}`),
      date,
      exerciseId: nullableStr(row.exerciseId),
      customName: nullableStr(row.customName),
      minutes,
      kcal,
    }
  })
  dropped.activities = activitiesDropped

  const [weights, weightsDropped] = salvage(d.weights, (row) => {
    if (!isObject(row)) return null
    const date = isoDate(row.date)
    // A weigh-in without a weight is the one thing a weigh-in has to have.
    const weightKg = strictNum(row.weightKg, { min: 1, max: 700 })
    if (date === null || weightKg === null) return null
    return {
      id: str(row.id, date),
      date,
      weightKg,
      waistCm: nullableNum(row.waistCm, { min: 1, max: 400 }),
      hipCm: nullableNum(row.hipCm, { min: 1, max: 400 }),
    }
  })
  dropped.weights = weightsDropped

  const [customFoods, customFoodsDropped] = salvage(d.customFoods, (row) => {
    if (!isObject(row)) return null
    const id = typeof row.id === 'string' && row.id ? row.id : null
    const name = typeof row.name === 'string' && row.name ? row.name : null
    if (id === null || name === null) return null
    const m = macrosOf(row)
    return {
      id,
      slug: str(row.slug, id),
      category: str(row.category, 'OTHER'),
      name,
      servingSize: nullableStr(row.servingSize),
      ...m,
      glycemicLoad: nullableNum(row.glycemicLoad, { min: 0 }),
      notes: nullableStr(row.notes),
      // A custom food with no owner would read as a catalogue row and become
      // undeletable, so an unreadable owner falls back to the local sentinel.
      ownerId: typeof row.ownerId === 'string' ? row.ownerId : 'local',
      source: 'custom' as const,
    }
  })
  dropped.customFoods = customFoodsDropped

  const [shopping, shoppingDropped] = salvage<ShoppingItem>(d.shopping, (row) => {
    if (!isObject(row)) return null
    const item = typeof row.item === 'string' && row.item ? row.item : null
    if (item === null) return null
    return {
      id: str(row.id, `item-${Math.random().toString(36).slice(2, 10)}`),
      category: str(row.category, 'OTHER'),
      item,
      qty: nullableStr(row.qty),
      estCostRm: nullableStr(row.estCostRm),
      vendor: nullableStr(row.vendor),
      priority: nullableStr(row.priority),
      checked: bool(row.checked, false),
    }
  })
  dropped.shopping = shoppingDropped

  const [favourites, favouritesDropped] = salvage(d.favourites, (row) =>
    typeof row === 'string' ? row : null
  )
  dropped.favourites = favouritesDropped

  const [checkedPrep, checkedPrepDropped] = salvage(d.checkedPrep, (row) =>
    typeof row === 'string' ? row : null
  )
  dropped.checkedPrep = checkedPrepDropped

  const [water, waterDropped] = salvageDateMap(d.water, (v) => strictNum(v, { min: 0 }))
  dropped.water = waterDropped

  const [micronutrients, microDropped] = salvageDateMap(d.micronutrients, stringList)
  dropped.micronutrients = microDropped

  const [supplements, suppDropped] = salvageDateMap(d.supplements, stringList)
  dropped.supplements = suppDropped

  // --- target locks and preset --------------------------------------------
  const rawLocks = isObject(d.targetLocks) ? d.targetLocks : {}
  const targetLocks: AppData['targetLocks'] = {}
  for (const k of TARGET_KEYS) {
    if (rawLocks[k] === true) targetLocks[k] = true
  }

  const targetPreset: PresetId = PRESET_IDS.has(d.targetPreset as string)
    ? (d.targetPreset as PresetId)
    : DEFAULT_PRESET

  // --- the cat -------------------------------------------------------------
  const rawPet = isObject(d.pet) ? d.pet : {}
  const rawWorn = isObject(rawPet.worn) ? rawPet.worn : {}
  const worn: Partial<Record<AccessorySlot, string | null>> = {}
  for (const [k, v] of Object.entries(rawWorn)) {
    if (!ACCESSORY_SLOTS.has(k)) continue
    if (typeof v === 'string' || v === null) worn[k as AccessorySlot] = v
  }
  const pet = {
    name: str(rawPet.name, DEFAULT_PET_NAME),
    out: bool(rawPet.out, true),
    seenStage: num(rawPet.seenStage, -1),
    worn,
    costume: nullableStr(rawPet.costume),
    seenUnlocks: stringList(rawPet.seenUnlocks) ?? [],
    greeted: bool(rawPet.greeted, false),
  }

  // --- dismissals ----------------------------------------------------------
  const rawDis = isObject(d.dismissals) ? d.dismissals : {}
  const rawUnder = isObject(rawDis.underEating) ? rawDis.underEating : null
  const underEating =
    rawUnder === null
      ? null
      : (() => {
          const at = nullableStr(rawUnder.at)
          const throughDate = isoDate(rawUnder.throughDate)
          const targetKcal = strictNum(rawUnder.targetKcal, { min: 0 })
          // A half-written dismissal is treated as never dismissed, which shows
          // the warning again — the safe direction for a warning about eating
          // too little.
          return at === null || throughDate === null || targetKcal === null
            ? null
            : { at, targetKcal, throughDate }
        })()

  const data: AppData = {
    profile,
    targets,
    entries,
    activities,
    weights,
    customFoods,
    // Only fall back to the seeded list when the key is genuinely absent. An
    // empty array is a list someone cleared on purpose.
    shopping: Array.isArray(d.shopping) ? shopping : base.shopping,
    favourites,
    checkedPrep,
    water,
    micronutrients,
    supplements,
    targetLocks,
    targetPreset,
    pet,
    dismissals: { underEating },
  }

  const totalDropped = Object.values(dropped).reduce((a, b) => a + b, 0)
  return { data, repaired: totalDropped > 0, dropped }
}
