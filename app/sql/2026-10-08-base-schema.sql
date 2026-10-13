-- ============================================================================
-- RECONSTRUCTED FROM THE REPO, NOT FROM A PRODUCTION DUMP.
-- COMPARE WITH THE LIVE PROJECT BEFORE USING THIS FOR ANYTHING.
-- ============================================================================
--
-- Run (if at all) in the Supabase SQL editor. Not applied automatically — no DB
-- tool available client-side.
--
-- Why: the original schema file (design_handoff_account_leaderboard/
-- supabase-schema.sql, referenced by 2026-09-07-profiles-email-privacy.sql and
-- 2026-09-07-weighted-score.sql) is not in this repository, so nobody can
-- rebuild `profiles` and `site_clears` from the repo alone. This file is a
-- best-effort reference for the state those two tables are in AFTER every file
-- in this folder dated up to 2026-09-08 has run. It was written by reading
-- those files and the client queries (services/repositories/*.ts), nothing else.
--
-- What it does NOT know (marked UNVERIFIED below): foreign keys to auth.users,
-- ON DELETE behaviour, surrogate id columns, indexes, extra columns the original
-- schema may have had. Dump the real schema (Database > Schema, or
-- `supabase db dump --schema public`) and diff it against this before trusting it.
--
-- It changes nothing that exists: each table is created inside a DO block that
-- does nothing at all when the table is already there. The GRANTs sit inside the
-- same block, so on a live project they are never re-applied or widened.
--
-- Scope: the two tables only. It does not recreate the views (leaderboard_*,
-- player_scores, player_streaks) or the crew/squad tables, and replaying the
-- old migrations on a brand-new project is not supported (merge-nickname-
-- username.sql drops a `nickname` column this file never creates).

do $$
begin
  if to_regclass('public.profiles') is null then
    create table public.profiles (
      -- UNVERIFIED: production almost certainly has `references auth.users (id)`
      -- (every profile is a Supabase Auth user), possibly with ON DELETE CASCADE.
      id uuid primary key,
      -- written on sign-in by ensureProfile(); never read back for other users.
      -- UNVERIFIED: nullability and any constraint.
      email text,
      -- 2026-09-08-merge-nickname-username.sql
      username text not null unique
        constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,16}$'),
      -- 2026-09-08-crew-squads.sql
      invite_code text unique
    );

    create index profiles_username_idx on public.profiles (lower(username));

    -- 2026-09-08-merge-nickname-username.sql: email is never publicly readable.
    grant select (id, username, invite_code) on public.profiles to anon, authenticated;
    -- 2026-09-07-profiles-email-privacy.sql: "INSERT/UPDATE stay table-wide".
    grant insert, update on public.profiles to authenticated;
  end if;

  if to_regclass('public.site_clears') is null then
    create table public.site_clears (
      -- UNVERIFIED: production probably references profiles/auth.users (ON DELETE CASCADE?).
      user_id uuid not null,
      day_number int not null,
      site_index int not null,
      cats_used int not null,
      par int not null,
      on_budget boolean not null,
      -- 2026-09-07-weighted-score.sql
      stars smallint not null default 1 check (stars between 1 and 3),
      score int generated always as (
        greatest(0, stars * 10 - (cats_used - par) * 5)
      ) stored,
      created_at timestamptz not null default now(),
      -- recordClear() upserts on exactly these three columns.
      unique (user_id, day_number, site_index)
    );

    -- 2026-09-07-site-clears-keep-best.sql
    create function public.site_clears_keep_best()
    returns trigger language plpgsql as $f$
    begin
      if new.cats_used > old.cats_used then
        new.cats_used := old.cats_used;
      end if;
      new.on_budget := new.cats_used <= new.par;
      return new;
    end;
    $f$;

    create trigger trg_site_clears_keep_best
      before update on public.site_clears
      for each row execute function public.site_clears_keep_best();

    -- "the original schema only granted `select, insert` to authenticated" +
    -- 2026-09-07-site-clears-upsert-grant.sql
    grant select, insert, update on public.site_clears to authenticated;
  end if;
end $$;
