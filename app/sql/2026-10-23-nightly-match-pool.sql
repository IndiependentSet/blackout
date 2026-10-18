-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md). Safe to run twice.
--
-- Why: the 1vs1 pool is small (a couple of dozen levels) and an admin had to
-- publish it by hand, so ranked players met the same maps over and over. A
-- scheduled job (.github/workflows/publish-match-pool.yml,
-- app/tools/publish-match-pool.ts) now publishes a fresh 1vs1 pool every night.
--
--   publish_pool_unchecked(mode, curve, levels, note)   the body publish_level_pool always had (shape and level
--       checks, next version, insert), with no caller check. Internal: nobody can execute it directly.
--   publish_level_pool(...)          unchanged for admins: is_admin() first, then the above.
--   publish_match_pool_system(curve, levels, note)    the same for the job: service role only, mode fixed to
--       'match' (campaign and survival stay an admin's decision), and it keeps only the newest 7 match pools. A
--       match already made keeps its level in matches.level, so dropping an old pool changes nothing under it.
--
-- Access: unchanged tables and RLS. The job cannot publish anything but a match pool.

create or replace function public.publish_pool_unchecked(p_mode text, p_curve jsonb, p_levels jsonb, p_note text)
returns int language plpgsql security definer set search_path = public as $$
declare
  n int;
  min_slot int;
  max_slot int;
  tier_count int;
  max_tier int;
  min_tier int;
  ver int;
  pool bigint;
begin
  if p_mode is null or p_mode not in ('campaign', 'survival', 'match') then
    raise exception 'unknown pool mode' using errcode = '22023';
  end if;
  if jsonb_typeof(p_curve) is distinct from 'object' or jsonb_typeof(p_levels) is distinct from 'array' then
    raise exception 'not a pool: expected a curve object and a list of levels' using errcode = '22023';
  end if;
  n := jsonb_array_length(p_levels);
  if n < 1 or n > 400 then
    raise exception 'a pool holds 1 to 400 levels' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_levels) as x
    where jsonb_typeof(x) is distinct from 'object'
       or coalesce(x ->> 'slot', '') !~ '^[0-9]{1,4}$'
       or coalesce(x ->> 'tier', '') !~ '^[0-9]{1,2}$'
       or not public.level_is_valid(x -> 'level')
  ) then
    raise exception 'a pool entry is malformed' using errcode = '22023';
  end if;

  select count(distinct (x ->> 'slot')::int), min((x ->> 'slot')::int), max((x ->> 'slot')::int),
         count(distinct (x ->> 'tier')::int), min((x ->> 'tier')::int), max((x ->> 'tier')::int)
    into n, min_slot, max_slot, tier_count, min_tier, max_tier
    from jsonb_array_elements(p_levels) as x;
  if n <> jsonb_array_length(p_levels) then
    raise exception 'two levels share a slot' using errcode = '22023';
  end if;
  if p_mode = 'campaign' then
    if n <> 100 or min_slot <> 1 or max_slot <> 100 then
      raise exception 'a campaign pool needs exactly levels 1 to 100' using errcode = '22023';
    end if;
  elsif min_slot <> 0 or max_slot <> n - 1 then
    raise exception 'slots must run 0 to %', n - 1 using errcode = '22023';
  end if;
  if min_tier <> 0 or tier_count <> max_tier + 1 then
    raise exception 'tiers must run from 0 with no gap' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('level_pools:' || p_mode));
  select coalesce(max(version), 0) + 1 into ver from public.level_pools where mode = p_mode;

  insert into public.level_pools (mode, version, curve, note, level_count, created_by)
  values (p_mode, ver, p_curve, coalesce(p_note, ''), n, auth.uid())
  returning id into pool;

  insert into public.pool_levels (pool_id, slot, tier, level)
  select pool, (x ->> 'slot')::int, (x ->> 'tier')::int, x -> 'level'
    from jsonb_array_elements(p_levels) as x;

  return ver;
end;
$$;

create or replace function public.publish_level_pool(p_mode text, p_curve jsonb, p_levels jsonb, p_note text default '')
returns int language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can publish level pools' using errcode = '42501';
  end if;
  return public.publish_pool_unchecked(p_mode, p_curve, p_levels, p_note);
end;
$$;

create or replace function public.publish_match_pool_system(p_curve jsonb, p_levels jsonb, p_note text default '')
returns int language plpgsql security definer set search_path = public as $$
declare
  ver int;
begin
  ver := public.publish_pool_unchecked('match', p_curve, p_levels, p_note);
  -- keep the newest seven; the levels of the others go with them
  delete from public.level_pools where mode = 'match' and version <= ver - 7;
  return ver;
end;
$$;

revoke all on function public.publish_pool_unchecked(text, jsonb, jsonb, text) from public, anon, authenticated, service_role;
revoke all on function public.publish_level_pool(text, jsonb, jsonb, text) from public, anon, authenticated, service_role;
revoke all on function public.publish_match_pool_system(jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.publish_level_pool(text, jsonb, jsonb, text) to authenticated;
grant execute on function public.publish_match_pool_system(jsonb, jsonb, text) to service_role;
