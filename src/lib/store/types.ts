import type { PresetId } from '../targets'
import type {
  ActivityLog,
  Dismissals,
  Food,
  LogEntry,
  PetState,
  Profile,
  Targets,
  WeightLog,
} from '../types'

export interface ShoppingItem {
  id: string
  category: string
  item: string
  qty: string | null
  estCostRm: string | null
  vendor: string | null
  priority: string | null
  checked: boolean
}

/** Everything that belongs to a user. Foods/recipes are bundled, not stored. */
export interface AppData {
  profile: Profile
  targets: Targets
  entries: LogEntry[]
  /** Logged exercise and mental work, which raises the day's allowance. */
  activities: ActivityLog[]
  weights: WeightLog[]
  customFoods: Food[]
  shopping: ShoppingItem[]
  /** Food ids pinned to the top of every picker. */
  favourites: string[]
  checkedPrep: string[]
  /** Millilitres drunk, keyed by ISO date. */
  water: Record<string, number>
  /** Micronutrients ticked off, keyed by ISO date. */
  micronutrients: Record<string, string[]>
  /** Supplements taken, keyed by ISO date. */
  supplements: Record<string, string[]>
  /** Macro targets the user set by hand; these survive redistribution. */
  targetLocks: Partial<Record<keyof Targets, boolean>>
  /** Which distribution shape drives the unlocked targets. */
  targetPreset: PresetId
  /** The streak cat. A new top-level key, so old diaries backfill the default. */
  pet: PetState
  /** Warnings the user has closed. Backfilled like `pet`. */
  dismissals: Dismissals
}

/**
 * Storage boundary. The local implementation keeps everything in the browser;
 * the Supabase one talks to Postgres. Screens only ever see this interface, so
 * switching is a config change rather than a rewrite.
 */
export interface DataStore {
  readonly kind: 'local' | 'supabase'
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
}
