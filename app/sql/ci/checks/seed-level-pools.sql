-- CI check for 2026-10-28-seed-level-pools.sql: the job (service role) can seed a campaign or survival pool once,
-- never replace one, never touch another mode, and a player cannot call it. Rolled back at the end.
begin;

do $$
declare
  lv jsonb := '{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]],"k":1,"sol":[1],"stars":1}';
  camp jsonb;
  pool jsonb;
  ver int;
begin
  select jsonb_agg(jsonb_build_object('slot', s, 'tier', 0, 'level', lv)) into camp from generate_series(1, 100) s;
  select jsonb_agg(jsonb_build_object('slot', s, 'tier', s / 2, 'level', lv)) into pool from generate_series(0, 3) s;

  set local role service_role;
  ver := public.publish_seed_pool_system('campaign', '{}', camp, 'seed');
  if ver <> 1 then raise exception 'first campaign pool is version %', ver; end if;
  begin
    perform public.publish_seed_pool_system('campaign', '{}', camp, 'seed');
    raise exception 'the job replaced a published pool';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.publish_seed_pool_system('match', '{}', pool, 'seed');
    raise exception 'the job seeded the match pool';
  exception when invalid_parameter_value then null;
  end;
  ver := public.publish_seed_pool_system('survival', '{}', pool, 'seed');
  if ver <> 1 then raise exception 'first survival pool is version %', ver; end if;

  set local role authenticated;
  begin
    perform public.publish_seed_pool_system('survival', '{}', pool, 'seed');
    raise exception 'a player seeded a pool';
  exception when insufficient_privilege then null;
  end;
  reset role;
end;
$$;

rollback;
