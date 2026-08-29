# Turning on accounts and sync

Without this, the app stores everything in one browser under a single key. Two
people on the same phone share one diary; two people on different phones each
get their own, and neither syncs anywhere. That is fine for one person on one
device and wrong for anything else.

The code for accounts is already written. Switching it on is four steps, and
three of them need your login, so they are yours to do — I have no way to create
a Supabase project or set a Vercel environment variable on your behalf.

---

## 1. Create the Supabase project

<https://supabase.com> → **New project**. The free tier is enough: this app
stores one small JSON row per person.

Pick a region near you — Singapore is the closest to Malaysia.

## 2. Run the migration

In the project, open **SQL Editor** → **New query**, paste the whole of
`supabase/migrations/0001_init.sql` from this repo, and run it.

That creates one table, `planner_data`, with one row per user, turns on
row-level security, and adds four policies — read, insert, update, delete —
each gated on `auth.uid() = id`.

To confirm the isolation really holds rather than taking my word for it:

```bash
./scripts/verify-rls.sh
```

It stands up a throwaway Postgres, applies this exact migration, creates two
users, and tries to make one read, overwrite, delete and forge the other's
diary. All seven attempts must fail.

## 3. Set two environment variables on Vercel

Supabase → **Settings → API**. Copy:

| Vercel variable | Supabase field |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |

Vercel → project → **Settings → Environment Variables**. Add both to
**Production**, **Preview** and **Development**.

**Use the `anon` key, never the `service_role` key.** The anon key is meant to
be public and ships inside the browser bundle; it is safe precisely because RLS
constrains it. The `service_role` key bypasses RLS entirely and would let anyone
holding it read every diary in the database. It must never appear in a
`NEXT_PUBLIC_` variable, in this repo, or in a chat message.

## 4. Redeploy

Environment variables are read at build time, so the running deployment will not
pick them up. Vercel → **Deployments** → the latest one → **Redeploy**.

---

## What changes once it is on

- A sign-in wall appears. Sign-in is a magic link by email, or Google.
- Settings switches from *"Saved in this browser only"* to *"Saved to your
  account and synced across devices"*, and gains a **Sign out** button.
- Each account gets its own row. Postgres enforces the separation, so a bug in
  the app cannot leak one diary into another.

**Your existing diary comes with you.** The first time you sign in, if the
account has no data yet but this browser does, the app adopts what is already
here rather than starting you empty. The local copy is left in place, so a
failed upload cannot leave you with nothing.

## What it does not fix

A shared browser is still a shared session until someone signs out. If two
people use one phone, the second has to sign the first out — the app cannot tell
them apart on its own.
