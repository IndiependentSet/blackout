# app/sql

Migrations for the Supabase project behind sign-in, the leaderboard, crews and
the campaign. **Nothing here is applied automatically**: there is no DB tool on
the client side, so someone with access to the project pastes each file into
the Supabase SQL editor (Database > SQL Editor), once, in order.

## Format

- File name `YYYY-MM-DD-<name>.sql`; the date is the merge date.
- Header: "Run once in the Supabase SQL editor…", which earlier files it has to
  run after, and a **Why** paragraph.
- Explicit GRANTs. Grant `update` too wherever the client upserts: Postgres
  needs UPDATE for `ON CONFLICT DO UPDATE` even when nothing conflicts
  (`2026-09-07-site-clears-upsert-grant.sql`).
- Idempotent where it is cheap (`create or replace`, `drop … if exists`,
  `if not exists`).

## Order

1. `2026-09-07-profiles-email-privacy.sql`
2. `2026-09-07-weighted-score.sql`
3. `2026-09-07-site-clears-keep-best.sql`
4. `2026-09-07-site-clears-upsert-grant.sql`
5. `2026-09-08-crew-squads.sql`
6. `2026-09-08-squad-members-upsert-grant.sql`
7. `2026-09-08-merge-nickname-username.sql`
8. `2026-10-08-base-schema.sql` — reference only, see below. Does nothing on a live project.
9. `2026-10-09-player-streaks.sql`
10. `2026-10-10-campaign-clears.sql`
11. `2026-10-11-cover-is-valid.sql` — `cover_is_valid` and `level_is_valid`, pure functions the server uses to check cats against a level. Used by the 1vs1 and survival functions below. The file's header has queries to run by hand and what each should return.
12. `2026-10-12-matches.sql` — the 1vs1 tables (RLS on, no client writes) and their Realtime publication.
13. `2026-10-12-match-rpc.sql` — every change to a match: `create_match`, `accept_match`, `decline_match`, `submit_match`, `forfeit_match`, `close_expired_matches`.
14. `2026-10-12-match-records.sql` — the `match_records` view: wins, losses and draws.
15. `2026-10-14-survival-runs.sql` — survival runs, their RPCs and `leaderboard_survival`. Needs file 11 (`submit_survival_site` calls `cover_is_valid`).
16. `2026-10-16-badges.sql` — the six badges, `player_badges`, and the triggers on `site_clears`, `campaign_clears` and `match_players` that award them. Needs files 9, 10 and 12. Badges are written only by the server; the last statement backfills players who already qualify. See "Badges" below.
17. `2026-10-18-cosmetics.sql` — the accessory catalogue, `player_cosmetics`, `player_loadout`, `set_loadout()` and a trigger on `player_badges` that unlocks accessories. Needs file 16. See "Cosmetics" below.

Files 1-7 assume the original account/leaderboard schema (profiles and
site_clears) already exists. That schema file, `design_handoff_account_leaderboard/
supabase-schema.sql`, is not in this repository.

## 1vs1 matches (files 11-14)

A match is one graph, saved in `matches.level` when the challenge is made and never regenerated, so both
players always play the same one. Everything below is decided by the server's `now()`; no client clock is
trusted.

- `pending` (an hour to be answered) → `accept_match` sets `starts_at = now() + 3 s` and `ends_at = starts_at + 5
  min` → `active` → `done` or `void`. "Countdown" and "live" are not stored: the client derives them from
  `starts_at`.
- `submit_match` keeps each player's best clear. A clear at par or better ends the match on the spot; otherwise
  the best clear wins when the clock runs out (fewest cats, then the earlier arrival).
- Expiry is lazy. `close_expired_matches()` runs inside `create_match` and the app calls it (lobby, dashboard
  count, and when a match clock hits zero). Put it on a cron if you want matches settled with nobody online.
- `forfeit_match` is always the caller giving up. There is no "opponent left" call, because the server cannot see
  presence: a player who vanishes just runs the clock out.
- Only accepted friends and squad mates can be challenged (`are_crew`, which reads `friendships` and
  `squad_members`).
- While levels come from the mock source, `create_match` takes the graph from the client and checks it
  (`level_is_valid`). A tampered client can pick a bad graph for its own match but cannot fake the result.
  When the generator service creates matches itself, drop the `p_level` parameter and set
  `level_source = 'backend'`.
