-- CI check for 2026-10-23-nightly-match-pool.sql: the job (service role) can publish a
-- match pool and nothing else, a player cannot, an admin still can, and old match pools
-- are dropped. Rolled back at the end, so it leaves nothing.
begin;

create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', p_uid::text, true),
         set_config('request.jwt.claim.sub', p_uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id) values
  ('f1000000-0000-0000-0000-000000000001'), ('f1000000-0000-0000-0000-000000000002');
insert into public.profiles (id, username) values
  ('f1000000-0000-0000-0000-000000000001', 'ci_night_admin'), ('f1000000-0000-0000-0000-000000000002', 'ci_night_player');
insert into public.admins (user_id) values ('f1000000-0000-0000-0000-000000000001');

do $$
declare
  lv jsonb := '{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]],"k":1,"sol":[1],"stars":1}';
  pool jsonb;
  ver int;
  i int;
begin
  select jsonb_agg(jsonb_build_object('slot', s, 'tier', s / 2, 'level', lv)) into pool from generate_series(0, 3) s;

  -- the job publishes a match pool
  set local role service_role;
  ver := public.publish_match_pool_system('{}', pool, 'nightly');
  if ver <> 1 then raise exception 'first nightly pool is version %', ver; end if;
  begin
    perform public.publish_match_pool_system('{}', '[{"slot":0,"tier":0,"level":{"nodes":[]}}]', '');
    raise exception 'the job published a malformed level';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.publish_pool_unchecked('campaign', '{}', pool, '');
    raise exception 'the job reached the unchecked publisher';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- it can never publish another mode (there is no argument for it), and a player cannot publish at all
  set local role authenticated;
  perform public.act_as('f1000000-0000-0000-0000-000000000002');
  begin
    perform public.publish_match_pool_system('{}', pool, '');
    raise exception 'a player ran the job''s publisher';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.publish_level_pool('match', '{}', pool, '');
    raise exception 'a player published a pool';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- an admin still can
  set local role authenticated;
  perform public.act_as('f1000000-0000-0000-0000-000000000001');
  ver := public.publish_level_pool('survival', '{}', pool, 'admin');
  if ver <> 1 then raise exception 'admin survival pool is version %', ver; end if;
  reset role;

  -- only the newest seven match pools are kept
  set local role service_role;
  for i in 2..9 loop
    ver := public.publish_match_pool_system('{}', pool, 'nightly ' || i);
  end loop;
  reset role;
  if ver <> 9 then raise exception 'ninth nightly pool is version %', ver; end if;
  if (select count(*) from public.level_pools where mode = 'match') <> 7 then raise exception 'old match pools were not dropped'; end if;
  if (select min(version) from public.level_pools where mode = 'match') <> 3 then raise exception 'the wrong match pools were dropped'; end if;
  if exists (select 1 from public.pool_levels l where not exists (select 1 from public.level_pools p where p.id = l.pool_id)) then
    raise exception 'orphaned pool levels';
  end if;
  if (select count(*) from public.level_pools where mode = 'survival') <> 1 then raise exception 'another mode lost a pool'; end if;
end $$;

rollback;
