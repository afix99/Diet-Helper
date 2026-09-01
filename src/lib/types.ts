/** Domain types. Field names mirror the workbook's own vocabulary. */

export type Sex = 'female' | 'male'

export type ActivityLevel = 'sedentary' | 'moderate' | 'active'

/** The six slots of the workbook's Weekly Meal Schedule (rows 6–11 of each day). */
export type MealSlot =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner'
  | 'evening'

export const MEAL_SLOTS: readonly MealSlot[] = [
  'breakfast',
  'morning_snack',
  'lunch',
  'afternoon_snack',
  'dinner',
  'evening',
] as const

export const SLOT_LABELS: Record<MealSlot, { label: string; time: string }> = {
  breakfast: { label: 'Breakfast', time: '07:00' },
  morning_snack: { label: 'Morning Snack', time: '10:00' },
  lunch: { label: 'Lunch', time: '13:00' },
  afternoon_snack: { label: 'Afternoon Snack', time: '16:00' },
  dinner: { label: 'Dinner', time: '19:00' },
  evening: { label: 'Evening (optional)', time: '21:00' },
}

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fibre: number
}

/**
 * Where a food's numbers came from.
 * - `workbook`: validated against Malaysian Food Composition Tables and USDA,
 *   per the source spreadsheet.
 * - `community`: public estimates for chain and street food. Real portions
 *   vary a lot between vendors, so these are shown marked.
 * - `custom`: entered by the user.
 */
export type FoodSource = 'workbook' | 'community' | 'custom'

export interface Food extends Macros {
  id: string
  slug: string
  category: string
  name: string
  servingSize: string | null
  glycemicLoad: number | null
  notes: string | null
  ownerId: string | null
  source: FoodSource
}

export interface Recipe extends Macros {
  id: string
  slug: string
  name: string
  minutes: number
  ingredients: string[]
  steps: string[]
  chefsNote: string | null
}

export interface LogEntry {
  id: string
  date: string // ISO yyyy-mm-dd
  slot: MealSlot
  foodId: string | null
  recipeId: string | null
  customName: string | null
  servings: number
  notes: string | null
  /** Denormalised per-serving macros, so history survives a food being edited. */
  macros: Macros
}

/**
 * One row of the activity catalogue.
 *
 * `met` is the Compendium of Physical Activities figure — *total* energy as a
 * multiple of rest, which is why nothing here can be multiplied straight into a
 * calorie budget. See `burnFor` in `exercise.ts`.
 */
export interface Exercise {
  id: string
  slug: string
  category: string
  name: string
  met: number
  notes: string | null
}

/** One logged bout of activity. */
export interface ActivityLog {
  id: string
  date: string
  exerciseId: string | null
  customName: string | null
  minutes: number
  /**
   * Snapshotted at the moment it was logged, for the same reason
   * `LogEntry.macros` is: last month's workout should not silently re-price
   * itself when you weigh in or when a MET value is corrected.
   */
  kcal: number
}

/**
 * The streak cat's own state. Everything else about it — which stage it is at,
 * what pose it holds — is derived from the diary, so this is only the part the
 * diary cannot know.
 */
/**
 * Where a wardrobe piece sits on the cat. Lives here rather than in
 * petWardrobe.ts so that PetState can name it without the two files importing
 * each other.
 */
export type AccessorySlot = 'head' | 'face' | 'neck' | 'body' | 'back'

export interface PetState {
  name: string
  /** False while the cat is in its house and off the Today screen. */
  out: boolean
  /**
   * The highest stage already celebrated. Starts at -1 so an existing diary
   * gets one welcome at whatever stage it has already earned, rather than six
   * celebrations in a row.
   */
  seenStage: number
  /**
   * One accessory per slot. Partial because an old diary has none, and because
   * a slot the user has never touched is meaningfully different from one they
   * emptied on purpose.
   */
  worn: Partial<Record<AccessorySlot, string | null>>
  /** A costume overrides `worn` while it is on, without overwriting it. */
  costume: string | null
  /** Unlock ids already looked at, so a new item is marked once, not forever. */
  seenUnlocks: string[]
}

/**
 * Warnings the user has closed.
 *
 * In the diary rather than in localStorage: closing a warning is a decision
 * about your own body, and it should hold on every device you open the app on,
 * not just the phone you happened to dismiss it from.
 */
export interface Dismissals {
  underEating: UnderEatingDismissalRecord | null
}

export interface UnderEatingDismissalRecord {
  at: string
  targetKcal: number
  throughDate: string
}

export interface Targets extends Macros {
  waterMl: number
}

export interface Profile {
  id: string
  displayName: string | null
  sex: Sex
  heightCm: number | null
  age: number | null
  startWeightKg: number
  goalWeightKg: number
  bodyFatPct: number | null
  startDate: string
  activityLevel: ActivityLevel
}

export interface WeightLog {
  id: string
  date: string
  weightKg: number
  waistCm: number | null
  hipCm: number | null
}
