-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md).
--
-- Why: the nights boards had tonight and the last seven nights but no "all time". The `alltime` board is the
-- points of every sky a player has ever charted (the sum of site_clears.score), the same arithmetic as `week`
-- over every night: a tie goes to more skies at par, then more nights played, then whoever got there first.
-- `board_scored` is made again with that one more branch; nothing else about it, or about board_rows, changes
-- (the grants of 2026-10-30-leaderboards.sql stay: board_scored is still not callable from the API).

create or replace function public.board_scored(p_board text, p_day int)
returns table (uid uuid, v int, a int, b int, t timestamptz, trend int)
language plpgsql stable security definer set search_path = public as $$
declare
  sstart timestamptz := public.season_start(p_day);
begin
  if p_board = 'night' then
    return query
      select s.user_id, sum(s.score)::int, count(*) filter (where s.cats_used <= s.par)::int,
             (-sum(s.cats_used))::int, max(s.created_at), null::int
      from public.site_clears s
      where s.day_number = p_day
      group by s.user_id;
  elsif p_board = 'week' then
    return query
      select s.user_id, sum(s.score)::int, count(*) filter (where s.cats_used <= s.par)::int,
             count(distinct s.day_number)::int, max(s.created_at), null::int
      from public.site_clears s
      where s.day_number between p_day - 6 and p_day
      group by s.user_id;
  elsif p_board = 'alltime' then
    return query
      select s.user_id, sum(s.score)::int, count(*) filter (where s.cats_used <= s.par)::int,
             count(distinct s.day_number)::int, max(s.created_at), null::int
      from public.site_clears s
      group by s.user_id;
  elsif p_board = 'voyage' then
    return query
      select c.user_id, sum(c.campaign_stars)::int, count(*)::int, 0, max(c.cleared_at), null::int
      from public.campaign_clears c
      group by c.user_id;
  elsif p_board = 'rush' then
    return query
      select distinct on (r.user_id) r.user_id, r.sites_cleared, r.score, 0, r.started_at, null::int
      from public.survival_runs r
      where r.sites_cleared > 0
      order by r.user_id, r.sites_cleared desc, r.score desc, r.started_at;
  elsif p_board = 'duel' then
    return query
      select l.user_id, l.rating, l.games, l.won, m.updated_at,
             l.rating - coalesce((
               select x.rating_before from (
                 select mp.rating_before, mm.created_at from public.match_players mp
                 join public.matches mm on mm.id = mp.match_id and mm.ranked
                 where mp.user_id = l.user_id and mp.rating_before is not null
                 order by mm.created_at desc limit 5
               ) x order by x.created_at asc limit 1
             ), l.rating)
      from public.leaderboard_ranked l
      join public.match_ratings m on m.user_id = l.user_id
      where l.games >= 5;
  elsif p_board = 'season' then
    return query
      select mp.user_id, sum(mp.rating_after - mp.rating_before)::int, count(*)::int, 0, max(m.created_at), null::int
      from public.match_players mp
      join public.matches m on m.id = mp.match_id and m.ranked
      where mp.rating_before is not null and mp.rating_after is not null
        and m.created_at >= sstart and m.created_at < sstart + interval '1 month'
      group by mp.user_id
      having count(*) >= 3;
  else
    raise exception 'unknown board %', p_board using errcode = '22023';
  end if;
end;
$$;

