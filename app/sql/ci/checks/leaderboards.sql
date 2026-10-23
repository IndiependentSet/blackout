-- CI check for 2026-10-30-leaderboards.sql: every board ranks by its documented
-- measures with ties sharing a place, a window shows the caller's own row when
-- they are below the cut, p_ids narrows the circle, the voyage and rush rows
-- stay private underneath, and the ladder needs a signed-in player. Rolled back
-- at the end, so it leaves nothing.
begin;

create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', coalesce(p_uid::text, ''), true),
         set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
grant execute on function public.act_as(uuid) to anon, authenticated;

insert into auth.users (id) values
  ('b0a00000-0000-0000-0000-000000000001'), ('b0a00000-0000-0000-0000-000000000002'),
  ('b0a00000-0000-0000-0000-000000000003'), ('b0a00000-0000-0000-0000-000000000004');
insert into public.profiles (id, username) values
  ('b0a00000-0000-0000-0000-000000000001', 'ci_board_a'), ('b0a00000-0000-0000-0000-000000000002', 'ci_board_b'),
  ('b0a00000-0000-0000-0000-000000000003', 'ci_board_c'), ('b0a00000-0000-0000-0000-000000000004', 'ci_board_d');

-- night 900: A and B each chart two skies at par for 50 (a tie on every measure, A finished first), C one sky a star over
-- par for 5. B also charted night 899, so B leads the week.
insert into public.site_clears (user_id, day_number, site_index, cats_used, par, on_budget, stars, created_at) values
  ('b0a00000-0000-0000-0000-000000000001', 900, 0, 5, 5, true, 3, '2026-10-01 10:00+00'),
  ('b0a00000-0000-0000-0000-000000000001', 900, 1, 4, 4, true, 2, '2026-10-01 10:05+00'),
  ('b0a00000-0000-0000-0000-000000000002', 900, 0, 5, 5, true, 3, '2026-10-01 11:00+00'),
  ('b0a00000-0000-0000-0000-000000000002', 900, 1, 4, 4, true, 2, '2026-10-01 11:05+00'),
  ('b0a00000-0000-0000-0000-000000000002', 899, 0, 1, 1, true, 1, '2026-09-30 11:00+00'),
  ('b0a00000-0000-0000-0000-000000000003', 900, 0, 4, 3, false, 1, '2026-10-01 12:00+00');

insert into public.campaign_clears (user_id, level_no, cats_used, par, stars, campaign_stars) values
  ('b0a00000-0000-0000-0000-000000000001', 1, 3, 3, 1, 3),
  ('b0a00000-0000-0000-0000-000000000001', 2, 4, 4, 1, 2),
  ('b0a00000-0000-0000-0000-000000000002', 1, 3, 3, 1, 3);

insert into public.survival_runs (user_id, ends_at, sites_cleared, perfect_sites, score, status) values
  ('b0a00000-0000-0000-0000-000000000001', now(), 5, 5, 100, 'done'),
  ('b0a00000-0000-0000-0000-000000000001', now(), 7, 2, 50, 'done'),
  ('b0a00000-0000-0000-0000-000000000002', now(), 7, 3, 70, 'done'),
  ('b0a00000-0000-0000-0000-000000000003', now(), 0, 0, 0, 'done');

-- the ladder: A and C tie at 1100 over 6 games, B has the rating but only 3 games, D is unrated
insert into public.match_ratings (user_id, rating, games) values
  ('b0a00000-0000-0000-0000-000000000001', 1100, 6),
  ('b0a00000-0000-0000-0000-000000000002', 1200, 3),
  ('b0a00000-0000-0000-0000-000000000003', 1100, 6);

set local role authenticated;

do $$
declare
  a uuid := 'b0a00000-0000-0000-0000-000000000001';
  b uuid := 'b0a00000-0000-0000-0000-000000000002';
  c uuid := 'b0a00000-0000-0000-0000-000000000003';
  n int;
  r record;
