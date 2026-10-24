-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md).
--
-- Why: Stargazer's leaderboards were scattered views read by one screen each,
-- with no night board, no voyage board, and no way to tell a player where they
-- stand once they fall outside the first 20. This adds ONE read function,
-- board_rows, that every Stargazer board goes through, so the ordering rules
-- live in one place (and domain/ranking.ts documents the same rules).
--
--   board        measures                              ties, in order
--   night        points of one night (p_day)            seven-sky par count, fewer stars lit,
--                                                       whoever finished first
--   week         points of the seven nights ending at   par count, more nights played,
--                p_day (by day_number, not by when      whoever got there first
--                the row was saved)
--   voyage       campaign stars (max 300)               levels cleared, whoever got there first
--   rush         best run's skies                       best run's points, oldest run
--   duel         rating, from ranked duels only         more ranked games, more wins
--                (at least 5 of them, so one lucky
--                game is not a place on the ladder)
--
-- The `value` of a row is the first measure, `extra` the second (par count,
-- levels cleared, points, games). The place is a competition rank over the
-- measures above: rows equal on every one share it (1, 2, 2, 4). Whoever
-- finished first only decides the order the equal rows are listed in.
--
-- p_ids narrows the board to those players (a player's friends and themself),
-- so the place is within that circle. p_limit rows are returned, plus the
-- caller's own row when they are below the cut, flagged is_me; `total` is how
-- many players the board has. p_limit = 0 returns only the caller's own row,
-- which is how a page asks "where am I?" without reading the list.
--
-- Access: security definer (the tables underneath stay private: campaign_clears
-- and survival_runs are readable by their owner only), pinned search_path.
-- Everyone may read every board but the ladder, which, like leaderboard_ranked,
-- is for signed-in players. Existing views (leaderboard_weekly, _alltime,
-- _survival, _ranked) are untouched: CATASTROPHE INC. still reads them.

-- Internal: one row per player on a board, `b` and `v`/`a` higher is better,
-- `t` earlier is better. Not callable from the API.
create or replace function public.board_scored(p_board text, p_day int)
returns table (uid uuid, v int, a int, b int, t timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if p_board = 'night' then
    return query
      select s.user_id, sum(s.score)::int, count(*) filter (where s.cats_used <= s.par)::int,
             (-sum(s.cats_used))::int, max(s.created_at)
      from public.site_clears s
      where s.day_number = p_day
      group by s.user_id;
  elsif p_board = 'week' then
    return query
      select s.user_id, sum(s.score)::int, count(*) filter (where s.cats_used <= s.par)::int,
             count(distinct s.day_number)::int, max(s.created_at)
      from public.site_clears s
      where s.day_number between p_day - 6 and p_day
      group by s.user_id;
  elsif p_board = 'voyage' then
    return query
      select c.user_id, sum(c.campaign_stars)::int, count(*)::int, 0, max(c.cleared_at)
      from public.campaign_clears c
      group by c.user_id;
  elsif p_board = 'rush' then
    return query
      select distinct on (r.user_id) r.user_id, r.sites_cleared, r.score, 0, r.started_at
      from public.survival_runs r
      where r.sites_cleared > 0
      order by r.user_id, r.sites_cleared desc, r.score desc, r.started_at;
  elsif p_board = 'duel' then
    return query
      select l.user_id, l.rating, l.games, l.won, m.updated_at
      from public.leaderboard_ranked l
      join public.match_ratings m on m.user_id = l.user_id
      where l.games >= 5;
  else
    raise exception 'unknown board %', p_board using errcode = '22023';
  end if;
end;
$$;

create or replace function public.board_rows(
  p_board text,
  p_day int default null,
  p_ids uuid[] default null,
  p_limit int default 20
)
returns table (place int, total int, user_id uuid, username text, avatar text, value int, extra int, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  lim int := least(greatest(coalesce(p_limit, 20), 0), 100);
  day int := greatest(1, coalesce(p_day, public.current_puzzle_day()));
begin
  if p_board = 'duel' and me is null then
    raise exception 'sign in to read the ladder' using errcode = '42501';
  end if;
  if p_ids is not null and cardinality(p_ids) > 200 then
    raise exception 'too many players' using errcode = '22023';
  end if;

  return query
    with scored as (
      select x.uid, x.v, x.a, x.b, x.t
      from public.board_scored(p_board, day) x
      where p_ids is null or x.uid = any (p_ids)
    ), ranked as (
      select rank() over (order by sc.v desc, sc.a desc, sc.b desc)::int as pl,
             row_number() over (order by sc.v desc, sc.a desc, sc.b desc, sc.t, sc.uid)::int as pos,
             count(*) over ()::int as tot,
             sc.uid, sc.v, sc.a
      from scored sc
    )
    select r.pl, r.tot, r.uid, p.username, p.avatar, r.v, r.a, coalesce(r.uid = me, false)
    from ranked r
    join public.profiles p on p.id = r.uid
    where r.pos <= lim or r.uid = me
    order by r.pos;
end;
$$;

revoke all on function public.board_scored(text, int) from public, anon, authenticated;
revoke all on function public.board_rows(text, int, uuid[], int) from public;
grant execute on function public.board_rows(text, int, uuid[], int) to anon, authenticated;
