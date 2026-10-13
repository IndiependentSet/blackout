-- CI check for 2026-10-21-daily-levels.sql: anyone reads the week, nobody but
-- the service role writes it, and a malformed or oversized level is refused.
-- Rolled back at the end, so it leaves nothing.
begin;

do $$
declare
  lv jsonb := '{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]],"k":1,"sol":[1],"stars":1}';
  big jsonb;
  n int;
begin
  -- the job (service role) writes a level, once
  set local role service_role;
  insert into public.daily_levels (day, idx, level) values (9001, 0, lv);
  begin
    insert into public.daily_levels (day, idx, level) values (9001, 0, lv);
    raise exception 'a day''s site was written twice';
  exception when unique_violation then null;
  end;
  begin
    insert into public.daily_levels (day, idx, level) values (9001, 1, '{"nodes":[]}');
    raise exception 'a malformed level was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    insert into public.daily_levels (day, idx, level) values (9001, 7, lv);
    raise exception 'a site past the seventh was accepted';
  exception when check_violation then null;
  end;
  select jsonb_build_object(
    'nodes', (select jsonb_agg(jsonb_build_object('c', s, 'r', 0)) from generate_series(0, 40) s),
    'edges', (select jsonb_agg(jsonb_build_array(s, s + 1)) from generate_series(0, 39) s),
    'k', 20,
    'sol', (select jsonb_agg(s) from generate_series(1, 40, 2) s),
    'stars', 1) into big;
  -- 41 junctions on a path: the cover below (odd nodes) is 20 cats and valid, so only the size rule can refuse it
  begin
    insert into public.daily_levels (day, idx, level) values (9001, 2, big);
    raise exception 'a 41-junction level was accepted';
  exception when invalid_parameter_value then null;
  end;
  reset role;

  -- anyone reads it; nobody else writes or deletes it
  set local role anon;
  select count(*) into n from public.daily_levels where day = 9001;
  if n <> 1 then raise exception 'anon sees % rows of day 9001', n; end if;
  begin
    insert into public.daily_levels (day, idx, level) values (9001, 3, lv);
    raise exception 'anon wrote a daily level';
  exception when insufficient_privilege then null;
  end;
  reset role;

  set local role authenticated;
  begin
    insert into public.daily_levels (day, idx, level) values (9001, 3, lv);
    raise exception 'a signed-in player wrote a daily level';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.daily_levels where day = 9001;
    raise exception 'a signed-in player deleted a daily level';
  exception when insufficient_privilege then null;
  end;
  reset role;
end $$;

rollback;
