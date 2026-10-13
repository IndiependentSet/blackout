-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Run AFTER 2026-10-08-base-schema.sql / 2026-09-08-merge-nickname-username.sql
-- (needs profiles.username) and AFTER 2026-10-11-cover-is-valid.sql (this file
-- calls public.level_is_valid and public.cover_is_valid, which that file
-- creates). Read app/sql/README.md
-- first: survival runs are competitive, so they follow the RPC-only rules.
--
-- Why: survival mode (180 s, as many sites as the clock allows) gets a
-- leaderboard. The clock and the clears are the server's: the client never
-- says how long a run took, only which site it cleared and with which cats.
--
--   start_survival_run()        opens a run; started_at / ends_at are set here.
--   submit_survival_site(...)   banks one cleared site. Rejected after ends_at,
--                               out of order, or when the cats do not cover the
--                               level. Time is judged by now() on the server.
--   leaderboard_survival        each player's best run (more sites, then score).
--
-- The limit below must match SURVIVAL_LIMIT_MS in app/src/domain/survival.ts
-- (180 s) and the per-site points must match siteScore() in
-- app/src/domain/scoring.ts. Change them together.
--
-- MOCK LEVELS: until the generator backend ships, the CLIENT passes the level
-- (jsonb) to submit_survival_site, exactly like create_match does for 1vs1. The
-- server checks the level's shape and size (level_is_valid), that the cats cover
-- every edge (cover_is_valid), and that the cover is no smaller than the stated
-- par and at most one cat over it. It
-- cannot prove that the stated par is the true optimum, so a tampered client
-- can pick an easier graph. It cannot fake its time or skip a site. When the
-- backend hands out the levels, the level parameter goes away and the server
-- reads par and stars from the level it issued.
--
-- Access: RLS is on and a player can read only their own runs. There is no
-- INSERT/UPDATE/DELETE grant on either table; the functions below are
-- security definer and are the only writers.

create table if not exists public.survival_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  sites_cleared int not null default 0 check (sites_cleared >= 0),
  perfect_sites int not null default 0 check (perfect_sites >= 0),
  score int not null default 0 check (score >= 0),
  status text not null default 'running' check (status in ('running', 'done'))
);

create index if not exists survival_runs_user_idx on public.survival_runs (user_id);

create table if not exists public.survival_clears (
  run_id uuid not null references public.survival_runs (id) on delete cascade,
  step int not null check (step >= 0),
  cats_used int not null check (cats_used >= 1),
  par int not null check (par >= 1),
  stars smallint not null check (stars between 1 and 3),
  score int generated always as (
    greatest(0, stars * 10 - (cats_used - par) * 5)
  ) stored,
  cleared_at timestamptz not null default now(),
  primary key (run_id, step)
);

alter table public.survival_runs enable row level security;
alter table public.survival_clears enable row level security;

drop policy if exists survival_runs_select_own on public.survival_runs;
create policy survival_runs_select_own on public.survival_runs
  for select to authenticated using (user_id = auth.uid());

drop policy if exists survival_clears_select_own on public.survival_clears;
create policy survival_clears_select_own on public.survival_clears
  for select to authenticated using (
    exists (select 1 from public.survival_runs r where r.id = run_id and r.user_id = auth.uid())
  );

grant select on public.survival_runs, public.survival_clears to authenticated;

create or replace function public.start_survival_run()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rid uuid;
begin
  if uid is null then
    raise exception 'sign in to rank a survival run' using errcode = '28000';
  end if;

  -- a run left open whose clock has run out is over
  update public.survival_runs set status = 'done'
   where user_id = uid and status = 'running' and ends_at < now();

  insert into public.survival_runs (user_id, ends_at)
  values (uid, now() + interval '180 seconds')
  returning id into rid;
  return rid;
end;
$$;

create or replace function public.submit_survival_site(
  p_run_id uuid, p_step int, p_level jsonb, p_nodes int[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.survival_runs%rowtype;
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

  if p_level is null or p_nodes is null then
    raise exception 'missing level or cats' using errcode = '22023';
  end if;
  if not public.level_is_valid(p_level) then
    raise exception 'malformed level' using errcode = '22023';
  end if;
  v_par := (p_level ->> 'k')::int;
  v_stars := (p_level ->> 'stars')::int;
  if v_par is null or v_par < 1 or v_stars is null or v_stars not between 1 and 3 then
    raise exception 'malformed level' using errcode = '22023';
  end if;

  select count(distinct n) into v_used from unnest(p_nodes) as n;
  -- one cat over par is the most the board lets a player hire (OVER_PAR_ALLOWANCE)
  if v_used > v_par + 1 then
    raise exception 'too many cats' using errcode = '22023';
  end if;
  if v_used < v_par then
    raise exception 'cover is smaller than par' using errcode = '22023';
  end if;
  if not public.cover_is_valid(p_level, p_nodes) then
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

revoke all on function public.start_survival_run() from public;
revoke all on function public.submit_survival_site(uuid, int, jsonb, int[]) from public;
grant execute on function public.start_survival_run() to authenticated;
grant execute on function public.submit_survival_site(uuid, int, jsonb, int[]) to authenticated;

-- Each player's best run. The view's owner reads past RLS, so everyone sees
-- the board but only their own raw runs.
create or replace view public.leaderboard_survival as
  select distinct on (r.user_id)
         r.user_id, p.username,
         r.sites_cleared as sites, r.perfect_sites as perfect, r.score
  from public.survival_runs r
  join public.profiles p on p.id = r.user_id
  where r.sites_cleared > 0
  order by r.user_id, r.sites_cleared desc, r.score desc;

grant select on public.leaderboard_survival to anon, authenticated;
