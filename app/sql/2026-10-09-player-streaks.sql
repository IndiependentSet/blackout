-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Run AFTER 2026-09-08-merge-nickname-username.sql (needs site_clears).
--
-- Why: the dashboard and the staff ID card show a daily streak. It is derived
-- from site_clears, not stored, so there is nothing to keep in sync and a
-- player's existing history counts from day one.
--
-- A day counts when the player cleared at least one site that day (on budget
-- or not). Consecutive day_numbers form a run (gaps-and-islands: day_number
-- minus its rank is constant inside a run).
--   current_streak  the run that ends today or yesterday, else 0. Yesterday
--                   still counts so the streak is not lost until the day
--                   actually passes without a clear.
--   best_streak     the longest run ever.
--   last_day        the most recent day with a clear.
--
-- "Today" is computed here, because a view cannot ask the client. It has to
-- match dayNumber() in app/src/domain/calendar.ts: day 1 starts at
-- DAY_EPOCH (2026-04-15 00:00 UTC) and the number is never below 1. If
-- DAY_EPOCH ever changes, change the timestamp below with it.

create or replace view public.player_streaks as
  with days as (
    select distinct user_id, day_number from public.site_clears
  ),
  islands as (
    select user_id, day_number,
           day_number - dense_rank() over (partition by user_id order by day_number) as grp
    from days
  ),
  runs as (
    select user_id, count(*)::int as len, max(day_number) as last_day
    from islands
    group by user_id, grp
  ),
  today as (
    select greatest(1, floor(extract(epoch from (now() - timestamptz '2026-04-15 00:00:00+00')) / 86400))::int as n
  )
  select r.user_id,
         coalesce(max(r.len) filter (where r.last_day >= t.n - 1), 0)::int as current_streak,
         max(r.len)::int as best_streak,
         max(r.last_day) as last_day
  from runs r
  cross join today t
  group by r.user_id;

-- Same exposure as player_scores: a count of days per player, nothing private.
grant select on public.player_streaks to anon, authenticated;
