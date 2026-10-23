-- CI check for 2026-10-30-survival-no-repeat.sql: a survival run never meets
-- the same level twice before it has played every level of the tier it is on,
-- and the pick stays a pure function of (seed, step). Rolled back at the end.
begin;

create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', p_uid::text, true),
         set_config('request.jwt.claim.sub', p_uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id) values ('d3000000-0000-0000-0000-000000000001');
insert into public.profiles (id, username) values ('d3000000-0000-0000-0000-000000000001', 'ci_rush_admin');
insert into public.admins (user_id) values ('d3000000-0000-0000-0000-000000000001');

do $$
declare
  pool jsonb;
  seed text;
  seen jsonb[];
  got jsonb;
  i int;
begin
  -- tier 0: one level; tier 1 (the last): five, told apart by where they sit
  select jsonb_agg(jsonb_build_object('slot', s, 'tier', least(s, 1), 'level', jsonb_build_object(
    'nodes', jsonb_build_array(jsonb_build_object('c', 0, 'r', s), jsonb_build_object('c', 1, 'r', s),
                               jsonb_build_object('c', 2, 'r', s)),
    'edges', '[[0,1],[1,2]]'::jsonb, 'k', 1, 'sol', '[1]'::jsonb, 'stars', 1)))
    into pool from generate_series(0, 5) s;

  set local role authenticated;
  perform public.act_as('d3000000-0000-0000-0000-000000000001');
  perform public.publish_level_pool('survival', '{}', pool, 'ci no repeat');
  reset role;

  set local role anon;
  foreach seed in array array['a', 'b', 'seed', 'another run'] loop
    seen := '{}';
    -- steps 1..5 walk the last tier: five different levels
    for i in 1..5 loop
      got := public.survival_level(seed, i);
      if got = any(seen) then raise exception 'seed %: step % repeats an earlier site', seed, i; end if;
      seen := seen || got;
    end loop;
    -- then the tier starts over, in the same order
    if public.survival_level(seed, 6) is distinct from public.survival_level(seed, 1) then
      raise exception 'seed %: step 6 does not start the tier over', seed;
    end if;
    if public.survival_level(seed, 3) is distinct from public.survival_level(seed, 3) then
      raise exception 'seed %: survival_level is not stable', seed;
    end if;
  end loop;
  reset role;
end $$;

rollback;
