#!/usr/bin/env bash
# Apply the migrations in app/sql/ to a Postgres database, once each, in
# filename order, recording each in ops.schema_migrations.
#
#   DATABASE_URL=postgresql://… app/tools/migrate.sh [--baseline FILE] [--check-only]
#
#   --baseline FILE  record the migrations FILE lists as already applied
#                    (they were run by hand before tracking began) without
#                    running them
#   --check-only     print the pending migrations, one per line, and change
#                    nothing; prints nothing when the database is up to date
#
# Each migration runs in its own transaction together with the row that
# records it, so a migration is either fully applied and recorded or not at
# all; the run stops at the first failure. A migration that has been applied
# must never be edited: if its checksum no longer matches, the run fails.
# See app/sql/README.md.
set -euo pipefail

SQL_DIR="$(cd "$(dirname "$0")/../sql" && pwd)"
NAME_RE='^[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+\.sql$'
LOCK_KEY=7290431          # pg_advisory_lock key: one runner at a time

baseline=""
check_only=0
while [ $# -gt 0 ]; do
  case "$1" in
    --baseline) baseline="${2:?--baseline needs a file}"; shift 2 ;;
    --check-only) check_only=1; shift ;;
    -h|--help) sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done
: "${DATABASE_URL:?DATABASE_URL is not set}"

say() { echo "$@" >&2; }
die() { say "error: $*"; exit 1; }
psql_() { psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }
sha() { sha256sum "$1" | cut -d' ' -f1; }

# ---- the migrations on disk -------------------------------------------------
files=()
for path in "$SQL_DIR"/[0-9]*.sql; do
  [ -e "$path" ] || continue
  name="$(basename "$path")"
  [[ "$name" =~ $NAME_RE ]] || die "$name: migration names are YYYY-MM-DD-lowercase-words.sql"
  # the runner owns the transaction; a migration that commits halfway would
  # leave itself half applied and unrecorded
  # (plpgsql's own `begin` has no semicolon, and its `end;` is left alone)
  if grep -qiE '^[[:space:]]*(begin|commit|rollback|start[[:space:]]+transaction)[[:space:]]*;' "$path"; then
    die "$name: don't put transaction statements in a migration (each one already runs in its own transaction)"
  fi
  files+=("$name")
done
[ ${#files[@]} -gt 0 ] || die "no migrations in $SQL_DIR"

baselined=()
if [ -n "$baseline" ]; then
  [ -f "$baseline" ] || die "baseline file $baseline not found"
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"; line="$(echo "$line" | tr -d '[:space:]')"
    [ -n "$line" ] || continue
    [ -f "$SQL_DIR/$line" ] || die "baseline lists $line, which isn't in $SQL_DIR"
    baselined+=("$line")
  done < "$baseline"
fi

# ---- the tracking table -----------------------------------------------------
# Its own schema, which Supabase's API doesn't expose; the client roles are
# shut out of it explicitly where they exist (Supabase grants them a lot by
# default).
if [ $check_only -eq 0 ]; then
  psql_ --single-transaction -v lock="$LOCK_KEY" <<'SQL'
set client_min_messages = warning;
select pg_advisory_xact_lock(:lock);
create schema if not exists ops;
create table if not exists ops.schema_migrations (
  filename text primary key,
  sha256 text not null,
  how text not null check (how in ('applied', 'baseline')),
  applied_at timestamptz not null default now()
);
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on schema ops from %I', r);
      execute format('revoke all on all tables in schema ops from %I', r);
    end if;
  end loop;
end $$;
SQL
fi

# What the database has recorded: "filename sha256" per line (nothing yet if
# the table doesn't exist, which only --check-only can see).
recorded=""
if [ "$(psql_ -t -A -c "select to_regclass('ops.schema_migrations') is not null")" = "t" ]; then
  recorded="$(psql_ -t -A -F ' ' -c "select filename, sha256 from ops.schema_migrations")"
fi
recorded_sha() { awk -v f="$1" '$1 == f { print $2 }' <<<"$recorded"; }

# ---- applied migrations must not have changed -------------------------------
for name in "${files[@]}"; do
  want="$(recorded_sha "$name")"
  if [ -n "$want" ] && [ "$want" != "$(sha "$SQL_DIR/$name")" ]; then
    die "$name was applied, then edited. Put the change in a new migration instead (and restore this file)."
  fi
done

is_baselined() { local b; for b in "${baselined[@]+"${baselined[@]}"}"; do [ "$b" = "$1" ] && return 0; done; return 1; }

if [ $check_only -eq 1 ]; then
  for name in "${files[@]}"; do
    [ -z "$(recorded_sha "$name")" ] && ! is_baselined "$name" && echo "$name"
  done
  exit 0
fi

# ---- apply ------------------------------------------------------------------
# One session holds the lock for the whole run; each migration is re-checked
# under it, so two runners can't both apply the same file.
q() { printf "'%s'" "${1//\'/\'\'}"; }
script="$(mktemp)"
trap 'rm -f "$script"' EXIT
{
  echo "set client_min_messages = warning;"
  echo "select pg_advisory_lock($LOCK_KEY);"
  for name in "${baselined[@]+"${baselined[@]}"}"; do
    echo "select not exists (select 1 from ops.schema_migrations where filename = $(q "$name")) as todo \\gset"
    echo "\\if :todo"
    echo "insert into ops.schema_migrations (filename, sha256, how) values ($(q "$name"), $(q "$(sha "$SQL_DIR/$name")"), 'baseline');"
    echo "\\echo 'baselined        $name'"
    echo "\\endif"
  done
  for name in "${files[@]}"; do
    is_baselined "$name" && continue
    echo "select not exists (select 1 from ops.schema_migrations where filename = $(q "$name")) as todo \\gset"
    echo "\\if :todo"
    echo "\\echo 'applying         $name'"
    echo "begin;"
    echo "\\i $(q "$SQL_DIR/$name")"
    echo "insert into ops.schema_migrations (filename, sha256, how) values ($(q "$name"), $(q "$(sha "$SQL_DIR/$name")"), 'applied');"
    echo "commit;"
    echo "\\echo 'applied          $name'"
    echo "\\else"
    echo "\\echo 'already applied  $name'"
    echo "\\endif"
  done
  echo "select pg_advisory_unlock($LOCK_KEY);"
} > "$script"

# \echo lines (the progress) go to stdout; query results go nowhere
psql_ -t -A -o /dev/null -f "$script" \
  || die "a migration failed: it was rolled back, and nothing after it ran"
say "up to date: $(psql_ -t -A -c "select count(*) from ops.schema_migrations") migrations recorded"
