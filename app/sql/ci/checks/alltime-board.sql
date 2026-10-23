-- CI check for 2026-11-02-alltime-board.sql: the all-time board adds up every night a player has charted, ranks by
-- points, then skies at par, then nights played, and still reads for a signed-out caller. Rolled back at the end.
begin;

create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', coalesce(p_uid::text, ''), true),
         set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
grant execute on function public.act_as(uuid) to anon, authenticated;

insert into auth.users (id) values ('b0f00000-0000-0000-0000-000000000001'), ('b0f00000-0000-0000-0000-000000000002'), ('b0f00000-0000-0000-0000-000000000003');
insert into public.profiles (id, username) values
  ('b0f00000-0000-0000-0000-000000000001', 'ci_all_a'), ('b0f00000-0000-0000-0000-000000000002', 'ci_all_b'), ('b0f00000-0000-0000-0000-000000000003', 'ci_all_c');

-- A: three nights, 30 points (3 x 10), all at par. B: one night, 30 points (3 skies of 10), all at par: ties A on points
-- and par count, so A's three nights put A first. C: 5 points, one star over par.
insert into public.site_clears (user_id, day_number, site_index, cats_used, par, on_budget, stars) values
  ('b0f00000-0000-0000-0000-000000000001', 700, 0, 3, 3, true, 1),
  ('b0f00000-0000-0000-0000-000000000001', 710, 0, 3, 3, true, 1),
  ('b0f00000-0000-0000-0000-000000000001', 720, 0, 3, 3, true, 1),
  ('b0f00000-0000-0000-0000-000000000002', 700, 0, 3, 3, true, 1),
  ('b0f00000-0000-0000-0000-000000000002', 700, 1, 3, 3, true, 1),
  ('b0f00000-0000-0000-0000-000000000002', 700, 2, 3, 3, true, 1),
  ('b0f00000-0000-0000-0000-000000000003', 700, 0, 4, 3, false, 1);

set local role authenticated;
do $$
declare
  a uuid := 'b0f00000-0000-0000-0000-000000000001';
  b uuid := 'b0f00000-0000-0000-0000-000000000002';
  c uuid := 'b0f00000-0000-0000-0000-000000000003';
  r record;
begin
  perform public.act_as(c);
  select * into r from public.board_rows('alltime', null, array[a, b, c], 20) where user_id = a;
  if r.place <> 1 or r.value <> 30 or r.extra <> 3 then raise exception 'all time: A should lead on 30 points, 3 at par, got place % value % extra %', r.place, r.value, r.extra; end if;
  select * into r from public.board_rows('alltime', null, array[a, b, c], 20) where user_id = b;
  if r.place <> 2 or r.value <> 30 then raise exception 'all time: B should be 2nd on the same points with fewer nights, got place %', r.place; end if;
  select * into r from public.board_rows('alltime', null, array[a, b, c], 20) where user_id = c;
  if r.place <> 3 or r.value <> 5 or not r.is_me or r.total <> 3 then raise exception 'all time: C should be 3rd of 3 on 5 points'; end if;
  if r.trend is not null then raise exception 'all time has no trend'; end if;
end $$;

reset role;
set local role anon;
do $$
declare n int;
begin
  perform public.act_as(null);
  select count(*) into n from public.board_rows('alltime', null, array['b0f00000-0000-0000-0000-000000000001'::uuid], 20);
  if n <> 1 then raise exception 'signed out: the all-time board should read, got % rows', n; end if;
end $$;

rollback;
