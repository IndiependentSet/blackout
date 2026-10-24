-- A first voyage clear failed with "permission denied for function campaign_pool_version".
--
-- 2026-10-29 made the campaign_clears insert trigger call campaign_pool_version, and revoked execute on that function
-- from authenticated. The trigger function is security invoker, so it ran as the player and could not call it.
-- Run the trigger function as its owner instead; the helper stays unreachable from the client.

create or replace function public.campaign_clears_set_pool()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.pool_version is null then
    new.pool_version := public.campaign_pool_version(new.user_id);
  end if;
  return new;
end;
$$;

revoke all on function public.campaign_clears_set_pool() from public, anon, authenticated;
