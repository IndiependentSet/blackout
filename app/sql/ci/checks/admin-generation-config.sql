-- CI check for 2026-10-07-admin-generation-config.sql: who may read and write
-- the saved generation configs. Rolled back at the end, so it leaves nothing.
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
  ('c1000000-0000-0000-0000-000000000001'), ('c1000000-0000-0000-0000-000000000002');
insert into public.profiles (id, username) values
  ('c1000000-0000-0000-0000-000000000001', 'ci_admin'),
  ('c1000000-0000-0000-0000-000000000002', 'ci_player');
insert into public.admins (user_id) values ('c1000000-0000-0000-0000-000000000001');

do $$
declare
  today int := public.current_puzzle_day();
  sched jsonb := '{"version": 1, "sites": [{}, {}, {}, {}, {}, {}, {}]}';
  first_id bigint;
  again_id bigint;
  n int;
begin
  -- signed out: reads configs, is no admin, can't save or see the admin list
  set local role anon;
  perform count(*) from public.generation_configs;
  if public.is_admin() then raise exception 'anon counts as an admin'; end if;
  begin
    perform public.save_generation_config('daily', today + 1, sched, '');
    raise exception 'anon saved a config';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.admins;
    raise exception 'anon can read admins';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- signed in, not an admin: refused by the function and by the table
  set local role authenticated;
  perform public.act_as('c1000000-0000-0000-0000-000000000002');
  if public.is_admin() then raise exception 'a player counts as an admin'; end if;
  begin
    perform public.save_generation_config('daily', today + 1, sched, '');
    raise exception 'a player saved a config';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.generation_configs (mode, effective_from_day, schedule) values ('daily', today + 1, sched);
    raise exception 'a player wrote generation_configs directly';
  exception when insufficient_privilege then null;
  end;

  -- an admin: never today, never a non-schedule; tomorrow on, re-saving replaces
  perform public.act_as('c1000000-0000-0000-0000-000000000001');
  if not public.is_admin() then raise exception 'the admin is not an admin'; end if;
  begin
    perform public.save_generation_config('daily', today, sched, '');
    raise exception 'a config was saved for today';
  exception when raise_exception then
    if sqlerrm = 'a config was saved for today' then raise; end if;
  end;
  begin
    perform public.save_generation_config('daily', today + 1, '{"version": 1, "sites": []}', '');
    raise exception 'a schedule without 7 sites was saved';
  exception when raise_exception then
    if sqlerrm = 'a schedule without 7 sites was saved' then raise; end if;
  end;
  first_id := public.save_generation_config('daily', today + 1, sched, 'first');
  again_id := public.save_generation_config('daily', today + 1, sched, 'second');
  if first_id is distinct from again_id then raise exception 're-saving a day made a second row'; end if;
  select count(*) into n from public.generation_configs where note = 'second';
  if n <> 1 then raise exception 'the re-save did not replace the note'; end if;

  -- cancelling a scheduled config works; an unknown one is refused
  perform public.delete_generation_config(first_id);
  select count(*) into n from public.generation_configs;
  if n <> 0 then raise exception 'the cancelled config is still there'; end if;
  begin
    perform public.delete_generation_config(first_id);
    raise exception 'cancelled a config that does not exist';
  exception when raise_exception then
    if sqlerrm = 'cancelled a config that does not exist' then raise; end if;
  end;
  reset role;
end $$;

rollback;
