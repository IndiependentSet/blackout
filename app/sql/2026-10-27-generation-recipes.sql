-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md). Safe to run twice.
--
-- Why: the admin pages share named generator settings. A recipe is the shape
-- of a sky (domain/generation/recipe.ts: strategy, degree, geometry, the gadget
-- or free-graph mix), saved once and applied to Tonight's skies, pool tiers
-- and the playground. Applying one COPIES its shape into the schedule or curve,
-- so nothing the game plays ever reads this table: a saved schedule or a
-- published pool stays exactly what it was, whatever happens to a recipe.
--
--   generation_recipes  one row per name; `shape` is checked client-side by
--                       parseShape (on save and again on every load).
--
-- Who may do what: any signed-in player may read the recipes (they only
-- describe graphs, and only the admin pages ask); only the admin-checked
-- functions below can write them. The table itself takes no writes.

create table if not exists public.generation_recipes (
  name text primary key check (char_length(btrim(name)) between 1 and 40 and name = btrim(name)),
  shape jsonb not null check (jsonb_typeof(shape) = 'object'),
  note text not null default '' check (char_length(note) <= 200),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

revoke all on public.generation_recipes from anon, authenticated;
grant select (name, shape, note, updated_at) on public.generation_recipes to authenticated;

-- Save a recipe under a name, replacing the one of that name if there is one.
create or replace function public.save_generation_recipe(p_name text, p_shape jsonb, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can change level generation' using errcode = '42501';
  end if;
  if jsonb_typeof(p_shape) is distinct from 'object' then
    raise exception 'not a shape: expected an object of generator options' using errcode = '22023';
  end if;
  insert into public.generation_recipes (name, shape, note, updated_by)
  values (btrim(p_name), p_shape, coalesce(p_note, ''), auth.uid())
  on conflict (name) do update
    set shape = excluded.shape, note = excluded.note, updated_by = excluded.updated_by, updated_at = now();
end;
$$;

revoke all on function public.save_generation_recipe(text, jsonb, text) from public, anon, authenticated;
grant execute on function public.save_generation_recipe(text, jsonb, text) to authenticated;

-- Delete a recipe. Skies and tiers it was applied to keep their copy.
create or replace function public.delete_generation_recipe(p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can change level generation' using errcode = '42501';
  end if;
  delete from public.generation_recipes where name = p_name;
  if not found then
    raise exception 'no recipe called %', p_name;
  end if;
end;
$$;

revoke all on function public.delete_generation_recipe(text) from public, anon, authenticated;
grant execute on function public.delete_generation_recipe(text) to authenticated;
