-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md). Safe to run twice.
--
-- Why: campaign, survival and 1vs1 played on mock maps, and the server took
-- whatever level the client handed it (create_match / submit_survival_site had
-- a `p_level jsonb`). Levels now come from a POOL an admin generates ahead of
-- time (screens/LevelPools, curve = domain/generation/curve.ts), checks and
-- publishes. Players only ever read the pool, and the server picks the level
-- itself, so a client can no longer choose its own graph.
--
--   level_pools      one published pool per (mode, version): the curve that
--                    made it, who published it and when. A new pool never
--                    overwrites the old one; the highest version is live.
--   pool_levels      the levels: (pool, slot) -> tier + level jsonb.
--                      campaign   slot = level number, 1..100
--                      survival   slot = 0..n-1, tier = how deep into a run
--                      match      slot = 0..n-1, tier = difficulty
--
--   publish_level_pool(mode, curve, levels, note)  admin only; checks every
--       level with level_is_valid and the slot / tier layout, then publishes
--       it as the next version. It cannot prove a level's optimum is unique:
--       the generator guarantees that and the admin page re-checks it with
--       the solver before it sends anything.
--   campaign_level(n)         level n. A player who has cleared n keeps the
--       pool version they cleared it on (campaign_clears.pool_version), so a
--       new pool never moves the par under a record; everyone else gets the
--       live pool.
--   survival_level(seed, step) the level for a step of a run: the tier is the
--       step (the last tier once it runs out), the pick within it is a hash
--       of seed and step, so the same run always sees the same sites.
--   start_survival_run(seed) / submit_survival_site(run, step, nodes) the run
--       remembers its seed and pool; the server re-derives each level and
--       checks the cats against it. The client no longer sends a level.
--   create_match(opponent, tier) the server picks a random level of that tier
--       from the live match pool and stores it in the match, as before.
--
-- Access: RLS is on for both tables; anyone may read, nobody may write
-- directly. publish_level_pool is the only writer and checks is_admin().
-- Pools with no row (nothing published yet) make the three modes answer
-- 'no ... levels published', which the app shows as such.

create table if not exists public.level_pools (
  id bigint generated always as identity primary key,
  mode text not null check (mode in ('campaign', 'survival', 'match')),
  version int not null check (version >= 1),
  curve jsonb not null,
  note text not null default '',
  level_count int not null check (level_count >= 1),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (mode, version)
);

create table if not exists public.pool_levels (
  pool_id bigint not null references public.level_pools (id) on delete cascade,
  slot int not null check (slot >= 0),
  tier int not null check (tier >= 0),
  level jsonb not null,
  primary key (pool_id, slot)
);

create index if not exists pool_levels_tier_idx on public.pool_levels (pool_id, tier, slot);

alter table public.level_pools enable row level security;
alter table public.pool_levels enable row level security;

drop policy if exists level_pools_read on public.level_pools;
create policy level_pools_read on public.level_pools for select to anon, authenticated using (true);
drop policy if exists pool_levels_read on public.pool_levels;
create policy pool_levels_read on public.pool_levels for select to anon, authenticated using (true);

revoke all on public.level_pools, public.pool_levels from anon, authenticated;
grant select on public.level_pools, public.pool_levels to anon, authenticated;

-- ============================================================
-- Reading a pool
-- ============================================================

create or replace function public.latest_pool(p_mode text)
returns bigint language sql stable set search_path = public as $$
  select id from public.level_pools where mode = p_mode order by version desc limit 1;
$$;

-- The level a (key, step) maps to in a pool: tier = step, capped at the last
-- tier; the pick inside the tier is a stable hash of key and step.
create or replace function public.pool_pick(p_pool bigint, p_key text, p_step int)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  tiers int;
  t int;
  cnt int;
  pick int;
  lv jsonb;
begin
  select count(distinct tier) into tiers from public.pool_levels where pool_id = p_pool;
  if tiers = 0 then return null; end if;
  t := least(greatest(p_step, 0), tiers - 1);
  select count(*) into cnt from public.pool_levels where pool_id = p_pool and tier = t;
  pick := (abs(hashtext(p_key || ':' || p_step)::bigint) % cnt)::int;
  select level into lv from public.pool_levels
   where pool_id = p_pool and tier = t order by slot offset pick limit 1;
  return lv;
