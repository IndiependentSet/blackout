-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Run AFTER design_handoff_account_leaderboard/supabase-schema.sql and
-- app/sql/2026-09-07-profiles-email-privacy.sql.
--
-- Why: the leaderboard score was count(*) filter (where on_budget) — every
-- perfect clear worth exactly 1 point, regardless of the level's difficulty
-- or how close to par it was. But the game only ever lets a solved site end
-- at cats_used == par or par + 1 (PAYROLL SAYS NO blocks anything past
-- that), so "on budget" was already a fixed binary outcome per clear — the
-- one axis actually worth weighting is the level's own difficulty rating
-- (engine.js's difficulty(), 1-3 stars), with a partial-credit penalty for
-- landing one cat over instead of zero.
--
-- score = stars * 10, minus 5 per cat over par, floored at 0:
--   1-star, on budget  -> 10   1-star, +1 cat -> 5
--   2-star, on budget  -> 20   2-star, +1 cat -> 15
--   3-star, on budget  -> 30   3-star, +1 cat -> 25
-- Existing rows (if any were recorded before this migration) default to
-- stars = 1, the safe floor — they'll under-score until re-cleared, which
-- only matters if real scores were already recorded live.

alter table public.site_clears
  add column if not exists stars smallint not null default 1
    check (stars between 1 and 3);

alter table public.site_clears drop column if exists score;
alter table public.site_clears
  add column score int generated always as (
    greatest(0, stars * 10 - (cats_used - par) * 5)
  ) stored;

create or replace view public.leaderboard_alltime as
  select p.id as user_id, p.nickname,
         coalesce(sum(s.score), 0) as score
  from public.profiles p
  join public.site_clears s on s.user_id = p.id
  group by p.id, p.nickname
  order by score desc;

create or replace view public.leaderboard_weekly as
  select p.id as user_id, p.nickname,
         coalesce(sum(s.score), 0) as score
  from public.profiles p
  join public.site_clears s on s.user_id = p.id
  where s.created_at > now() - interval '7 days'
  group by p.id, p.nickname
  order by score desc;
