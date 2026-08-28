import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { defaultData } from './defaults'
import type { AppData, DataStore } from './types'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(URL && ANON)

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
      const fresh = { ...defaultData(), profile: { ...defaultData().profile, id: user.id } }
      await this.save(fresh)
      return fresh
    }
    return { ...defaultData(), ...(data.data as Partial<AppData>) } as AppData
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
