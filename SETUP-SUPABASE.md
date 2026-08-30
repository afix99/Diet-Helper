# Turning on accounts and sync

**Accounts are currently off.** The Supabase project exists, its table and
policies are in place and verified, and the credentials are in Vercel — but
`NEXT_PUBLIC_ENABLE_ACCOUNTS` is unset, so the app runs on browser storage with
no sign-in wall.

To switch accounts on: set `NEXT_PUBLIC_ENABLE_ACCOUNTS=1` in Vercel →
Settings → Environments → Production, and redeploy. To switch them back off,
delete that one variable. Nothing else has to change, and no credentials need
re-entering.

Before turning it on, do this in Supabase or sign-up will fail: Authentication →
Sign In / Providers → Email → turn **Confirm email** off. Sign-in uses a
password, and leaving confirmation on makes sign-up send an email through
Supabase's built-in service, which is capped at roughly two messages an hour for
the whole project — the "email rate limit exceeded" that stopped us before.

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

**If you created the project through Vercel's Supabase integration**, check
Vercel → **Settings → Environment Variables** first. The integration sometimes
adds `SUPABASE_URL` and `SUPABASE_ANON_KEY` for you, and `next.config.mjs`
accepts either spelling — so if they are already there, skip to step 4 and just
redeploy. If the list is empty, carry on below.

Supabase → **Settings → API**. Copy:

| Vercel variable | Supabase field |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |

(`SUPABASE_URL` and `SUPABASE_ANON_KEY` work too — the build maps them.)

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


## Sign-in

Password, not magic link. Supabase's built-in email service is capped at roughly
two messages an hour for the whole project, so magic links fail with "email rate
limit exceeded" the first time you sign in on a second device.

Turn off Authentication → Sign In / Providers → Email → **Confirm email**, or
sign-up will try to send a confirmation and hit the same limit.
