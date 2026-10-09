-- CI check for 2026-10-20-level-pools.sql: who may publish a pool, that the
-- server (not the client) picks survival and campaign levels, and that a cover
-- is judged against the pooled level. Rolled back at the end, so it leaves nothing.
begin;

-- Act as a user in a check. Sets both settings auth.uid() can read: the stub
-- (CI) reads request.uid, Supabase reads the JWT claims. Transaction-local.
create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', p_uid::text, true),
         set_config('request.jwt.claim.sub', p_uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id) values
  ('d1000000-0000-0000-0000-000000000001'), ('d1000000-0000-0000-0000-000000000002');
insert into public.profiles (id, username) values
  ('d1000000-0000-0000-0000-000000000001', 'ci_pool_admin'),
  ('d1000000-0000-0000-0000-000000000002', 'ci_pool_player');
insert into public.admins (user_id) values ('d1000000-0000-0000-0000-000000000001');

do $$
declare
  lv jsonb := '{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]],"k":1,"sol":[1],"stars":1}';
  campaign jsonb;
  survival jsonb;
  ver int;
  run_id uuid;
  got jsonb;
begin
  select jsonb_agg(jsonb_build_object('slot', s, 'tier', 0, 'level', lv)) into campaign from generate_series(1, 100) s;
  select jsonb_agg(jsonb_build_object('slot', s, 'tier', s / 2, 'level', lv)) into survival from generate_series(0, 3) s;

  -- nothing published: the readers say so
  set local role anon;
  begin
    perform public.survival_level('seed', 0);
    raise exception 'survival_level answered with no pool';
  exception when no_data_found then null;
  end;
  reset role;

  -- a player cannot publish, and cannot write the tables
  set local role authenticated;
  perform public.act_as('d1000000-0000-0000-0000-000000000002');
  begin
    perform public.publish_level_pool('survival', '{}', survival, '');
    raise exception 'a player published a pool';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.level_pools (mode, version, curve, level_count) values ('survival', 1, '{}', 1);
    raise exception 'a player wrote level_pools directly';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- the admin can, but only a well-formed pool
  set local role authenticated;
  perform public.act_as('d1000000-0000-0000-0000-000000000001');
  begin
    perform public.publish_level_pool('campaign', '{}', survival, '');
    raise exception 'a campaign pool with 4 levels was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.publish_level_pool('survival', '{}', '[{"slot":0,"tier":0,"level":{"nodes":[]}}]', '');
    raise exception 'a malformed level was accepted';
  exception when invalid_parameter_value then null;
  end;
  ver := public.publish_level_pool('campaign', '{}', campaign, 'ci');
  if ver <> 1 then raise exception 'first campaign pool is version %', ver; end if;
  ver := public.publish_level_pool('campaign', '{}', campaign, 'ci again');
  if ver <> 2 then raise exception 'second campaign pool is version %', ver; end if;
  ver := public.publish_level_pool('survival', '{}', survival, 'ci');
  if ver <> 1 then raise exception 'first survival pool is version %', ver; end if;
  reset role;

  -- anyone reads a campaign level; survival levels follow the seed
  set local role anon;
  if public.campaign_level(57) is null then raise exception 'campaign level 57 missing'; end if;
  if public.survival_level('seed', 0) is distinct from public.survival_level('seed', 0) then
    raise exception 'survival_level is not stable';
  end if;
  reset role;

  -- a run is judged against the level the server derives
  set local role authenticated;
  perform public.act_as('d1000000-0000-0000-0000-000000000002');
  run_id := public.start_survival_run('seed');
  begin
    perform public.submit_survival_site(run_id, 0, array[0]);
    raise exception 'a cover that misses an edge was banked';
  exception when invalid_parameter_value then null;
  end;
  got := public.submit_survival_site(run_id, 0, array[1]);
  if (got ->> 'sites')::int <> 1 then raise exception 'the good cover was not banked: %', got; end if;
  begin
    perform public.submit_survival_site(run_id, 0, array[1]);
    raise exception 'a site was banked twice';
  exception when others then null;
  end;
  reset role;
end $$;

rollback;
