-- CI check for 2026-11-01-duel-ladder.sql: the ladder window around the caller, a duel's trend and head-to-head
-- record, the monthly season board (and that last month does not count), the progress toward the ladder, and the
-- season numbers in player_stats. Rolled back at the end, so it leaves nothing.
begin;

create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', coalesce(p_uid::text, ''), true),
         set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
grant execute on function public.act_as(uuid) to anon, authenticated;

-- eight players; p1..p8 rated 1400 down to 1330 in steps of 10, all with 6 ranked games. We are p5 (rated 1360).
insert into auth.users (id) select ('b0d00000-0000-0000-0000-00000000000' || i)::uuid from generate_series(1, 8) i;
insert into public.profiles (id, username) select ('b0d00000-0000-0000-0000-00000000000' || i)::uuid, 'ci_lad_' || i from generate_series(1, 8) i;
insert into public.match_ratings (user_id, rating, games)
  select ('b0d00000-0000-0000-0000-00000000000' || i)::uuid, 1410 - i * 10, 6 from generate_series(1, 8) i;

-- p5 and p4 played five ranked duels this month (p5 won the first three, lost the last two), p5 rising 6 a duel to 1360
-- and p4 gaining 1 a duel, and p5 one more last month that must not count for the season
insert into public.matches (id, level, status, created_by, opponent_id, ranked, created_at)
  select ('b0e00000-0000-0000-0000-00000000000' || i)::uuid, '{}', 'done', 'b0d00000-0000-0000-0000-000000000005', 'b0d00000-0000-0000-0000-000000000004', true,
         public.season_start(public.current_puzzle_day()) + i * interval '1 minute'
  from generate_series(1, 5) i;
insert into public.match_players (match_id, user_id, result, rating_before, rating_after)
  select ('b0e00000-0000-0000-0000-00000000000' || i)::uuid, 'b0d00000-0000-0000-0000-000000000005', case when i <= 3 then 'won' else 'lost' end,
         1330 + (i - 1) * 6, 1330 + i * 6 from generate_series(1, 5) i;
insert into public.match_players (match_id, user_id, result, rating_before, rating_after)
  select ('b0e00000-0000-0000-0000-00000000000' || i)::uuid, 'b0d00000-0000-0000-0000-000000000004', case when i <= 3 then 'lost' else 'won' end,
         1000 + i - 1, 1000 + i from generate_series(1, 5) i;
insert into public.matches (id, level, status, created_by, opponent_id, ranked, created_at) values
  ('b0e00000-0000-0000-0000-000000000099', '{}', 'done', 'b0d00000-0000-0000-0000-000000000005', 'b0d00000-0000-0000-0000-000000000004', true,
   public.season_start(public.current_puzzle_day()) - interval '10 days');
insert into public.match_players (match_id, user_id, result, rating_before, rating_after) values
  ('b0e00000-0000-0000-0000-000000000099', 'b0d00000-0000-0000-0000-000000000005', 'won', 1230, 1330),
  ('b0e00000-0000-0000-0000-000000000099', 'b0d00000-0000-0000-0000-000000000004', 'lost', 1000, 900);

set local role authenticated;

do $$
declare
  me uuid := 'b0d00000-0000-0000-0000-000000000005';
  p4 uuid := 'b0d00000-0000-0000-0000-000000000004';
  r record;
  n int;
  places int[];
  prog record;
  s jsonb;
begin
  perform public.act_as(me);

  -- the window: the first 2, then 1 either side of us: places 1, 2, 4, 5, 6
  select array_agg(place order by place) into places from public.board_rows('duel', null, null, 2, 1);
  if places <> array[1, 2, 4, 5, 6] then raise exception 'around: expected places {1,2,4,5,6}, got %', places; end if;
  select array_agg(place order by place) into places from public.board_rows('duel', null, null, 2, null);
  if places <> array[1, 2, 5] then raise exception 'no window: expected the first 2 and the caller, got %', places; end if;
  select array_agg(place order by place) into places from public.board_rows('duel', null, null, 0, 0);
  if places <> array[5] then raise exception 'around 0, limit 0: expected only the caller, got %', places; end if;
  select total into n from public.board_rows('duel', null, null, 2, 1) limit 1;
  if n <> 8 then raise exception 'the total counts the whole ladder, got %', n; end if;

  -- trend: our rating 1360 less the rating before the oldest of our last five duels (1330)
  select * into r from public.board_rows('duel', null, null, 20, null) where user_id = me;
  if r.trend <> 30 then raise exception 'trend should be +30, got %', r.trend; end if;
  select trend into n from public.board_rows('night', 1, null, 20, null) limit 1;
  if n is not null then raise exception 'only the duel board has a trend'; end if;

  -- head to head, over every finished duel, last month's included: we won 3 + 1 and lost 2 against p4; nothing on our own row
  select * into r from public.board_rows('duel', null, null, 20, null) where user_id = p4;
  if r.won_vs <> 4 or r.lost_vs <> 2 then raise exception 'versus p4 should be 4-2, got %-%', r.won_vs, r.lost_vs; end if;
  select * into r from public.board_rows('duel', null, null, 20, null) where user_id = me;
  if r.won_vs is not null or r.lost_vs is not null then raise exception 'no record against yourself'; end if;
  select * into r from public.board_rows('duel', null, null, 20, null) where user_id = 'b0d00000-0000-0000-0000-000000000001';
  if r.won_vs <> 0 or r.lost_vs <> 0 then raise exception 'no duels against p1 is 0-0'; end if;

  -- the season: this month's gain only (p5 +30, p4 +5), last month's 100 does not count
  select * into r from public.board_rows('season', null, null, 20, null) where user_id = me;
  if r.place <> 1 or r.value <> 30 or r.extra <> 5 or r.total <> 2 then
    raise exception 'season: p5 should lead on +30 over 5 duels of 2 players, got place % value % extra % total %', r.place, r.value, r.extra, r.total;
  end if;
  select value into n from public.board_rows('season', null, null, 20, null) where user_id = p4;
  if n <> 5 then raise exception 'season: p4 should be +5, got %', n; end if;
  select count(*) into n from public.board_rows('season', public.current_puzzle_day() - 40, null, 20, null);
  if n <> 0 then raise exception 'season: a month with no duels is empty'; end if;

  -- progress toward the ladder
  select * into prog from public.ladder_progress();
  if prog.games <> 6 or prog.season_games <> 5 then raise exception 'progress: got % and %', prog.games, prog.season_games; end if;

  -- the season in player_stats
  s := public.player_stats();
  if (s #>> '{duel,season_gain}')::int <> 30 or (s #>> '{duel,season_games}')::int <> 5 then
    raise exception 'player_stats season: %', s -> 'duel';
  end if;
end $$;

reset role;
set local role anon;
do $$
begin
  perform public.act_as(null);
  begin
    perform * from public.board_rows('season', null, null, 20, null);
    raise exception 'signed out: the season board should need a player';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.ladder_progress();
    raise exception 'signed out: ladder_progress should need a player';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
