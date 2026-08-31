import { defaultData, hydrate } from './defaults'
import type { AppData, DataStore } from './types'

export const LOCAL_KEY = 'memey-diet-planner:v1'
const KEY = LOCAL_KEY

/**
 * Browser-backed store. This is the default so the app runs with zero setup,
 * and it is what keeps things working when the phone is offline at a stall.
 *
 * It is explicitly *not* the long-term home for data: iOS evicts a PWA's
 * storage after roughly seven days of non-use, which is why the Supabase
 * adapter exists alongside it.
 */
/**
 * Whatever this browser has stored, or null.
 *
 * Exported so the Supabase store can adopt an existing local diary the first
 * time someone signs in, instead of handing them an empty one and orphaning
 * weeks of logging behind a key nothing reads any more.
 */
export function readLocalData(): Partial<AppData> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Partial<AppData>) : null
  } catch {
    return null
  }
}

/** Whether a stored document holds real logging rather than untouched defaults. */
export function hasRealContent(d: Partial<AppData> | null): boolean {
  if (!d) return false
  return Boolean(
    d.entries?.length ||
      d.weights?.length ||
      d.customFoods?.length ||
      d.profile?.heightCm ||
      d.profile?.age
  )
}

export class LocalStore implements DataStore {
  readonly kind = 'local' as const

  async load(): Promise<AppData> {
    if (typeof window === 'undefined') return defaultData()
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return defaultData()
      // Merge over defaults so data saved by an older build still loads.
      return hydrate({ ...defaultData(), ...(JSON.parse(raw) as Partial<AppData>) } as AppData)
    } catch {
      return defaultData()
    }
  }

  async save(data: AppData): Promise<void> {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      // Private mode or a full quota: the session still works in memory.
    }
  }
}
