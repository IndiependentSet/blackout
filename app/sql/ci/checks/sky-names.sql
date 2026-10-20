-- CI check for 2026-10-25-sky-names.sql: a player names their own nights (and
-- renames one by naming it again), cannot read or write anyone else's, and a
-- blank, overlong or malformed entry is refused. Rolled back at the end.
begin;

create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', p_uid::text, true),
         set_config('request.jwt.claim.sub', p_uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;
grant execute on function public.act_as(uuid) to authenticated;

insert into auth.users (id) values
  ('5a000000-0000-0000-0000-000000000001'), ('5a000000-0000-0000-0000-000000000002');
insert into public.profiles (id, username) values
  ('5a000000-0000-0000-0000-000000000001', 'skyann'), ('5a000000-0000-0000-0000-000000000002', 'skybob');

set local role authenticated;

do $$
declare
  ann uuid := '5a000000-0000-0000-0000-000000000001';
  bob uuid := '5a000000-0000-0000-0000-000000000002';
  fig jsonb := '{"nodes":[{"c":0,"r":0},{"c":1,"r":0}],"edges":[[0,1]]}';
  n int;
  got text;
begin
  perform public.act_as(ann);
  insert into public.sky_names (user_id, day_number, name, figure) values (ann, 412, 'The Crooked Kite', fig);
  insert into public.sky_names (user_id, day_number, name, figure) values (ann, 412, 'Little Heron', fig)
    on conflict (user_id, day_number) do update set name = excluded.name, figure = excluded.figure;
  select name into got from public.sky_names where user_id = ann and day_number = 412;
  if got <> 'Little Heron' then raise exception 'naming a night again did not rename it'; end if;

  begin
    insert into public.sky_names (user_id, day_number, name, figure) values (bob, 412, 'Not mine', fig);
    raise exception 'a player named someone else''s night';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.sky_names (user_id, day_number, name, figure) values (ann, 413, '   ', fig);
    raise exception 'a blank name was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.sky_names (user_id, day_number, name, figure) values (ann, 413, repeat('x', 41), fig);
    raise exception 'a 41-character name was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.sky_names (user_id, day_number, name, figure) values (ann, 413, 'Shapeless', '{"nodes":3}');
    raise exception 'a malformed figure was accepted';
  exception when check_violation then null;
  end;

  perform public.act_as(bob);
  select count(*) into n from public.sky_names;
  if n <> 0 then raise exception 'a player could read someone else''s names'; end if;
  update public.sky_names set name = 'Hijacked' where user_id = ann;
  perform public.act_as(ann);
  select name into got from public.sky_names where user_id = ann and day_number = 412;
  if got <> 'Little Heron' then raise exception 'a player renamed someone else''s night'; end if;
end $$;

rollback;
