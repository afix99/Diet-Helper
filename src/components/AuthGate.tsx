'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabaseClient, supabaseConfigured } from '@/lib/store'
import { Emoji } from './Emoji'

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
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
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

  /**
   * Password rather than a magic link.
   *
   * Supabase's built-in email service is a testing facility capped at a couple
   * of messages an hour for the whole project, so magic links dead-ended on
   * "email rate limit exceeded" the first time anyone tried to sign in on a
   * second device. A password needs no email at all, which for an app used by
   * one or two people is both simpler and more reliable than running an SMTP
   * provider to deliver one link a month.
   */
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const fn = mode === 'signup' ? 'signUp' : 'signInWithPassword'

    /*
     * Supabase's client has no request timeout, so on a weak connection the
     * promise simply never settles and the button sits disabled on "Just a
     * moment…" forever, with nothing to tell you it has given up. Losing signal
     * is an ordinary event for an app used at a hawker stall.
     */
    const TIMEOUT_MS = 15000
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), TIMEOUT_MS)
    })
    const result = await Promise.race([client.auth[fn]({ email, password }), timeout])
    clearTimeout(timer)
    setBusy(false)

    if (result === 'timeout') {
      setError("Couldn't reach the server. Check your connection and try again.")
      return
    }
    const { error: err } = result
    if (!err) return // onAuthStateChange swaps the wall for the app

    // Supabase's raw messages are accurate but unhelpful to a person.
    const m = err.message.toLowerCase()
    if (m.includes('failed to fetch') || m.includes('network') || m.includes('load failed')) {
      // What a dropped connection actually surfaces as. "Failed to fetch" is
      // the browser talking to itself; it tells someone on a train nothing.
      setError("Couldn't reach the server. Check your connection and try again.")
    } else if (m.includes('rate limit')) {
      setError('Too many attempts just now. Wait a minute and try again.')
    } else if (m.includes('invalid login credentials')) {
      setError(
        mode === 'signin'
          ? "That email and password don't match. If you haven't made an account yet, tap Create one."
          : err.message
      )
    } else if (m.includes('already registered') || m.includes('already been registered')) {
      setError('That email already has an account. Switch to Sign in.')
    } else if (m.includes('password should be')) {
      setError('Passwords need at least 6 characters.')
    } else if (m.includes('confirm')) {
      setError(
        'This project still requires email confirmation. Turn it off in Supabase under ' +
          'Authentication → Sign In / Providers → Email, then try again.'
      )
    } else {
      setError(err.message)
    }
  }

  return (
    <div className="flex min-h-[80dvh] flex-col justify-center px-2">
      <div className="mb-6 text-center">
        <Emoji name="bowl" size={56} />
        <h1 className="mt-3 text-2xl font-extrabold">Memey Diet Planner</h1>
        <p className="mt-1 text-secondary text-faint">Sign in to sync across devices</p>
      </div>

      <form onSubmit={submit} className="card grid gap-3 p-5">
        <label className="block">
          <span className="mb-1 block text-tertiary font-semibold">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-body outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-tertiary font-semibold">Password</span>
          <input
            type="password"
            required
            minLength={6}
            /* Tells a password manager to offer a new password on sign-up and
               the saved one on sign-in, rather than guessing wrong at both. */
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-body outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="tap rounded-pill bg-primary py-3 text-secondary font-bold text-on-primary disabled:opacity-50"
        >
          {busy ? 'Just a moment…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
        {error && <p className="text-tertiary leading-relaxed text-clay">{error}</p>}
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
          }}
          className="tap text-tertiary font-semibold text-muted"
        >
          {mode === 'signin' ? (
            <>
              First time here? <span className="text-primary-ink">Create one</span>
            </>
          ) : (
            <>
              Already have an account? <span className="text-primary-ink">Sign in</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}
