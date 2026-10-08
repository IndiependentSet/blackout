# Database migrations

Every change to the Supabase schema is a `.sql` file here. Merging one to
`main` applies it to production automatically. Nobody pastes SQL into the
dashboard any more.

## How it works

- `app/tools/migrate.sh` runs every `YYYY-MM-DD-name.sql` in this folder that
  the database hasn't recorded yet, **in filename order**, each in its own
  transaction together with the row that records it in `ops.schema_migrations`.
  It stops at the first failure: the failed file is rolled back and nothing
  after it runs. Fix it in a follow-up PR and the next merge picks up where it
  stopped.
- **On every PR**, the `migrations` job in `.github/workflows/ci.yml` replays
  every migration from the first onto a throwaway Postgres
  (`ci/supabase-stub.sql` stands in for what Supabase provides and for the
  original schema the first files built on), runs the tool a second time to
  show it has nothing left to do, then runs the checks in `ci/checks/`.
- **On merge to `main`**, `.github/workflows/migrate.yml` applies whatever is
  new to production. It also runs on demand: Actions → migrate → Run workflow.
- `BASELINE` lists the migrations that were run by hand in the SQL editor
  before any of this existed. Production records them as applied without
  running them again (some, like the nickname → username merge, can't safely
  run twice). Never add anything else to it.

## Adding a migration

1. Add `app/sql/YYYY-MM-DD-what-it-does.sql` (lowercase, hyphens). The date
   prefix decides the order, so use today's date; if two land on the same
   day, the rest of the name breaks the tie alphabetically.
2. Write it so it would survive running twice where you can (`if not exists`,
   `create or replace`, `drop … if exists`). The tool won't run it twice, but
   it makes a hand-applied hotfix harmless.
3. No `begin`/`commit` in the file: it already runs in a transaction. That
   also rules out what can't run in one (`create index concurrently`,
   `alter type … add value` before PG 12, `vacuum`).
4. If it needs something of production that `ci/supabase-stub.sql` doesn't
   have, add that to the stub. For behaviour worth guarding (who may read or
   write what), add a check to `ci/checks/`. Checks are plain SQL that raise
   an exception when something is wrong, and can act as a user with
   `set local role authenticated; set local request.uid = '…';`.
5. **Never edit a migration once it has merged.** The tool keeps each file's
   checksum and refuses to run if an applied one has changed. Put the fix in a
   new migration.

RLS is off project-wide. Access control is GRANTs plus `security definer`
functions, and every migration that adds a table or function should say who
may do what with it.

## Running it yourself

```sh
# what would run (changes nothing)
DATABASE_URL=postgresql://… app/tools/migrate.sh --baseline app/sql/BASELINE --check-only

# a local Postgres, from scratch, the way CI does it
psql "$DATABASE_URL" -f app/sql/ci/supabase-stub.sql
DATABASE_URL=… app/tools/migrate.sh
```

Never load `ci/supabase-stub.sql` into a real Supabase project.

## One-time setup

The production job needs one secret:

1. In Supabase: **Connect** → **Session pooler** → copy the URI (it looks like
   `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres`)
   and fill in the database password. Use the session pooler, not the direct
   connection: GitHub's runners only speak IPv4, and the direct host is IPv6.
2. In GitHub: **Settings** → **Environments** → **New environment**, name it
   `production`, then **Add environment secret** `SUPABASE_DB_URL` with that
   URI. Optionally add yourself as a required reviewer there, so each
   production migration waits for your click.

Until the secret is set, the migrate job fails with a message saying so, and
nothing is applied.
