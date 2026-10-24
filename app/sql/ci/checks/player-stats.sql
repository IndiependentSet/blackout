-- CI check for 2026-10-31-player-stats.sql: player_stats() adds up the caller's
-- own nights, voyage, rush runs and duels, never anyone else's, and refuses a
-- signed-out caller. Rolled back at the end, so it leaves nothing.
begin;

create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', coalesce(p_uid::text, ''), true),
         set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
grant execute on function public.act_as(uuid) to anon, authenticated;

insert into auth.users (id) values ('b0b00000-0000-0000-0000-000000000001'), ('b0b00000-0000-0000-0000-000000000002');
insert into public.profiles (id, username) values
  ('b0b00000-0000-0000-0000-000000000001', 'ci_stat_a'), ('b0b00000-0000-0000-0000-000000000002', 'ci_stat_b');

-- A: night 800 all seven skies at par (a perfect night, 7 x 10 points), night 801 one sky a star over par (5 points)
insert into public.site_clears (user_id, day_number, site_index, cats_used, par, on_budget, stars)
  select 'b0b00000-0000-0000-0000-000000000001', 800, i, 3, 3, true, 1 from generate_series(0, 6) i;
insert into public.site_clears (user_id, day_number, site_index, cats_used, par, on_budget, stars) values
  ('b0b00000-0000-0000-0000-000000000001', 801, 0, 4, 3, false, 1),
  ('b0b00000-0000-0000-0000-000000000002', 800, 0, 3, 3, true, 3);

insert into public.campaign_clears (user_id, level_no, cats_used, par, stars, campaign_stars) values
  ('b0b00000-0000-0000-0000-000000000001', 1, 3, 3, 1, 3),
  ('b0b00000-0000-0000-0000-000000000001', 2, 5, 4, 1, 1),
  ('b0b00000-0000-0000-0000-000000000002', 1, 3, 3, 1, 2);

insert into public.survival_runs (user_id, ends_at, sites_cleared, perfect_sites, score, status) values
  ('b0b00000-0000-0000-0000-000000000001', now(), 5, 5, 100, 'done'),
  ('b0b00000-0000-0000-0000-000000000001', now(), 7, 2, 50, 'done'),
  ('b0b00000-0000-0000-0000-000000000001', now(), 0, 0, 0, 'done');

-- A's duels: two ranked (rating 1000 -> 1016 -> 1002) and one friendly, A won the first two... and lost the last
insert into public.matches (id, level, status, created_by, opponent_id, ranked, created_at) values
  ('b0c00000-0000-0000-0000-000000000001', '{}', 'done', 'b0b00000-0000-0000-0000-000000000001', 'b0b00000-0000-0000-0000-000000000002', true, '2026-10-01 10:00+00'),
  ('b0c00000-0000-0000-0000-000000000002', '{}', 'done', 'b0b00000-0000-0000-0000-000000000001', 'b0b00000-0000-0000-0000-000000000002', true, '2026-10-02 10:00+00'),
  ('b0c00000-0000-0000-0000-000000000003', '{}', 'done', 'b0b00000-0000-0000-0000-000000000001', 'b0b00000-0000-0000-0000-000000000002', false, '2026-10-03 10:00+00');
insert into public.match_players (match_id, user_id, result, rating_before, rating_after) values
  ('b0c00000-0000-0000-0000-000000000001', 'b0b00000-0000-0000-0000-000000000001', 'won', 1000, 1016),
  ('b0c00000-0000-0000-0000-000000000001', 'b0b00000-0000-0000-0000-000000000002', 'lost', 1000, 984),
  ('b0c00000-0000-0000-0000-000000000002', 'b0b00000-0000-0000-0000-000000000001', 'lost', 1016, 1002),
  ('b0c00000-0000-0000-0000-000000000002', 'b0b00000-0000-0000-0000-000000000002', 'won', 984, 998),
  ('b0c00000-0000-0000-0000-000000000003', 'b0b00000-0000-0000-0000-000000000001', 'won', null, null),
  ('b0c00000-0000-0000-0000-000000000003', 'b0b00000-0000-0000-0000-000000000002', 'lost', null, null);
