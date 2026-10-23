-- A voyage stays on the pool it started on. Until now a player kept the pool of the levels they had cleared, but the
-- next level, not cleared yet, came from the newest pool, so a republish mixed two worlds in one voyage.
--
--   campaign_pool_version(uid)   the pool version of the player's furthest clear (highest level) that has one, or the
--                                newest pool for a player with no clears yet.
--
-- campaign_level(n) serves a cleared level from the version it was cleared on (as before), any other level from
-- campaign_pool_version, and a first clear is stamped with the same version. Republishing therefore only reaches
-- players who have not started. Old versions are kept for good (only the match pool prunes).

create or replace function public.campaign_pool_version(p_uid uuid)
returns int language sql stable security definer set search_path = public as $$
  select coalesce(
    (select pool_version from public.campaign_clears
      where user_id = p_uid and pool_version is not null
      order by level_no desc limit 1),
    (select version from public.level_pools where mode = 'campaign' order by version desc limit 1)
  );
$$;

create or replace function public.campaign_clears_set_pool()
returns trigger language plpgsql as $$
begin
  if new.pool_version is null then
    new.pool_version := public.campaign_pool_version(new.user_id);
  end if;
  return new;
end;
$$;

create or replace function public.campaign_level(p_level_no int)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v int;
  pool bigint;
  lv jsonb;
begin
  if p_level_no is null or p_level_no not between 1 and 100 then
    raise exception 'campaign levels are 1 to 100' using errcode = '22023';
  end if;
  if uid is not null then
    select pool_version into v from public.campaign_clears where user_id = uid and level_no = p_level_no;
    if v is null then v := public.campaign_pool_version(uid); end if;
    if v is not null then
      select id into pool from public.level_pools where mode = 'campaign' and version = v;
    end if;
  end if;
  if pool is null then pool := public.latest_pool('campaign'); end if;
  if pool is null then
    raise exception 'no campaign levels published' using errcode = 'P0002';
  end if;
  select level into lv from public.pool_levels where pool_id = pool and slot = p_level_no;
  if lv is null then
    raise exception 'campaign level % is missing from the pool', p_level_no using errcode = 'P0002';
  end if;
  return lv;
end;
$$;

revoke all on function public.campaign_pool_version(uuid) from public, anon, authenticated;