end;
$$;

create or replace function public.survival_level(p_seed text, p_step int)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  pool bigint := public.latest_pool('survival');
begin
  if p_seed is null or length(p_seed) = 0 or length(p_seed) > 64 or p_step is null or p_step < 0 then
    raise exception 'bad survival request' using errcode = '22023';
  end if;
  if pool is null then
    raise exception 'no survival levels published' using errcode = 'P0002';
  end if;
  return public.pool_pick(pool, p_seed, p_step);
end;
$$;

-- ============================================================
-- Campaign
-- ============================================================

alter table public.campaign_clears add column if not exists pool_version int;

-- a first clear is stamped with the pool that is live then; a replay keeps it
create or replace function public.campaign_clears_set_pool()
returns trigger language plpgsql as $$
begin
  if new.pool_version is null then
    select version into new.pool_version from public.level_pools
     where mode = 'campaign' order by version desc limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_campaign_clears_set_pool on public.campaign_clears;
create trigger trg_campaign_clears_set_pool
  before insert on public.campaign_clears
  for each row execute function public.campaign_clears_set_pool();

create or replace function public.campaign_clears_keep_best()
returns trigger language plpgsql as $$
begin
  if new.cats_used > old.cats_used then
    new.cats_used := old.cats_used;
  end if;
  new.campaign_stars := greatest(new.campaign_stars, old.campaign_stars);
  new.pool_version := old.pool_version;
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

-- ============================================================
-- Publishing
-- ============================================================

create or replace function public.publish_level_pool(p_mode text, p_curve jsonb, p_levels jsonb, p_note text default '')
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
  if not public.is_admin() then
    raise exception 'only admins can publish level pools' using errcode = '42501';
  end if;
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

