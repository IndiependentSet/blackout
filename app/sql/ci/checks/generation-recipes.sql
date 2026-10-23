-- CI check for 2026-10-27-generation-recipes.sql: who may read and write the
-- shared generator recipes. Rolled back at the end, so it leaves nothing.
begin;

create or replace function public.act_as(p_uid uuid) returns void
language sql as $$
  select set_config('request.uid', p_uid::text, true),
         set_config('request.jwt.claim.sub', p_uid::text, true),
         set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id) values
  ('c4000000-0000-0000-0000-000000000001'), ('c4000000-0000-0000-0000-000000000002');
insert into public.profiles (id, username) values
  ('c4000000-0000-0000-0000-000000000001', 'ci_recipe_admin'),
  ('c4000000-0000-0000-0000-000000000002', 'ci_recipe_player');
insert into public.admins (user_id) values ('c4000000-0000-0000-0000-000000000001');

do $$
declare
  n int;
  saved jsonb;
begin
  -- signed out: can't read or write
  set local role anon;
  begin
    perform 1 from public.generation_recipes;
    raise exception 'anon can read recipes';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.save_generation_recipe('Open field', '{"strategy": "free"}', '');
    raise exception 'anon saved a recipe';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- a player: reads, but neither the functions nor the table take a write
  set local role authenticated;
  perform public.act_as('c4000000-0000-0000-0000-000000000002');
  perform count(*) from public.generation_recipes;
  begin
    perform public.save_generation_recipe('Open field', '{"strategy": "free"}', '');
    raise exception 'a player saved a recipe';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.generation_recipes (name, shape) values ('Open field', '{}');
    raise exception 'a player wrote generation_recipes directly';
  exception when insufficient_privilege then null;
  end;

  -- an admin: saves, re-saving a name replaces it, a non-object or a blank name is refused, deleting works once
  perform public.act_as('c4000000-0000-0000-0000-000000000001');
  perform public.save_generation_recipe('  Open field ', '{"strategy": "free"}', 'first');
  perform public.save_generation_recipe('Open field', '{"strategy": "free", "density": 1.6}', 'second');
  select count(*), max(shape::text)::jsonb into n, saved from public.generation_recipes;
  if n <> 1 then raise exception 're-saving a name made a second recipe (or the name was not trimmed)'; end if;
  if saved->>'density' is distinct from '1.6' then raise exception 'the re-save did not replace the shape'; end if;
  begin
    perform public.save_generation_recipe('Broken', '["free"]', '');
    raise exception 'a list was saved as a shape';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.save_generation_recipe('   ', '{}', '');
    raise exception 'a blank name was saved';
  exception when check_violation then null;
  end;
  perform public.delete_generation_recipe('Open field');
  select count(*) into n from public.generation_recipes;
  if n <> 0 then raise exception 'the deleted recipe is still there'; end if;
  begin
    perform public.delete_generation_recipe('Open field');
    raise exception 'deleted a recipe that does not exist';
  exception when raise_exception then
    if sqlerrm = 'deleted a recipe that does not exist' then raise; end if;
  end;
  reset role;
end $$;

rollback;
