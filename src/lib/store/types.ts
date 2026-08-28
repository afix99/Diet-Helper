import type { Food, LogEntry, Profile, Targets, WeightLog } from '../types'

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
  weights: WeightLog[]
  customFoods: Food[]
  shopping: ShoppingItem[]
  /** Food ids pinned to the top of every picker. */
  favourites: string[]
  checkedPrep: string[]
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
