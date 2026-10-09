#!/usr/bin/env bash
# A local Supabase (Docker) for this project, with the schema from app/sql/.
#
#   tools/db-local.sh up            start the stack, load the schema, write app/.env.local
#   tools/db-local.sh down          stop it
#   tools/db-local.sh reset         wipe the database and load the schema again
#   tools/db-local.sh seed          test players (boss = admin, alice and bob = friends) and the
#                                   three default level pools, published; safe to repeat
#   tools/db-local.sh pools [MODE…] publish the default pools again, as a new version
#   tools/db-local.sh login NAME    a one-click sign-in link for admin, alice or bob
#   tools/db-local.sh dev           everything: up, seed, then the dev server
#   tools/db-local.sh admin NAME    make the player with that username an admin
#   tools/db-local.sh psql [ARGS]   a psql on the local database
#
# Needs Docker (running) and psql (macOS: brew install libpq, then add its bin to PATH).
# Sign-in emails land in Mailpit, http://127.0.0.1:55324. Studio: http://127.0.0.1:55323.
# Ports 55320-55324 (see supabase/config.toml); a stack on the defaults (54321…) is left alone.
set -euo pipefail

cd "$(dirname "$0")/.."
DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:55322/postgres}"
export DATABASE_URL
sb() { npx --yes supabase "$@"; }
sql() { psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

need() {
  command -v docker >/dev/null || { echo "Docker is not installed: https://docs.docker.com/get-docker/" >&2; exit 1; }
  docker info >/dev/null 2>&1 || { echo "Docker is not running: start Docker Desktop and try again" >&2; exit 1; }
  command -v psql >/dev/null || { echo "psql is missing: brew install libpq, then add \$(brew --prefix libpq)/bin to PATH" >&2; exit 1; }
}

# Refuse to start if one of our ports is taken, and say by what, instead of letting the CLI fail half-way.
check_ports() {
  # our own stack already holds them: running `up` again is fine
  docker ps --format '{{.Names}}' | grep -qx supabase_db_blackout && return 0
  local busy=""
  for p in 55320 55321 55322 55323 55324 5180; do
    if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then busy="$busy $p"; fi
  done
  [ -z "$busy" ] && return 0
  echo "port(s)$busy already in use:" >&2
  docker ps --format '  {{.Names}}  {{.Ports}}' | grep -E "55(32[0-4])->" >&2 || lsof -nP -iTCP -sTCP:LISTEN | grep -E ":(55(32[0-4])|5180) " >&2 || true
  echo "stop that stack, or change the ports in supabase/config.toml (and DATABASE_URL in this file)." >&2
  exit 1
}

load_schema() {
  # the original schema the first migrations build on, then every migration in order
  if [ "$(sql -tA -c "select to_regclass('public.profiles') is not null")" != "t" ]; then
    sql -f sql/ci/handoff-schema.sql
  fi
  tools/migrate.sh
}

write_env() {
  local api anon
  api="$(sb status -o env | sed -n 's/^API_URL="\(.*\)"$/\1/p')"
  anon="$(sb status -o env | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')"
  [ -n "$api" ] && [ -n "$anon" ] || { echo "could not read the local API url and anon key from 'supabase status'" >&2; exit 1; }
  # VITE_APP_BASE_URL is where sign-in emails send the player back: it has to be this app's dev port,
  # or the link opens whatever else is on the port .env names (another app's dev server).
  printf 'VITE_SUPABASE_URL=%s\nVITE_SUPABASE_ANON_KEY=%s\nVITE_APP_BASE_URL=http://localhost:5180\n' "$api" "$anon" > .env.local
  echo "wrote app/.env.local (git-ignored; delete it to point the app back at .env)"
}

case "${1:-up}" in
  up)
    need
    check_ports
    sb start
    load_schema
    write_env
    echo "ready: npm run local:seed for test players and level pools, then npm run dev"
    ;;
  seed) npx --yes tsx tools/local.ts seed ;;
  pools) shift; npx --yes tsx tools/local.ts pools "$@" ;;
  login) npx --yes tsx tools/local.ts login "${2:-alice}" ;;
  dev)
    "$0" up
    "$0" seed
    echo
    echo "sign in links:  npm run local:login -- alice   (or bob, admin)"
    echo "admin pages:    http://localhost:5180/pools.html  /generation.html  /playground.html"
    exec npm run dev
    ;;
  down) sb stop ;;
  reset)
    need
    sb db reset
    load_schema
    ;;
  admin)
    name="${2:?usage: tools/db-local.sh admin USERNAME}"
    sql -v name="$name" -c "insert into public.admins (user_id) select id from public.profiles where lower(username) = lower(:'name') on conflict do nothing"
    n="$(sql -v name="$name" -tA -c "select count(*) from public.admins a join public.profiles p on p.id = a.user_id where lower(p.username) = lower(:'name')")"
    [ "$n" = "1" ] && echo "$name is an admin" || { echo "no player called $name: sign in and pick a username first" >&2; exit 1; }
    ;;
  psql) shift; psql "$DATABASE_URL" "$@" ;;
  *) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
