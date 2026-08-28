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

/** Bilingual label pairs, Malay first — matching the sheet's own convention. */
export const SLOT_LABELS: Record<MealSlot, { ms: string; en: string; time: string }> = {
  breakfast: { ms: 'Sarapan', en: 'Breakfast', time: '07:00' },
  morning_snack: { ms: 'Snek Pagi', en: 'Morning Snack', time: '10:00' },
  lunch: { ms: 'Tengahari', en: 'Lunch', time: '13:00' },
  afternoon_snack: { ms: 'Snek Petang', en: 'Afternoon Snack', time: '16:00' },
  dinner: { ms: 'Malam', en: 'Dinner', time: '19:00' },
  evening: { ms: 'Malam (pilihan)', en: 'Evening (optional)', time: '21:00' },
}

export interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
  fibre: number
}

export interface Food extends Macros {
  id: string
  slug: string
  category: string
  name: string
  servingSize: string | null
  glycemicLoad: number | null
  notes: string | null
  ownerId: string | null
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
