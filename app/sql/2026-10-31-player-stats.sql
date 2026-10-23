-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md).
--
-- Why: Stargazer's stats page ("Stats", in the Observatory) shows a player
-- everything they have done in one place: nights, the voyage, Meteor Rush and
-- the duel ladder. player_stats() reads it all in one call instead of the page
-- making a handful, and keeps the arithmetic next to the tables it comes from.
--
--   nights   played (nights with a sky charted), perfect (all seven skies at
--            par: SITE_COUNT in app/src/domain/sites.ts), skies, at_par,
--            points, best_points (the best single night), first_day
--   streak   current and best run of nights in a row (player_streaks)
--   voyage   levels, stars (campaign stars), at_par, points
--   rush     runs (with at least one sky), best_sites, best_score (of the same
--            run: most skies, then most points), total_sites
--   duel     rating and ranked games (null/0 before the first ranked duel),
--            peak (highest rating reached), played/won/lost/drawn over every
--            duel, form (the last five results, newest first), history (the
--            rating after each of the last 30 ranked duels, oldest first)
--
-- Only the caller's own numbers: it reads auth.uid(), takes no argument, and
-- refuses a signed-out caller. security definer, because survival_runs and
-- campaign_clears are readable by their owner only through their own policies
-- and the function needs the lot in one place; pinned search_path.

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
