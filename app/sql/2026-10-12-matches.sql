-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Run AFTER 2026-10-11-cover-is-valid.sql and 2026-09-08-crew-squads.sql
-- (needs profiles). Read app/sql/README.md first: RLS is on for these tables
-- and the client gets NO write access to them.
--
-- Why: 1vs1 is a live head-to-head on one graph. Two tables hold it:
--   matches        one row per challenge: the graph (jsonb, saved once so both
--                  players always play the same one, never regenerated), who
--                  challenged whom, and the server's clock for the match.
--   match_players  one row per player: their best clear so far and the result.
--
-- Status is stored as only four values:
--   pending  challenge sent, not yet accepted
--   active   accepted. starts_at is accept time + 3 s and ends_at is starts_at
--            + 5 min, both set by the server. "Countdown" and "live" are not
--            stored: the client derives them from starts_at and now(), so no
--            job has to flip a flag at the right second.
--   done     decided (won / lost / drawn on match_players)
--   void     cancelled, declined, expired, or nobody cleared it
--
-- Access: select by policy for the two participants only. Every change goes
-- through the functions in 2026-10-12-match-rpc.sql (security definer); there
-- are no INSERT/UPDATE/DELETE grants on purpose, so a client cannot write its
-- own win. Realtime (postgres_changes) respects these select policies.

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  level jsonb not null,
  -- where the graph came from: 'client' while the level source is the mock,
  -- 'backend' once the generator service creates matches itself
  level_source text not null default 'client',
  status text not null default 'pending' check (status in ('pending', 'active', 'done', 'void')),
  created_by uuid not null references public.profiles (id) on delete cascade,
  opponent_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  starts_at timestamptz,
  ends_at timestamptz,
  ended_at timestamptz,
  winner_id uuid references public.profiles (id) on delete set null,
  check (created_by <> opponent_id)
);

create index if not exists matches_created_by_idx on public.matches (created_by, status);
create index if not exists matches_opponent_idx on public.matches (opponent_id, status);

create table if not exists public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz,
  -- the best clear sent so far: fewest cats, and when that clear arrived
  finished_at timestamptz,
  cats_used int check (cats_used is null or cats_used >= 0),
  result text check (result in ('won', 'lost', 'drawn', 'void')),
  primary key (match_id, user_id)
);

create index if not exists match_players_user_idx on public.match_players (user_id);

alter table public.matches enable row level security;
alter table public.match_players enable row level security;

drop policy if exists matches_select_participant on public.matches;
create policy matches_select_participant on public.matches
  for select to authenticated
  using (created_by = auth.uid() or opponent_id = auth.uid());

drop policy if exists match_players_select_participant on public.match_players;
create policy match_players_select_participant on public.match_players
  for select to authenticated
  using (exists (
    select 1 from public.matches m
    where m.id = match_players.match_id
      and (m.created_by = auth.uid() or m.opponent_id = auth.uid())
  ));

grant select on public.matches to authenticated;
grant select on public.match_players to authenticated;

-- Live updates for the two players' screens (idempotent: adding a table that
-- is already in the publication is an error).
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches') then
    alter publication supabase_realtime add table public.matches;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'match_players') then
    alter publication supabase_realtime add table public.match_players;
  end if;
end;
$$;
