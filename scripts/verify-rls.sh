#!/usr/bin/env bash
# Proves the row-level security policies actually isolate one user from another,
# against a real Postgres rather than by reading the SQL and hoping.
#
# The policies are the only thing standing between two people's food diaries, so
# "the SQL looks right" is not a good enough standard. Run this after any change
# to supabase/migrations/.
#
#   ./scripts/verify-rls.sh
#
# Needs the postgres server binaries locally (postgresql-16 or newer).
set -euo pipefail

PGBIN=${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | tail -1)}
DATA=$(mktemp -d)
PORT=${PORT:-55432}
SOCK=$(mktemp -d)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cleanup() {
  su postgres -c "$PGBIN/pg_ctl -D $DATA stop -m immediate" >/dev/null 2>&1 || true
  rm -rf "$DATA" "$SOCK"
}
trap cleanup EXIT

chown postgres:postgres "$DATA" "$SOCK"
su postgres -c "$PGBIN/initdb -D $DATA -A trust -U postgres" >/dev/null
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-p $PORT -k $SOCK' -l $DATA/log start" >/dev/null
for _ in $(seq 1 20); do psql -h "$SOCK" -p "$PORT" -U postgres -c 'select 1' >/dev/null 2>&1 && break; sleep 0.5; done

Q() { psql -h "$SOCK" -p "$PORT" -U postgres -Atc "$1"; }

# The pieces of Supabase the migration leans on.
Q "create schema auth;
   create table auth.users (id uuid primary key, email text);
   create function auth.uid() returns uuid language sql stable as \$\$
     select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid \$\$;
   create role authenticated nologin;" >/dev/null

psql -q -h "$SOCK" -p "$PORT" -U postgres -f "$ROOT/supabase/migrations/0001_init.sql" >/dev/null

A=11111111-1111-1111-1111-111111111111
B=22222222-2222-2222-2222-222222222222
Q "insert into auth.users values ('$A','a@x'),('$B','b@x');" >/dev/null

# Each user writes their own row, as the API role rather than the table owner.
as_user() {
  psql -h "$SOCK" -p "$PORT" -U postgres -Atc \
    "set role authenticated; set request.jwt.claim.sub='$1'; $2" 2>&1 | grep -v '^SET$' | tail -1
}
as_user "$A" "insert into public.planner_data (id,data) values ('$A','{\"who\":\"a\"}');" >/dev/null
as_user "$B" "insert into public.planner_data (id,data) values ('$B','{\"who\":\"b\"}');" >/dev/null

fails=0
check() { if [ "$2" = "$3" ]; then echo "  ok   $1"; else echo "  FAIL $1 (got '$2', want '$3')"; fails=$((fails+1)); fi; }

check "B sees only their own row"        "$(as_user "$B" 'select count(*) from public.planner_data;')" "1"
check "B cannot read A's row"            "$(as_user "$B" "select count(*) from public.planner_data where id='$A';")" "0"
check "B cannot update A's row"          "$(as_user "$B" "update public.planner_data set data='{}' where id='$A';")" "UPDATE 0"
check "B cannot delete A's row"          "$(as_user "$B" "delete from public.planner_data where id='$A';")" "DELETE 0"
check "B cannot forge a row as A"        "$(as_user "$B" "insert into public.planner_data (id,data) values ('$A','{}');" | grep -c 'violates row-level security')" "1"
check "A's diary survived all of that"   "$(as_user "$A" "select data->>'who' from public.planner_data;")" "a"
check "signed out sees nothing"          "$(as_user "" 'select count(*) from public.planner_data;')" "0"

echo
if [ "$fails" -eq 0 ]; then echo "RLS holds: users are isolated."; else echo "$fails RLS CHECK(S) FAILED"; exit 1; fi
