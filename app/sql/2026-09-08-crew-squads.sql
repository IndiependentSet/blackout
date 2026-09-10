-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Adds the social layer (design_handoff_crew_squads/): handles, invite
-- codes, mutual friendships, and invite-code squads. Builds on the account/
-- leaderboard schema already live (profiles, site_clears, stars-weighted
-- leaderboard_alltime/leaderboard_weekly from 2026-09-07-weighted-score.sql).
--
-- Same constraints as before: no custom auth, RLS stays off project-wide —
-- access control is these column/table GRANTs, not row policies. That means
-- (unchanged gap, flagged not fixed): any signed-in user can currently
-- accept someone else's friend request or remove another member from a
-- squad, since squad_members/friendships GRANTs are table-wide.

-- ============================================================
-- 1) Identity: handle + personal invite code
-- ============================================================

alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists invite_code text unique;

create index if not exists profiles_username_idx on public.profiles (lower(username));

-- Backfill invite_code for profiles created before this migration.
update public.profiles set invite_code =
  'CAT-' || upper(substr(md5(id::text || clock_timestamp()::text), 1, 4))
  where invite_code is null;

-- Public SELECT grant widens from (id, nickname) [2026-09-07-profiles-email-privacy.sql]
-- to also expose username/invite_code — both are meant to be public (search,
-- personnel file). Email stays excluded.
revoke select on public.profiles from anon, authenticated;
grant select (id, nickname, username, invite_code) on public.profiles to anon, authenticated;

-- ============================================================
-- 2) Friendships — mutual, requires acceptance
-- ============================================================

create table if not exists public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

create index if not exists friendships_requester_idx on public.friendships (requester_id, status);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

-- ============================================================
-- 3) Squads — private groups with a shared leaderboard
-- ============================================================

create table if not exists public.squads (
  id bigint generated always as identity primary key,
  name text not null,
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.squad_members (
  squad_id bigint not null references public.squads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('foreman', 'member')),
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create index if not exists squad_members_user_idx on public.squad_members (user_id);

-- ============================================================
-- 4) player_scores — per-user (all-time, week) pair, filterable by id list
-- ============================================================
-- leaderboard_alltime/leaderboard_weekly (2026-09-07-weighted-score.sql) are
-- global top boards, each with its own score column and no per-user "both
-- numbers at once" shape — not what friend/squad boards or head-to-head need
-- (an id-filtered board, and one row with both this-week and all-time for
-- the same user). This view stays a plain add: it doesn't touch either
-- existing leaderboard view or its scoring logic, just reuses the same
-- stars-weighted score expression against site_clears.

create or replace view public.player_scores as
  select p.id as user_id,
         coalesce(p.username, p.nickname) as name,
         coalesce(sum(s.score), 0) as score,
         coalesce(sum(s.score) filter (where s.created_at > now() - interval '7 days'), 0) as week_score
  from public.profiles p
  left join public.site_clears s on s.user_id = p.id
  group by p.id, p.username, p.nickname;

-- ============================================================
-- 5) Permissions
-- ============================================================

grant select on public.friendships to authenticated;
grant insert, update, delete on public.friendships to authenticated;

grant select on public.squads to authenticated;
grant insert, update, delete on public.squads to authenticated;

grant select on public.squad_members to authenticated;
-- update is needed too, not just insert/delete: joinSquadByCode() upserts
-- with ON CONFLICT DO UPDATE, and Postgres requires UPDATE privilege for
-- that clause even on the no-op path (same as site_clears, see
-- 2026-09-07-site-clears-upsert-grant.sql).
grant insert, update, delete on public.squad_members to authenticated;

grant select on public.player_scores to anon, authenticated;