revoke all on function public.publish_level_pool(text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.publish_level_pool(text, jsonb, jsonb, text) to authenticated;

revoke all on function public.latest_pool(text) from public;
revoke all on function public.pool_pick(bigint, text, int) from public;
revoke all on function public.survival_level(text, int) from public;
revoke all on function public.campaign_level(int) from public;
grant execute on function public.latest_pool(text) to anon, authenticated;
grant execute on function public.pool_pick(bigint, text, int) to anon, authenticated;
grant execute on function public.survival_level(text, int) to anon, authenticated;
grant execute on function public.campaign_level(int) to anon, authenticated;

-- ============================================================
-- Survival: the server derives the level
-- ============================================================

alter table public.survival_runs add column if not exists seed text;
alter table public.survival_runs add column if not exists pool_id bigint references public.level_pools (id);

drop function if exists public.start_survival_run();
drop function if exists public.submit_survival_site(uuid, int, jsonb, int[]);

create or replace function public.start_survival_run(p_seed text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rid uuid;
  pool bigint := public.latest_pool('survival');
begin
  if uid is null then
    raise exception 'sign in to rank a survival run' using errcode = '28000';
  end if;
  if p_seed is null or length(p_seed) = 0 or length(p_seed) > 64 then
    raise exception 'bad survival request' using errcode = '22023';
  end if;
  if pool is null then
    raise exception 'no survival levels published' using errcode = 'P0002';
  end if;

  -- a run left open whose clock has run out is over
  update public.survival_runs set status = 'done'
   where user_id = uid and status = 'running' and ends_at < now();

  insert into public.survival_runs (user_id, ends_at, seed, pool_id)
  values (uid, now() + interval '180 seconds', p_seed, pool)
  returning id into rid;
  return rid;
end;
$$;

create or replace function public.submit_survival_site(p_run_id uuid, p_step int, p_nodes int[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.survival_runs%rowtype;
  lv jsonb;
  v_par int;
  v_stars int;
  v_used int;
  v_score int;
begin
  if uid is null then
    raise exception 'sign in to rank a survival run' using errcode = '28000';
  end if;

  select * into r from public.survival_runs where id = p_run_id for update;
  if not found or r.user_id <> uid then
    raise exception 'unknown survival run' using errcode = 'P0002';
  end if;
  if r.status <> 'running' or now() > r.ends_at then
    raise exception 'survival run is over' using errcode = 'P0001';
  end if;
  if p_step is distinct from r.sites_cleared then
    raise exception 'site out of order' using errcode = 'P0001';
  end if;
  if p_nodes is null or r.pool_id is null or r.seed is null then
    raise exception 'missing cats' using errcode = '22023';
  end if;

  lv := public.pool_pick(r.pool_id, r.seed, p_step);
  if lv is null then
    raise exception 'no level for this site' using errcode = 'P0002';
  end if;
  v_par := (lv ->> 'k')::int;
  v_stars := (lv ->> 'stars')::int;

  select count(distinct n) into v_used from unnest(p_nodes) as n;
  -- one cat over par is the most the board lets a player hire (OVER_PAR_ALLOWANCE)
  if v_used > v_par + 1 then
    raise exception 'too many cats' using errcode = '22023';
  end if;
  if v_used < v_par then
    raise exception 'cover is smaller than par' using errcode = '22023';
  end if;
  if not public.cover_is_valid(lv, p_nodes) then
    raise exception 'cats do not cover the level' using errcode = '22023';
  end if;

  v_score := greatest(0, v_stars * 10 - (v_used - v_par) * 5);

  insert into public.survival_clears (run_id, step, cats_used, par, stars)
  values (p_run_id, p_step, v_used, v_par, v_stars);

  update public.survival_runs
     set sites_cleared = sites_cleared + 1,
         perfect_sites = perfect_sites + (case when v_used <= v_par then 1 else 0 end),
         score = score + v_score
   where id = p_run_id
  returning * into r;

  return jsonb_build_object('sites', r.sites_cleared, 'perfect', r.perfect_sites, 'score', r.score);
end;
$$;

revoke all on function public.start_survival_run(text) from public;
revoke all on function public.submit_survival_site(uuid, int, int[]) from public;
grant execute on function public.start_survival_run(text) to authenticated;
grant execute on function public.submit_survival_site(uuid, int, int[]) to authenticated;

-- ============================================================
-- 1vs1: the server picks the level
-- ============================================================

drop function if exists public.create_match(uuid, jsonb);

create or replace function public.create_match(p_opponent uuid, p_tier int default 0)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mid uuid;
  pool bigint := public.latest_pool('match');
  tiers int;
  lv jsonb;
begin
  if uid is null then
    raise exception 'sign in first' using errcode = '28000';
  end if;
  if p_opponent is null or p_opponent = uid then
    raise exception 'pick someone else to challenge' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_opponent) then
    raise exception 'no such player' using errcode = 'P0002';
  end if;
  if not public.are_crew(uid, p_opponent) then
    raise exception 'only friends and squad mates can be challenged' using errcode = '42501';
  end if;
  if pool is null then
    raise exception 'no match levels published' using errcode = 'P0002';
  end if;

  select count(distinct tier) into tiers from public.pool_levels where pool_id = pool;
  select level into lv from public.pool_levels
   where pool_id = pool and tier = least(greatest(coalesce(p_tier, 0), 0), tiers - 1)
   order by random() limit 1;
  if lv is null then
    raise exception 'no match levels published' using errcode = 'P0002';
  end if;

  perform public.close_expired_matches();

  if exists (
    select 1 from public.matches
    where status in ('pending', 'active')
      and ((created_by = uid and opponent_id = p_opponent) or (created_by = p_opponent and opponent_id = uid))
  ) then
    raise exception 'you already have an open match with this player' using errcode = 'P0001';
  end if;

  insert into public.matches (level, created_by, opponent_id)
  values (lv, uid, p_opponent)
  returning id into mid;

  insert into public.match_players (match_id, user_id, joined_at)
  values (mid, uid, now()), (mid, p_opponent, null);

  return mid;
end;
$$;

revoke all on function public.create_match(uuid, int) from public, anon;
grant execute on function public.create_match(uuid, int) to authenticated;
