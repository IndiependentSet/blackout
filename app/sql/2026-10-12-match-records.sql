-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Run AFTER 2026-10-12-match-rpc.sql (needs match_players and profiles).
--
-- Why: the 1vs1 board is its own: wins and losses, no rating and no points.
-- It is kept apart from site_clears and from every daily leaderboard view, so
-- a head-to-head never changes anyone's daily score.
--
-- One row per player who has finished a match (won, lost or drawn; voided
-- matches do not count). A view runs with its owner's rights, so it can count
-- rows the caller could not select; it shows only totals, the same exposure as
-- player_scores.

create or replace view public.match_records as
  select p.id as user_id,
         p.username as name,
         count(*) filter (where mp.result in ('won', 'lost', 'drawn'))::int as played,
         count(*) filter (where mp.result = 'won')::int as won,
         count(*) filter (where mp.result = 'lost')::int as lost,
         count(*) filter (where mp.result = 'drawn')::int as drawn
  from public.profiles p
  join public.match_players mp on mp.user_id = p.id
  group by p.id, p.username;

grant select on public.match_records to authenticated;
