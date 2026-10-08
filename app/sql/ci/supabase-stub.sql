-- CI only: turns a plain postgres:16 into something shaped enough like the
-- production Supabase database for every migration in app/sql/ to replay on
-- it, from the first one. Never run this against a real project.
--
-- Two parts, both stand-ins rather than copies:
--   1. What Supabase itself provides: the API roles, auth.uid() (read here
--      from the `request.uid` setting, so checks can act as a given user),
--      and the default privileges Supabase grants on new objects in public.
--   2. The original schema the first migrations build on
--      (design_handoff_account_leaderboard/supabase-schema.sql, which isn't
--      in this repo), reconstructed from what those migrations alter and
--      what the app reads and writes. Only its shape matters here.
-- If a migration needs more of production than this has, add it here.

-- 1) Supabase ---------------------------------------------------------------
-- roles are cluster-wide, so a second database on the same server finds them
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.uid', true), '')::uuid
$$;
grant execute on function auth.uid() to anon, authenticated, service_role;

-- 2) The handoff schema -----------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nickname text,
  created_at timestamptz not null default now()
);

create table public.site_clears (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_number integer not null,
  site_index integer not null,
  cats_used integer not null,
  par integer not null,
  on_budget boolean not null,
  created_at timestamptz not null default now(),
  unique (user_id, day_number, site_index)
);

-- weighted-score replaces these with (user_id, nickname, score bigint), so
-- they have that shape; they can't read a site_clears.score it later drops
create view public.leaderboard_alltime as
  select p.id as user_id, p.nickname, count(*) filter (where s.on_budget) as score
  from public.profiles p join public.site_clears s on s.user_id = p.id
  group by p.id, p.nickname;
create view public.leaderboard_weekly as
  select p.id as user_id, p.nickname, count(*) filter (where s.on_budget) as score
  from public.profiles p join public.site_clears s on s.user_id = p.id
  where s.created_at > now() - interval '7 days'
  group by p.id, p.nickname;

-- the handoff schema's grants (table-wide; later migrations narrow them)
revoke all on public.profiles, public.site_clears, public.leaderboard_alltime, public.leaderboard_weekly
  from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert on public.site_clears to authenticated;
grant select on public.leaderboard_alltime, public.leaderboard_weekly to anon, authenticated;
