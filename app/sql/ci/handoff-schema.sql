-- The original schema the first migrations in app/sql/ build on
-- (design_handoff_account_leaderboard/supabase-schema.sql, which isn't in this
-- repo), reconstructed from what those migrations alter and what the app reads
-- and writes. Only its shape matters. Needs auth.users, which Supabase provides
-- (a real local stack: tools/db-local.sh) or ci/supabase-stub.sql stands in for
-- (CI). Never run against production: it is already there.

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
