import { defaultData } from './defaults'
import type { AppData, DataStore } from './types'

const KEY = 'memey-diet-planner:v1'

/**
 * Browser-backed store. This is the default so the app runs with zero setup,
 * and it is what keeps things working when the phone is offline at a stall.
 *
 * It is explicitly *not* the long-term home for data: iOS evicts a PWA's
 * storage after roughly seven days of non-use, which is why the Supabase
 * adapter exists alongside it.
 */
export class LocalStore implements DataStore {
  readonly kind = 'local' as const

  async load(): Promise<AppData> {
    if (typeof window === 'undefined') return defaultData()
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return defaultData()
      // Merge over defaults so data saved by an older build still loads.
      return { ...defaultData(), ...(JSON.parse(raw) as Partial<AppData>) } as AppData
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
