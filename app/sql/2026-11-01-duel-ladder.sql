-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md).
--
-- Why: the duel ladder gets six improvements, three of them on the server.
--
--   1. Around you     board_rows takes p_around: with it, the rows listed are the first p_limit, the
--                     caller's own and p_around either side of them, instead of the first p_limit and
--                     the caller pinned. The place numbers do not change.
--   2. Getting on it  ladder_progress() says how many ranked duels the caller has played (ever and this
--                     month), so a page can say "3 of 5 to appear" before the ladder shows them.
--   3. Challenge      (client only: a friend's row on the ladder starts a challenge.)
--   4. Trend          the duel board also returns `trend`: the rating change over the caller's last five
--                     ranked duels (the rating now, minus the rating before the oldest of those five).
--                     null on every other board.
--   5. Head to head   on the duel and season boards each row also returns won_vs / lost_vs: how many
--                     finished duels the caller won and lost against that player, any kind. null on
--                     the caller's own row, for a signed-out caller, and on the other boards.
--   6. Seasons        a new board, `season`: the rating gained in ranked duels in the month that holds
--                     p_day (UTC), summed from the rating each duel moved. Everyone starts a month at
--                     zero and the ladder rating (match_ratings, the Elo trigger) is not touched, so
--                     the all-time rating and its peak stay as they are. At least 3 ranked duels that
--                     month. Ties: more duels played, then whoever got there first.
--
-- season_start(day) is the first instant of the month that holds puzzle day `day` (day 1 starts at the
-- epoch of app/src/domain/calendar.ts), which `seasonOf` there mirrors.
--
-- board_rows and board_scored change their result, so they are dropped and made again (the grants and the
-- reasons are those of 2026-10-30-leaderboards.sql). player_stats gains season_gain and season_games.

create or replace function public.season_start(p_day int)
returns timestamptz language sql immutable as $$
  select date_trunc('month', (timestamptz '2026-04-15 00:00:00+00' + p_day * interval '1 day') at time zone 'UTC') at time zone 'UTC';
$$;
grant execute on function public.season_start(int) to anon, authenticated;

drop function if exists public.board_rows(text, int, uuid[], int);
drop function if exists public.board_scored(text, int);

create function public.board_scored(p_board text, p_day int)
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

create function public.board_rows(
  p_board text,
  p_day int default null,
  p_ids uuid[] default null,
  p_limit int default 20,
  p_around int default null
)
returns table (
  place int, total int, user_id uuid, username text, avatar text, value int, extra int, is_me boolean,
  trend int, won_vs int, lost_vs int
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  lim int := least(greatest(coalesce(p_limit, 20), 0), 100);
  around int := least(greatest(p_around, 0), 20);
  day int := greatest(1, coalesce(p_day, public.current_puzzle_day()));
begin
  if p_board in ('duel', 'season') and me is null then
    raise exception 'sign in to read the ladder' using errcode = '42501';
  end if;
  if p_ids is not null and cardinality(p_ids) > 200 then
    raise exception 'too many players' using errcode = '22023';
  end if;

  return query
    with scored as (
      select x.uid, x.v, x.a, x.b, x.t, x.trend
      from public.board_scored(p_board, day) x
      where p_ids is null or x.uid = any (p_ids)
    ), ranked as (
      select rank() over (order by sc.v desc, sc.a desc, sc.b desc)::int as pl,
             row_number() over (order by sc.v desc, sc.a desc, sc.b desc, sc.t, sc.uid)::int as pos,
             count(*) over ()::int as tot,
             sc.uid, sc.v, sc.a, sc.trend
      from scored sc
    ), mine as (
      select r.pos as mypos from ranked r where r.uid = me
    )
    select r.pl, r.tot, r.uid, p.username, p.avatar, r.v, r.a, coalesce(r.uid = me, false),
           case when p_board = 'duel' then r.trend end,
           case when p_board in ('duel', 'season') and me is not null and r.uid <> me then (
             select count(*)::int from public.match_players a
             join public.match_players b on b.match_id = a.match_id and b.user_id = r.uid
             join public.matches mm on mm.id = a.match_id and mm.status = 'done'
             where a.user_id = me and a.result = 'won'
           ) end,
           case when p_board in ('duel', 'season') and me is not null and r.uid <> me then (
             select count(*)::int from public.match_players a
             join public.match_players b on b.match_id = a.match_id and b.user_id = r.uid
             join public.matches mm on mm.id = a.match_id and mm.status = 'done'
             where a.user_id = me and a.result = 'lost'
           ) end
    from ranked r
    join public.profiles p on p.id = r.uid
    where r.pos <= lim
       or r.uid = me
       or (around is not null and abs(r.pos - (select mypos from mine)) <= around)
    order by r.pos;
end;
$$;

create or replace function public.ladder_progress()
returns table (games int, season_games int)
language sql stable security definer set search_path = public as $$
  select coalesce((select r.games from public.match_ratings r where r.user_id = auth.uid()), 0),
         (select count(*)::int from public.match_players mp
          join public.matches m on m.id = mp.match_id and m.ranked
          where mp.user_id = auth.uid() and mp.rating_after is not null
            and m.created_at >= public.season_start(public.current_puzzle_day())
            and m.created_at < public.season_start(public.current_puzzle_day()) + interval '1 month');
$$;

revoke all on function public.board_scored(text, int) from public, anon, authenticated;
revoke all on function public.board_rows(text, int, uuid[], int, int) from public;
revoke all on function public.ladder_progress() from public, anon;
grant execute on function public.board_rows(text, int, uuid[], int, int) to anon, authenticated;
grant execute on function public.ladder_progress() to authenticated;

create or replace function public.player_stats()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  res jsonb;
begin
  if me is null then
    raise exception 'sign in to read your stats' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'nights', (
      with n as (
        select s.day_number, count(*) as sites, count(*) filter (where s.cats_used <= s.par) as at_par, sum(s.score) as points
        from public.site_clears s where s.user_id = me group by s.day_number
      )
      select jsonb_build_object(
        'played', count(*),
        'perfect', count(*) filter (where n.sites >= 7 and n.at_par = n.sites),
        'skies', coalesce(sum(n.sites), 0),
        'at_par', coalesce(sum(n.at_par), 0),
        'points', coalesce(sum(n.points), 0),
        'best_points', coalesce(max(n.points), 0),
        'first_day', min(n.day_number)
      ) from n
    ),
    'streak', (
      select jsonb_build_object('current', coalesce(max(st.current_streak), 0), 'best', coalesce(max(st.best_streak), 0))
      from public.player_streaks st where st.user_id = me
    ),
    'voyage', (
      select jsonb_build_object(
        'levels', count(*),
        'stars', coalesce(sum(c.campaign_stars), 0),
        'at_par', count(*) filter (where c.cats_used <= c.par),
        'points', coalesce(sum(c.score), 0)
      ) from public.campaign_clears c where c.user_id = me
    ),
    'rush', (
      select jsonb_build_object(
        'runs', (select count(*) from public.survival_runs r where r.user_id = me and r.sites_cleared > 0),
        'best_sites', coalesce(b.sites_cleared, 0),
        'best_score', coalesce(b.score, 0),
        'total_sites', (select coalesce(sum(r.sites_cleared), 0) from public.survival_runs r where r.user_id = me)
      ) from (select 1) one
      left join lateral (
        select r.sites_cleared, r.score from public.survival_runs r
        where r.user_id = me and r.sites_cleared > 0
        order by r.sites_cleared desc, r.score desc limit 1
      ) b on true
    ),
    'duel', jsonb_build_object(
      'rating', (select r.rating from public.match_ratings r where r.user_id = me),
      'games', coalesce((select r.games from public.match_ratings r where r.user_id = me), 0),
      'peak', (
        select max(mp.rating_after) from public.match_players mp
        join public.matches m on m.id = mp.match_id and m.ranked
        where mp.user_id = me
      ),
      'season_gain', coalesce((
        select sum(mp.rating_after - mp.rating_before) from public.match_players mp
        join public.matches m on m.id = mp.match_id and m.ranked
        where mp.user_id = me and mp.rating_before is not null and mp.rating_after is not null
          and m.created_at >= public.season_start(public.current_puzzle_day())
          and m.created_at < public.season_start(public.current_puzzle_day()) + interval '1 month'
      ), 0),
      'season_games', (
        select count(*) from public.match_players mp
        join public.matches m on m.id = mp.match_id and m.ranked
        where mp.user_id = me and mp.rating_after is not null
          and m.created_at >= public.season_start(public.current_puzzle_day())
          and m.created_at < public.season_start(public.current_puzzle_day()) + interval '1 month'
      ),
      'played', (select count(*) from public.match_players mp where mp.user_id = me and mp.result in ('won', 'lost', 'drawn')),
      'won', (select count(*) from public.match_players mp where mp.user_id = me and mp.result = 'won'),
      'lost', (select count(*) from public.match_players mp where mp.user_id = me and mp.result = 'lost'),
      'drawn', (select count(*) from public.match_players mp where mp.user_id = me and mp.result = 'drawn'),
      'form', coalesce((
        select jsonb_agg(f.result order by f.created_at desc) from (
          select mp.result, m.created_at from public.match_players mp
          join public.matches m on m.id = mp.match_id
          where mp.user_id = me and mp.result in ('won', 'lost', 'drawn')
          order by m.created_at desc limit 5
        ) f
      ), '[]'::jsonb),
      'history', coalesce((
        select jsonb_agg(h.rating_after order by h.created_at) from (
          select mp.rating_after, m.created_at from public.match_players mp
          join public.matches m on m.id = mp.match_id and m.ranked
          where mp.user_id = me and mp.rating_after is not null
          order by m.created_at desc limit 30
        ) h
      ), '[]'::jsonb)
    )
  ) into res;
  return res;
end;
$$;


revoke all on function public.player_stats() from public, anon;
grant execute on function public.player_stats() to authenticated;