- Realtime has to be enabled for the project. `2026-10-12-matches.sql` adds both tables to the
  `supabase_realtime` publication; the app relies on `postgres_changes` honouring the participant-only select
  policies.

## Badges (file 16)

Six badges, awarded by the server and shown on the ID card and on a workmate's personnel file. They are
a reward, not a currency, and the cosmetics unlock from their ids.

- The client has **no write path**: no INSERT/UPDATE/DELETE grant on `player_badges`, and `award_daily_badges`,
  `award_campaign_badges` and `award_duel_badges` are revoked from `public`, `anon` and `authenticated`. Only the
  trigger functions (which run as the owner) call them.
- A trigger function catches every error from the award functions and turns it into a `WARNING`, so a bug in
  badge logic cannot stop a clear from being saved.
- Two things are copied into the SQL because a constant cannot be shared: the seven sites of a day
  (`purrfect-shift`) and the campaign chapter bounds (`chapter-clear`, `CHAPTERS` in `domain/campaign.ts`).
  `domain/badges.test.ts` fails if the seed's ids, names, descriptions or chapter bounds drift from the client.
- `player_badges` is readable by any signed-in player (a profile shows its badges to others); `badges`, the
  catalogue, by everyone.

## Cosmetics (file 17)

Four accessories (a hard hat and a party hat for the head, a bow tie and a scarf for the neck), each unlocked by
one badge. They are cosmetic only: there is no price, no payment path, and no paywall on anything.

- The client has **no write path** to `player_cosmetics` or `player_loadout`: select-own policies and a select
  grant only. Ownership is added by the trigger on `player_badges`; wearing goes through `set_loadout(slot,
  cosmetic)`, which checks the accessory exists, belongs in that slot and is owned. A null cosmetic takes the slot's
  accessory off.
- The trigger catches its own errors and raises a `WARNING`, so it can never stop a badge from being recorded.
  The last statement of the file backfills players who already hold a badge; running the file again is safe.
- The `cosmetics` seed mirrors `COSMETICS` in `app/src/domain/cosmetics.ts` (ids, slots, labels, and the badge each
  one unlocks). Add an accessory in both.
- Apply this file after file 16: `cosmetics.unlock_badge_id` references `badges`.
- The pictures are not in the repository yet (`app/src/assets/cosmetics/README.md` has the art contract). Until
  they exist the cats are drawn bare; unlocking, wearing and saving all still work.

## `2026-10-08-base-schema.sql`

`profiles` and `site_clears` **reconstructed from the repo, not from a
production dump**. It exists so the two tables are written down somewhere, but
it guesses at foreign keys and anything else the old migrations never mention
(those spots are marked `UNVERIFIED`). Dump the real schema and diff it before
relying on it. It creates nothing if the tables already exist, so running it on
the live project is a no-op. Replaying the whole history on a fresh project is
not supported.

## Rules for new tables

The project has row level security **off** and relies on GRANTs. That stays as
it is for the existing tables. For every table added from now on:

- **RLS on, for the new table only.** Reads by policy: `user_id = auth.uid()`,
  or "I am a participant" for anything two players share.
- **Anything competitive is written through an RPC**, never by direct table
  write: a `security definer` function with `set search_path = public` that
  checks the input itself (who is calling, is the clear valid, is it in time).
  Matches, survival runs, badges and cosmetic ownership work this way. Give
  the client `grant execute` on the function and no INSERT/UPDATE/DELETE on the
  table.
- **A player's own record may be written directly** when a bad value only
  hurts that player and nothing is ranked on it. `campaign_clears` is that
  case: RLS plus an own-row policy, `select, insert, update` granted, keep-best
  in a trigger.
- A generated `score` column must use the same expression as
  `app/src/domain/scoring.ts` (`siteScore`). One mirror in the client, one in
  SQL.

## Out of scope here

`friendships` and `squad_members` have table-wide GRANTs and no RLS, so any
signed-in user can accept another player's friend request or remove another
member from a squad (flagged in `2026-09-08-crew-squads.sql`). Fixing that is a
separate task, not part of the game-modes work.
