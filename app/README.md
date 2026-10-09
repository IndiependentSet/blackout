# CATASTROPHE INC. — the app

React 19 + Vite + TypeScript (strict), CSS Modules, Supabase for sign-in, the
leaderboard, crews, level pools and 1vs1. The architecture and the house rules
are in [`../CLAUDE.md`](../CLAUDE.md).

## Getting started

```sh
cd app
npm install
npm run dev        # http://localhost:5180
```

Without a backend the app still runs: the daily shift plays from the default
generation schedule. Sign-in, the leaderboard, the campaign, survival and 1vs1
need a Supabase project (see below).

To point the app at a Supabase project, copy `.env.example` to `.env` and fill
in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Everything on your machine (local Supabase)

You don't need the real project to develop: one command starts a complete
local Supabase, loads the schema, creates test data and runs the app.

**You need** Docker (running) and `psql` (macOS: `brew install libpq`, then add
`$(brew --prefix libpq)/bin` to your `PATH`). The first run downloads the
Docker images, which takes a few minutes.

```sh
npm run local
```

That:

1. starts Supabase in Docker (Postgres, API, Auth, Realtime, Studio) from
   [`supabase/config.toml`](supabase/config.toml);
2. loads the original schema and every migration in [`sql/`](sql/README.md),
   the same way CI and production do;
3. writes `.env.local` (git-ignored) so the app talks to the local stack;
4. creates test players and publishes the three level pools
   ([`tools/local.ts`](tools/local.ts));
5. starts the dev server on <http://localhost:5180>.

### Test players

| Player | Email | Role |
|---|---|---|
| `boss` | `admin@local.test` | admin: can open the admin pages |
| `alice` | `alice@local.test` | player, friends with bob |
| `bob` | `bob@local.test` | player, friends with alice |

The app signs in with a magic link. Get one without opening a mailbox:

```sh
npm run local:login -- alice      # or bob, admin
```

Open the link it prints. For 1vs1, sign in as Alice in one browser and as Bob in
another (a private window works). Sign-in emails also land in Mailpit at
<http://127.0.0.1:55324>.

### Other local commands

| Command | What it does |
|---|---|
| `npm run local:seed` | Create the test data again (safe to repeat; published pools are kept) |
| `npm run local:pools` | Publish the default level pools again as a new version. Name modes to limit it: `-- survival` |
| `npm run db:reset` | Wipe the local database and rebuild it from `sql/` |
| `npm run db:down` | Stop the stack |
| `npm run db:up` | Start the stack and load the schema, without the test data or the dev server |
| `npm run db:admin -- <username>` | Make your own account an admin |
| `npm run db:psql` | Open `psql` on the local database |

Local services: API <http://127.0.0.1:55321>, Studio
<http://127.0.0.1:55323>, Postgres `127.0.0.1:55322`. Delete `.env.local` to point
the app back at `.env`.

### Admin pages

Reachable as `boss` (or any account made admin):

- `/pools.html` — the curve each mode's levels are generated from; generate,
  play-test and publish a level pool (campaign, survival, 1vs1);
- `/generation.html` — the daily week's generation schedule;
- `/playground.html` — the generator with every rule exposed.

## Checks

```sh
npm run check      # lint (oxlint) + tsc + Vitest + build; must be green
npm run lint
npm run test:watch
```

Tests never touch a server: the level source is swapped for the fixed mock maps
(`src/test/setup.ts`).

## Database

Every schema change is a migration in [`sql/`](sql/README.md); merging one to
`main` applies it to production. The same migrations build the local database,
so a migration that works locally is the one that ships. CI replays them all on
a throwaway Postgres and runs the checks in `sql/ci/checks/`.

## Troubleshooting

- **"Docker is not running"** — start Docker Desktop and run the command again.
- **"psql is missing"** — `brew install libpq`, then add its `bin` folder to `PATH`.
- **Login opens another app** — the dev server must be on port 5180: auth emails
  link back to it. If another project (say Ohana on 5173) owns that port, `npm run dev`
  fails with a message. Stop the other one, or change the port in `vite.config.ts`,
  `supabase/config.toml` (`site_url`, `additional_redirect_urls`) and `tools/local.ts`.
- **"port(s) … already in use"** — the check names what holds them. Usually it's
  another local Supabase project on the default ports, or an earlier run of this
  stack (`npm run db:down`). This stack uses 55320–55324, so it runs next to a
  project on the defaults (54321–54327). To move it, change `supabase/config.toml`
  and `DATABASE_URL` in `tools/db-local.sh`.
- **Start over** — `npm run db:reset` then `npm run local:seed`.
