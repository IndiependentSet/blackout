-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Run AFTER 2026-09-08-crew-squads.sql and 2026-09-08-squad-members-upsert-grant.sql.
--
-- Why: profiles carried two identity fields — legacy `nickname` (free text,
-- not unique, auto-derived from email) and `username` (the crew handle,
-- unique, [a-z0-9_] 3-16). Two fields meant two different display names for
-- the same person depending which view/screen read which column (global
-- leaderboard read nickname, crew board read username) — confusing, not a
-- bug, but not worth keeping. Collapsing onto one: `username` wins, because
-- uniqueness is a hard requirement for crew search-by-handle and nickname
-- never had it.
--
-- Existing profiles without a username yet get one backfilled from their
-- nickname (lowercased, sanitized to the handle charset, truncated to 11
-- chars + an 4-char id-derived suffix so it can't collide). This does NOT
-- touch profiles that already have a username set — if that value is wrong
-- for some reason (e.g. someone claimed the wrong handle while testing),
-- fix it after this migration the normal way (the account screen's handle
-- editor), not by re-running this file.

-- 1) Backfill username for every profile that doesn't have one yet.
update public.profiles
set username = left(lower(regexp_replace(coalesce(nickname, 'staff'), '[^a-zA-Z0-9]+', '_', 'g')), 11)
  || '_' || substr(id::text, 1, 4)
where username is null;

-- 2) Repoint the views that read nickname onto username, BEFORE dropping
--    the column (Postgres refuses to drop a column a view still selects).
--    leaderboard_alltime/weekly's output column was literally named
--    `nickname` — CREATE OR REPLACE VIEW can't rename an existing output
--    column (42P16), so these two need a real drop first. Dropping loses
--    their GRANTs (tied to the view's own row, not its name), reapplied
--    right after create.
drop view if exists public.leaderboard_alltime;
create view public.leaderboard_alltime as
  select p.id as user_id, p.username,
         coalesce(sum(s.score), 0) as score
  from public.profiles p
  join public.site_clears s on s.user_id = p.id
  group by p.id, p.username
  order by score desc;
grant select on public.leaderboard_alltime to anon, authenticated;

drop view if exists public.leaderboard_weekly;
create view public.leaderboard_weekly as
  select p.id as user_id, p.username,
         coalesce(sum(s.score), 0) as score
  from public.profiles p
  join public.site_clears s on s.user_id = p.id
  where s.created_at > now() - interval '7 days'
  group by p.id, p.username
  order by score desc;
grant select on public.leaderboard_weekly to anon, authenticated;

-- player_scores' output column names (user_id, name, score, week_score)
-- aren't changing, only the expression behind `name` — plain REPLACE is fine.
create or replace view public.player_scores as
  select p.id as user_id,
         p.username as name,
         coalesce(sum(s.score), 0) as score,
         coalesce(sum(s.score) filter (where s.created_at > now() - interval '7 days'), 0) as week_score
  from public.profiles p
  left join public.site_clears s on s.user_id = p.id
  group by p.id, p.username;

-- 3) Lock the column down: always present, always handle-shaped.
alter table public.profiles alter column username set not null;
alter table public.profiles add constraint profiles_username_format
  check (username ~ '^[a-z0-9_]{3,16}$');

-- 4) Public SELECT grant narrows — nickname is gone.
revoke select on public.profiles from anon, authenticated;
grant select (id, username, invite_code) on public.profiles to anon, authenticated;

-- 5) Drop the now-unused column.
alter table public.profiles drop column nickname;
