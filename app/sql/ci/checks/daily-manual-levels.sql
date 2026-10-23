-- CI check for 2026-10-31-daily-manual-levels.sql: only admins pin a hand-drawn sky, only to a future day that is
-- not published yet, players can never read one, and the job (service role) can. Rolled back at the end.
begin;

create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', p_uid::text, true),
         set_config('request.jwt.claim.sub', p_uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id) values
  ('c5000000-0000-0000-0000-000000000001'), ('c5000000-0000-0000-0000-000000000002');
insert into public.profiles (id, username) values
  ('c5000000-0000-0000-0000-000000000001', 'ci_drawn_admin'),
  ('c5000000-0000-0000-0000-000000000002', 'ci_drawn_player');
insert into public.admins (user_id) values ('c5000000-0000-0000-0000-000000000001');

do $$
declare
  lv jsonb := '{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]],"adj":[[1],[0,2],[1]],"k":1,"sol":[1],"stars":1}';
  fig jsonb := '{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]]}';
  tomorrow int := public.current_puzzle_day() + 1;
  n int;
begin
  -- signed out: no table, no functions
  set local role anon;
  begin
    perform 1 from public.daily_manual_levels;
    raise exception 'anon can read hand-drawn skies';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_daily_manual_level(tomorrow, 0, lv, fig, '');
    raise exception 'anon pinned a hand-drawn sky';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- a player: neither the table nor the functions
  set local role authenticated;
  perform public.act_as('c5000000-0000-0000-0000-000000000002');
  begin
    perform 1 from public.daily_manual_levels;
    raise exception 'a player can read hand-drawn skies';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_daily_manual_level(tomorrow, 0, lv, fig, '');
    raise exception 'a player pinned a hand-drawn sky';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.list_daily_manual_levels();
    raise exception 'a player listed hand-drawn skies';
  exception when insufficient_privilege then null;
  end;

  -- an admin: pins, re-pins, lists, deletes; never today, never junk, never a published day
  perform public.act_as('c5000000-0000-0000-0000-000000000001');
  perform public.save_daily_manual_level(tomorrow, 3, lv, fig, 'first');
  perform public.save_daily_manual_level(tomorrow, 3, lv, fig, 'second');
  select count(*) into n from public.list_daily_manual_levels() where day = tomorrow and idx = 3 and note = 'second';
  if n <> 1 then raise exception 're-pinning did not replace the sky (% rows)', n; end if;
  begin
    perform public.save_daily_manual_level(public.current_puzzle_day(), 0, lv, fig, '');
    raise exception 'a sky was pinned to today';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.save_daily_manual_level(tomorrow, 7, lv, fig, '');
    raise exception 'a sky past the seventh was pinned';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.save_daily_manual_level(tomorrow, 0, '{"nodes":[]}', fig, '');
    raise exception 'a malformed level was pinned';
  exception when invalid_parameter_value then null;
  end;
  reset role;

  -- a day the job already published can't take one
  insert into public.daily_levels (day, idx, level) values (tomorrow, 5, lv);
  set local role authenticated;
  perform public.act_as('c5000000-0000-0000-0000-000000000001');
  begin
    perform public.save_daily_manual_level(tomorrow, 5, lv, fig, '');
    raise exception 'a sky was pinned over a published one';
  exception when invalid_parameter_value then null;
  end;
  reset role;

  -- the job reads it
  set local role service_role;
  select count(*) into n from public.daily_manual_levels where day = tomorrow;
  if n <> 1 then raise exception 'the service role sees % pinned skies', n; end if;
  reset role;

  set local role authenticated;
  perform public.act_as('c5000000-0000-0000-0000-000000000001');
  perform public.delete_daily_manual_level(tomorrow, 3);
  select count(*) into n from public.list_daily_manual_levels() where day = tomorrow;
  if n <> 0 then raise exception 'the deleted sky is still there'; end if;
  begin
    perform public.delete_daily_manual_level(tomorrow, 3);
    raise exception 'deleted a sky that does not exist';
  exception when no_data_found then null;
  end;
  reset role;
end $$;

rollback;
