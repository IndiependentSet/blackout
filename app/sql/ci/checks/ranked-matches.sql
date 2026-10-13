-- CI check for 2026-10-22-ranked-matches.sql: the search pairs two players into a
-- ranked match, the Elo moves when it ends (and only then), friendly and void
-- matches move nothing, and nobody can write the queue or the ratings directly.
-- Rolled back at the end, so it leaves nothing.
begin;

create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', p_uid::text, true),
         set_config('request.jwt.claim.sub', p_uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id) values
  ('e1000000-0000-0000-0000-000000000001'), ('e1000000-0000-0000-0000-000000000002'),
  ('e1000000-0000-0000-0000-000000000003'), ('e1000000-0000-0000-0000-000000000004'),
  ('e1000000-0000-0000-0000-000000000005');
insert into public.profiles (id, username) values
  ('e1000000-0000-0000-0000-000000000001', 'ci_rank_admin'),
  ('e1000000-0000-0000-0000-000000000002', 'ci_rank_a'),
  ('e1000000-0000-0000-0000-000000000003', 'ci_rank_b'),
  ('e1000000-0000-0000-0000-000000000004', 'ci_rank_c'),
  ('e1000000-0000-0000-0000-000000000005', 'ci_rank_d');
insert into public.admins (user_id) values ('e1000000-0000-0000-0000-000000000001');

do $$
declare
  admin uuid := 'e1000000-0000-0000-0000-000000000001';
  a uuid := 'e1000000-0000-0000-0000-000000000002';
  b uuid := 'e1000000-0000-0000-0000-000000000003';
  c uuid := 'e1000000-0000-0000-0000-000000000004';
  d uuid := 'e1000000-0000-0000-0000-000000000005';
  lv jsonb := '{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]],"k":1,"sol":[1],"stars":1}';
  pool jsonb;
  mid uuid;
  again uuid;
  ra int;
  rb int;
  m public.matches;
begin
  select jsonb_agg(jsonb_build_object('slot', s, 'tier', s, 'level', lv)) into pool from generate_series(0, 1) s;

  -- no 1vs1 levels published yet: searching says so
  set local role authenticated;
  perform public.act_as(a);
  begin
    perform public.find_match(0);
    raise exception 'find_match answered with no pool';
  exception when no_data_found then null;
  end;
  reset role;

  set local role authenticated;
  perform public.act_as(admin);
  perform public.publish_level_pool('match', '{}', pool, 'ci');
  reset role;

  -- a signed-out caller and a bad tier are refused
  set local role authenticated;
  perform public.act_as(a);
  begin
    perform public.find_match(10);
    raise exception 'tier 10 was accepted';
  exception when invalid_parameter_value then null;
  end;

  -- the first player waits; calling again keeps them waiting
  if public.find_match(0) is not null then raise exception 'a lone player was matched'; end if;
  if public.find_match(0) is not null then raise exception 'a lone player was matched on the second call'; end if;
  reset role;
  if (select count(*) from public.match_queue where user_id = a) <> 1 then raise exception 'the waiting player is not queued once'; end if;

  -- a player in another tier is not paired with them
  set local role authenticated;
  perform public.act_as(c);
  if public.find_match(1) is not null then raise exception 'different tiers were paired'; end if;
  perform public.leave_queue();
  reset role;
  if exists (select 1 from public.match_queue where user_id = c) then raise exception 'leave_queue left the row'; end if;

  -- the second player is paired with the first, at once
  set local role authenticated;
  perform public.act_as(b);
  mid := public.find_match(0);
  if mid is null then raise exception 'two waiting players were not paired'; end if;
  reset role;
  select * into m from public.matches where id = mid;
  if not m.ranked or m.status <> 'active' or m.starts_at is null or m.ends_at is null then
    raise exception 'the found match is % ranked=% ', m.status, m.ranked;
  end if;
  if exists (select 1 from public.match_queue where user_id in (a, b)) then raise exception 'matched players are still queued'; end if;

  -- the waiting player learns of it by asking again, and so does the one who found it
  set local role authenticated;
  perform public.act_as(a);
  if public.find_match(0) is distinct from mid then raise exception 'the waiting player was not told of the match'; end if;
  perform public.act_as(b);
  if public.find_match(0) is distinct from mid then raise exception 'asking again opened a second match'; end if;
  reset role;

  -- b gives up: a wins, and the Elo moves by half of K at equal ratings
  set local role authenticated;
  perform public.act_as(b);
  perform public.forfeit_match(mid);
  reset role;
  select rating into ra from public.match_ratings where user_id = a;
  select rating into rb from public.match_ratings where user_id = b;
  if ra <> 1016 or rb <> 984 then raise exception 'ratings after one win: a=% b=%', ra, rb; end if;
  if (select rating_before || '>' || rating_after from public.match_players where match_id = mid and user_id = a) <> '1000>1016' then
    raise exception 'the result sheet does not know the winner''s rating change';
  end if;
  if (select games from public.match_ratings where user_id = a) <> 1 then raise exception 'games not counted'; end if;
  if (select rating from public.leaderboard_ranked where user_id = a) <> 1016 then raise exception 'ladder is wrong'; end if;
  if (select won || '/' || lost from public.leaderboard_ranked where user_id = b) <> '0/1' then raise exception 'ladder record is wrong'; end if;

  -- the same two are not paired again straight away
  set local role authenticated;
  perform public.act_as(a);
  if public.find_match(0) is not null then raise exception 'a rematch was made within ten minutes'; end if;
  perform public.leave_queue();
  perform public.act_as(b);
  if public.find_match(0) is not null then raise exception 'a rematch was made within ten minutes (other side)'; end if;
  perform public.leave_queue();
  reset role;

  -- a drawn ranked match between equals changes nothing but the game count; a void one changes nothing at all
  insert into public.matches (level, created_by, opponent_id, status, starts_at, ends_at, ranked)
  values (lv, c, d, 'active', now(), now() + interval '5 minutes', true) returning id into mid;
  insert into public.match_players (match_id, user_id, joined_at) values (mid, c, now()), (mid, d, now());
  update public.matches set status = 'done', winner_id = null where id = mid;
  if (select rating from public.match_ratings where user_id = c) <> 1000 or (select games from public.match_ratings where user_id = c) <> 1 then
    raise exception 'a draw between equals moved the rating';
  end if;
  insert into public.matches (level, created_by, opponent_id, status, ranked)
  values (lv, c, d, 'pending', true) returning id into again;
  update public.matches set status = 'void' where id = again;
  if (select games from public.match_ratings where user_id = c) <> 1 then raise exception 'a void match was rated'; end if;

  -- a friendly (unranked) match is never rated
  insert into public.matches (level, created_by, opponent_id, status, starts_at, ends_at)
  values (lv, c, d, 'active', now(), now() + interval '5 minutes') returning id into again;
  insert into public.match_players (match_id, user_id, joined_at) values (again, c, now()), (again, d, now());
  update public.matches set status = 'done', winner_id = c where id = again;
  if (select rating from public.match_ratings where user_id = c) <> 1000 then raise exception 'a friendly match was rated'; end if;

  -- nobody writes the queue or the ratings themselves
  set local role authenticated;
  perform public.act_as(a);
  begin
    insert into public.match_queue (user_id, tier) values (a, 0);
    raise exception 'a player wrote the queue';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.match_ratings set rating = 3000 where user_id = a;
    raise exception 'a player wrote a rating';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.match_ratings) < 2 then raise exception 'signed-in players cannot read the ratings'; end if;
  reset role;

  set local role anon;
  begin
    perform public.find_match(0);
    raise exception 'anon searched for a match';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;

rollback;