insert into public.match_ratings (user_id, rating, games) values ('b0b00000-0000-0000-0000-000000000001', 1002, 2);

set local role authenticated;

do $$
declare
  a uuid := 'b0b00000-0000-0000-0000-000000000001';
  s jsonb;
begin
  perform public.act_as(a);
  s := public.player_stats();

  if (s #>> '{nights,played}')::int <> 2 then raise exception 'nights played: %', s -> 'nights'; end if;
  if (s #>> '{nights,perfect}')::int <> 1 then raise exception 'perfect nights: %', s -> 'nights'; end if;
  if (s #>> '{nights,skies}')::int <> 8 or (s #>> '{nights,at_par}')::int <> 7 then raise exception 'skies / at par: %', s -> 'nights'; end if;
  if (s #>> '{nights,points}')::int <> 75 or (s #>> '{nights,best_points}')::int <> 70 then raise exception 'night points: %', s -> 'nights'; end if;
  if (s #>> '{nights,first_day}')::int <> 800 then raise exception 'first day: %', s -> 'nights'; end if;
  if (s #>> '{streak,best}')::int < 2 then raise exception 'streak: %', s -> 'streak'; end if;

  if (s #>> '{voyage,levels}')::int <> 2 or (s #>> '{voyage,stars}')::int <> 4 or (s #>> '{voyage,at_par}')::int <> 1 then
    raise exception 'voyage: %', s -> 'voyage';
  end if;

  if (s #>> '{rush,runs}')::int <> 2 or (s #>> '{rush,best_sites}')::int <> 7 or (s #>> '{rush,best_score}')::int <> 50
     or (s #>> '{rush,total_sites}')::int <> 12 then
    raise exception 'rush: %', s -> 'rush';
  end if;

  if (s #>> '{duel,rating}')::int <> 1002 or (s #>> '{duel,games}')::int <> 2 or (s #>> '{duel,peak}')::int <> 1016 then
    raise exception 'duel rating: %', s -> 'duel';
  end if;
  if (s #>> '{duel,played}')::int <> 3 or (s #>> '{duel,won}')::int <> 2 or (s #>> '{duel,lost}')::int <> 1 or (s #>> '{duel,drawn}')::int <> 0 then
    raise exception 'duel record: %', s -> 'duel';
  end if;
  if s #> '{duel,form}' <> '["won", "lost", "won"]'::jsonb then raise exception 'duel form (newest first): %', s #> '{duel,form}'; end if;
  if s #> '{duel,history}' <> '[1016, 1002]'::jsonb then raise exception 'rating history (oldest first, ranked only): %', s #> '{duel,history}'; end if;

  -- a player with nothing gets zeros, not nulls or an error
  perform public.act_as('b0b00000-0000-0000-0000-000000000002');
  s := public.player_stats();
  if (s #>> '{nights,skies}')::int <> 1 then raise exception 'B only has their own sky: %', s -> 'nights'; end if;
  if (s #>> '{voyage,stars}')::int <> 2 then raise exception 'B only has their own stars: %', s -> 'voyage'; end if;
  if (s #>> '{rush,runs}')::int <> 0 or (s #>> '{rush,best_sites}')::int <> 0 then raise exception 'B has no rush runs: %', s -> 'rush'; end if;
end $$;

reset role;
do $$
declare s jsonb;
begin
  insert into auth.users (id) values ('b0b00000-0000-0000-0000-000000000003');
  insert into public.profiles (id, username) values ('b0b00000-0000-0000-0000-000000000003', 'ci_stat_c');
  perform public.act_as('b0b00000-0000-0000-0000-000000000003');
end $$;
set local role authenticated;
do $$
declare s jsonb;
begin
  s := public.player_stats();
  if (s #>> '{nights,played}')::int <> 0 or (s #>> '{duel,games}')::int <> 0 or s #> '{duel,history}' <> '[]'::jsonb then
    raise exception 'a player with nothing: %', s;
  end if;
end $$;

reset role;
set local role anon;
do $$
begin
  perform public.act_as(null);
  begin
    perform public.player_stats();
    raise exception 'signed out: stats should need a player';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
