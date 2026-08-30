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
