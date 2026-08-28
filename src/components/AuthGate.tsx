'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabaseClient, supabaseConfigured } from '@/lib/store'

/**
 * Sign-in wall — but only when Supabase is actually configured.
 *
 * With no credentials the app runs entirely on local storage and there is
 * nothing to sign in to, so the gate stays out of the way. That keeps a fresh
 * clone usable immediately instead of dead-ending on a login form.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const client = useMemo(() => (supabaseConfigured ? supabaseClient() : null), [])
  const [session, setSession] = useState<Session | null>(null)
  const [checked, setChecked] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!client) {
      setChecked(true)
      return
    }
    client.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChecked(true)
    })
    const { data: sub } = client.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [client])

  if (!client) return <>{children}</>
  if (!checked) return <p className="py-20 text-center text-secondary text-faint">Loading…</p>
  if (session) return <>{children}</>

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (err) setError(err.message)
    else setSent(true)
  }

  return (
    <div className="flex min-h-[80dvh] flex-col justify-center px-2">
      <div className="mb-6 text-center">
        <span aria-hidden className="text-5xl">
          🍽️
        </span>
        <h1 className="mt-3 text-2xl font-extrabold">Memey Diet Planner</h1>
        <p className="mt-1 text-secondary text-faint">Sign in to sync across devices</p>
      </div>

      {sent ? (
        <div className="card p-5 text-center">
          <p className="text-secondary font-semibold">Link sent 📬</p>
          <p className="mt-1 text-tertiary text-muted">
            Check <strong>{email}</strong> and tap the link to sign in.
          </p>
        </div>
      ) : (
        <form onSubmit={sendLink} className="card grid gap-3 p-5">
          <label className="block">
            <span className="mb-1 block text-tertiary font-semibold">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-body outline-none focus:border-primary"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="tap rounded-pill bg-primary py-3 text-secondary font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send sign-in link'}
          </button>
          <button
            type="button"
            onClick={() => client.auth.signInWithOAuth({ provider: 'google' })}
            className="tap rounded-pill border border-line py-3 text-secondary font-semibold"
          >
            Continue with Google
          </button>
          {error && <p className="text-tertiary text-clay">{error}</p>}
        </form>
      )}
    </div>
  )
}
