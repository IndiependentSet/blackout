-- One-shot publish of the campaign and survival pools from CI (tools/publish-pools.ts, run by hand from the
-- publish-pools workflow), for a deployment where no admin has published them yet.
--
--   publish_seed_pool_system(mode, curve, levels, note)   service role only; campaign or survival only; refuses
--                                                         when that mode already has a pool, so it can never
--                                                         replace one an admin published.
--
-- The checks on shape and levels are publish_pool_unchecked's.

create or replace function public.publish_seed_pool_system(p_mode text, p_curve jsonb, p_levels jsonb, p_note text default '')
returns int language plpgsql security definer set search_path = public as $$
begin
  if p_mode not in ('campaign', 'survival') then
    raise exception 'only campaign and survival can be seeded' using errcode = 'invalid_parameter_value';
  end if;
  if exists (select 1 from public.level_pools where mode = p_mode) then
    raise exception 'a % pool is already published', p_mode using errcode = 'invalid_parameter_value';
  end if;
  return public.publish_pool_unchecked(p_mode, p_curve, p_levels, p_note);
end;
$$;

revoke all on function public.publish_seed_pool_system(text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.publish_seed_pool_system(text, jsonb, jsonb, text) to service_role;