begin
  perform public.act_as(c);

  -- night: A and B share place 1 (50 points, two at par), C is third of three
  select * into r from public.board_rows('night', 900, null, 20) where user_id = c;
  if r.place <> 3 or r.total <> 3 or r.value <> 5 or r.extra <> 0 or not r.is_me then
    raise exception 'night: C should be 3rd of 3 on 5 points, got % of % on %', r.place, r.total, r.value;
  end if;
  select place into n from public.board_rows('night', 900, null, 20) where user_id = a;
  if n <> 1 then raise exception 'night: A should be 1st'; end if;
  select place into n from public.board_rows('night', 900, null, 20) where user_id = b;
  if n <> 1 then raise exception 'night: a tie on every measure should share place 1'; end if;
  select count(*) into n from public.board_rows('night', 901, null, 20);
  if n <> 0 then raise exception 'night: a night nobody played should be empty'; end if;

  -- the first listed of two tied rows is whoever finished first
  select user_id into r from public.board_rows('night', 900, null, 20) limit 1;
  if r.user_id <> a then raise exception 'night: the tie should list the earlier finisher first'; end if;

  -- week: B has 60 over two nights and leads A's 50
  select place into n from public.board_rows('week', 900, null, 20) where user_id = b;
  if n <> 1 then raise exception 'week: B should lead'; end if;
  select place into n from public.board_rows('week', 900, null, 20) where user_id = a;
  if n <> 2 then raise exception 'week: A should be 2nd'; end if;
  select value into n from public.board_rows('week', 905, null, 20) where user_id = b;
  if n <> 60 then raise exception 'week: night 899 is inside the window ending 905, got %', n; end if;
  select value into n from public.board_rows('week', 906, null, 20) where user_id = b;
  if n <> 50 then raise exception 'week: night 899 is outside the window ending 906, got %', n; end if;
  select count(*) into n from public.board_rows('week', 907, null, 20);
  if n <> 0 then raise exception 'week: nights 900 and 899 are outside the window ending at 907'; end if;

  -- a window of one row still shows the caller below the cut, and the total counts everyone
  select count(*) into n from public.board_rows('night', 900, null, 1);
  if n <> 2 then raise exception 'night: limit 1 should return the first row plus the caller, got %', n; end if;
  select count(*) into n from public.board_rows('night', 900, null, 0);
  if n <> 1 then raise exception 'night: limit 0 should return only the caller'; end if;
  select total into n from public.board_rows('night', 900, null, 0);
  if n <> 3 then raise exception 'night: the total should count the whole board, got %', n; end if;

  -- a circle: only A and C, so C is 2nd of 2
  select * into r from public.board_rows('night', 900, array[a, c], 20) where user_id = c;
  if r.place <> 2 or r.total <> 2 then raise exception 'circle: C should be 2nd of 2'; end if;

  -- voyage: A 5 stars over two levels, B 3 over one, C nothing and so absent
  select * into r from public.board_rows('voyage', null, null, 20) where user_id = a;
  if r.place <> 1 or r.value <> 5 or r.extra <> 2 then raise exception 'voyage: A should lead on 5 stars over 2 levels'; end if;
  select count(*) into n from public.board_rows('voyage', null, null, 20);
  if n <> 2 then raise exception 'voyage: only players with a clear belong on it, got %', n; end if;

  -- rush: B's 7 skies for 70 beat A's best run (7 skies for 50), not A's 5 skies for 100
  select * into r from public.board_rows('rush', null, null, 20) where user_id = a;
  if r.place <> 2 or r.value <> 7 or r.extra <> 50 then raise exception 'rush: A should be 2nd on their best run'; end if;
  select count(*) into n from public.board_rows('rush', null, null, 20);
  if n <> 2 then raise exception 'rush: a run of 0 skies is not on the board, got % rows', n; end if;

  -- duel: B has too few games, A and C tie
  select count(*) into n from public.board_rows('duel', null, null, 20);
  if n <> 2 then raise exception 'duel: only players with 5 ranked games belong on it, got %', n; end if;
  select place into n from public.board_rows('duel', null, null, 20) where user_id = c;
  if n <> 1 then raise exception 'duel: a tie should share place 1'; end if;

  begin
    perform * from public.board_rows('nonsense', null, null, 20);
    raise exception 'an unknown board was accepted';
  exception when invalid_parameter_value then null;
  end;

  -- the tables underneath stay private
  select count(*) into n from public.campaign_clears;
  if n <> 0 then raise exception 'a player could read someone else''s voyage'; end if;
  begin
    perform * from public.board_scored('night', 900);
    raise exception 'the internal scorer was callable';
  exception when insufficient_privilege then null;
  end;
end $$;

-- signed out: the public boards read, the ladder does not
reset role;
set local role anon;
do $$
declare n int;
begin
  perform public.act_as(null);
  select count(*) into n from public.board_rows('night', 900, null, 20);
  if n <> 3 then raise exception 'signed out: the night board should read, got % rows', n; end if;
  if exists (select 1 from public.board_rows('night', 900, null, 20) where is_me) then
    raise exception 'signed out: nobody is the caller';
  end if;
  begin
    perform * from public.board_rows('duel', null, null, 20);
    raise exception 'signed out: the ladder should need a player';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
