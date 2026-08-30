/** @type {import('next').NextConfig} */
/*
 * The Vercel–Supabase integration injects SUPABASE_URL and SUPABASE_ANON_KEY
 * without the NEXT_PUBLIC_ prefix, which keeps them server-only — and this app
 * is client-rendered, so the browser sees nothing and silently falls back to
 * local storage. Accept either spelling and publish the public one.
 *
 * Only the anon key is mapped, and deliberately so: it is designed to ship in
 * the browser, with row-level security doing the constraining. A service-role
 * key bypasses RLS entirely, so the assertion below refuses to build if one
 * ever reaches this object — silently publishing it would expose every diary.
 */
const publicSupabaseEnv = {
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '',
  // Separate from the credentials on purpose: see src/lib/store/supabase.ts.
  NEXT_PUBLIC_ENABLE_ACCOUNTS: process.env.NEXT_PUBLIC_ENABLE_ACCOUNTS ?? '',
}

/*
 * Say out loud, in the build log, which mode this build will run in.
 *
 * Without this the failure is silent and indistinguishable from success: a
 * build with no credentials produces a perfectly working app that quietly
 * stores everything in one browser, and nobody discovers accounts are off
 * until two people share a diary. This turning up in the Vercel log is the
 * difference between a one-minute fix and an afternoon.
 */
{
  const url = publicSupabaseEnv.NEXT_PUBLIC_SUPABASE_URL
  const key = publicSupabaseEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const on = publicSupabaseEnv.NEXT_PUBLIC_ENABLE_ACCOUNTS === '1'
  if (url && key && !on) {
    const ref = url.replace(/^https?:\/\//, '').split('.')[0]
    console.log(
      `\n  Supabase: PAUSED — project ${ref} is configured but accounts are off.` +
        '\n  No sign-in wall; data stays in the browser. Set' +
        '\n  NEXT_PUBLIC_ENABLE_ACCOUNTS=1 to switch accounts on.\n'
    )
  } else if (url && key) {
    const ref = url.replace(/^https?:\/\//, '').split('.')[0]
    console.log(`\n  Supabase: ON — project ${ref}. Accounts and sync are live.\n`)
  } else {
    const missing = [!url && 'URL', !key && 'ANON_KEY'].filter(Boolean).join(' and ')
    console.log(
      `\n  Supabase: OFF — no ${missing}. The app will build and run fine, but it` +
        '\n  stores data in one browser with no accounts and no sync.' +
        '\n  Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY' +
        '\n  (or SUPABASE_URL / SUPABASE_ANON_KEY) and rebuild.\n'
    )
  }
}

for (const [name, value] of Object.entries(publicSupabaseEnv)) {
  if (value && value === process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      `Refusing to build: ${name} holds the service-role key, which bypasses ` +
        'row-level security. Use the anon key.'
    )
  }
}

const nextConfig = {
  reactStrictMode: true,
  env: publicSupabaseEnv,
  async headers() {
    return [
      {
        // The service worker must not be cached, or updates never reach installed apps.
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ]
  },
}
export default nextConfig
