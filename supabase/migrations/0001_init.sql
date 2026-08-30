-- Memey Diet Planner — initial schema.
--
-- One row per user holding their planner document. The food and recipe
-- catalogue is bundled with the app (it comes from the workbook and is the
-- same for everyone), so only genuinely per-user data lives here.

create table if not exists public.planner_data (
  id         uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planner_data enable row level security;

-- Supabase grants these by default on the public schema, but saying it here
-- makes the migration self-sufficient and the intent explicit: the API roles
-- get table access, and RLS -- not the absence of a grant -- is what keeps one
-- user out of another's row.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema public to authenticated;
    grant select, insert, update, delete on public.planner_data to authenticated;
  end if;
  -- anon deliberately gets nothing: there is no such thing as an anonymous diary.
end $$;

-- A user may only ever touch their own row. Separate policies per command so
-- that a mistake in one cannot silently widen the others.
create policy "read own planner data"
  on public.planner_data for select
  using (auth.uid() = id);

create policy "insert own planner data"
  on public.planner_data for insert
  with check (auth.uid() = id);

create policy "update own planner data"
  on public.planner_data for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "delete own planner data"
  on public.planner_data for delete
  using (auth.uid() = id);

-- Keep updated_at honest even if a client forgets to send it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists planner_data_touch on public.planner_data;
create trigger planner_data_touch
  before update on public.planner_data
  for each row execute function public.touch_updated_at();
