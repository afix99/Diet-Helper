import { LocalStore } from './local'
import { SupabaseStore, supabaseClient, supabaseConfigured } from './supabase'
import type { DataStore } from './types'

/**
 * Use Postgres when it is configured, the browser otherwise. This is what lets
 * the app run immediately on a clone with no credentials, and start syncing
 * across devices the moment the two Supabase env vars are set.
 */
export function createStore(): DataStore {
  if (supabaseConfigured) {
    const client = supabaseClient()
    if (client) return new SupabaseStore(client)
  }
  return new LocalStore()
}

export { supabaseConfigured, supabaseClient }
export type { AppData, DataStore, ShoppingItem } from './types'
