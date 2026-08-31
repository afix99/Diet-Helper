import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { defaultData, hydrate } from './defaults'
import { hasRealContent, readLocalData } from './local'
import type { AppData, DataStore } from './types'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Accounts are opt-in, separately from having credentials.
 *
 * Credentials alone used to be enough to raise a sign-in wall, which meant a
 * half-finished auth setup locked everyone out of a working app. Whether the
 * database exists and whether people must log in are different questions, and
 * only the second one should be able to make the app unusable.
 *
 * Set NEXT_PUBLIC_ENABLE_ACCOUNTS=1 to turn the wall on. Unset or anything
 * else, and the app runs on browser storage exactly as it did before Supabase
 * — the project, its table and its policies all stay where they are.
 */
const ACCOUNTS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_ACCOUNTS === '1'

export const supabaseConfigured = ACCOUNTS_ENABLED && Boolean(URL && ANON)

export function supabaseClient(): SupabaseClient | null {
  if (!URL || !ANON) return null
  return createClient(URL, ANON, { auth: { persistSession: true } })
}

/**
 * Postgres-backed store.
 *
 * User data is held as one JSONB document per profile rather than shredded
 * across ten tables. The app only ever reads and writes the whole document,
 * every screen needs most of it, and a single row keeps the RLS policy to one
 * rule (`auth.uid() = id`) that is easy to verify. If reporting across users
 * is ever needed, the document can be expanded into relational tables behind
 * this same interface without touching a screen.
 */
export class SupabaseStore implements DataStore {
  readonly kind = 'supabase' as const

  constructor(private client: SupabaseClient) {}

  async load(): Promise<AppData> {
    const {
      data: { user },
    } = await this.client.auth.getUser()
    if (!user) return defaultData()

    const { data, error } = await this.client
      .from('planner_data')
      .select('data')
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      /*
       * First sign-in on this account. Someone who has been logging locally
       * for weeks would otherwise land on an empty diary, with their real one
       * still sitting in localStorage under a key nothing reads any more —
       * indistinguishable from data loss. Adopt it instead.
       *
       * The local copy is deliberately left in place: if this upload fails
       * halfway, the only surviving record should not be the one we deleted.
       */
      const local = readLocalData()
      const base = hydrate(
        hasRealContent(local) ? ({ ...defaultData(), ...local } as AppData) : defaultData()
      )
      const fresh = { ...base, profile: { ...base.profile, id: user.id } } as AppData
      await this.save(fresh)
      return fresh
    }
    return hydrate({ ...defaultData(), ...(data.data as Partial<AppData>) } as AppData)
  }

  async save(data: AppData): Promise<void> {
    const {
      data: { user },
    } = await this.client.auth.getUser()
    if (!user) return
    const { error } = await this.client
      .from('planner_data')
      .upsert({ id: user.id, data, updated_at: new Date().toISOString() })
    if (error) throw error
  }
}
