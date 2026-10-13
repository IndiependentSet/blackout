-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md). Safe to run twice.
--
-- Why: 1vs1 only worked between friends and squad mates, with no rating. Now
-- a player can search for an opponent, and those matches are RANKED: they move
-- an Elo rating that the ladder (leaderboard_ranked) sorts by.
--
--   matches.ranked        true for a match made by find_match. A challenge to a
--                         friend stays unranked, so two friends cannot trade
--                         wins to climb the ladder.
--   match_queue           who is searching: (user, tier, joined, last seen).
--                         Nobody reads or writes it directly.
--   find_match(tier)      the search. Returns the match id when an opponent
--                         was found (or one found you), else null and the
--                         caller stays in the queue. Call it again every few
--                         seconds: that is how a waiting player learns they
--                         were matched, and how the queue knows they are still
--                         there (a row not seen for 20 s is dropped). A match
--                         found this way starts at once (3 s countdown, 5 min
--                         clock) on a level picked from the 1vs1 pool at
--                         `tier`. The closest rating in the queue is chosen;
--                         the same two players are not paired again within
--                         10 minutes.
--   leave_queue()         stop searching.
--   match_ratings         one row per player who has finished a ranked match:
--                         rating (start 1000, floor 100), games played.
--   Elo                   K = 32. A win scores 1, a draw 0.5, a loss 0; the
--                         forfeit and the clock running out count like any
--                         other result. A void match (nobody cleared it) moves
--                         nothing. The change is applied by a trigger when the
--                         match becomes 'done', so every path that ends a match
--                         is covered, and each player's before / after rating
--                         is kept on match_players for the result sheet.
--   leaderboard_ranked    the ladder: rating, games and the ranked record.
--
-- Access: RLS is on for match_ratings and match_queue. Anyone signed in may
-- read the ratings; nothing is writable directly, only through the functions
-- above (security definer, pinned search_path).

alter table public.matches add column if not exists ranked boolean not null default false;
alter table public.match_players add column if not exists rating_before int;
alter table public.match_players add column if not exists rating_after int;

create table if not exists public.match_ratings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  rating int not null default 1000 check (rating >= 100),
  games int not null default 0 check (games >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_queue (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  tier int not null check (tier between 0 and 9),
  joined_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);

alter table public.match_ratings enable row level security;
alter table public.match_queue enable row level security;

drop policy if exists match_ratings_read on public.match_ratings;
create policy match_ratings_read on public.match_ratings for select to authenticated using (true);

revoke all on public.match_ratings, public.match_queue from anon, authenticated;
grant select on public.match_ratings to authenticated;

-- ============================================================
-- Elo
-- ============================================================

-- The rating after one game: `score` is 1 for a win, 0.5 for a draw, 0 for a loss.
create or replace function public.elo_next(r int, opp int, score numeric)
returns int language sql immutable as $$
  select greatest(100, round(r + 32 * (score - 1.0 / (1 + power(10.0, (opp - r) / 400.0))))::int);
$$;

create or replace function public.matches_apply_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ra int;
  rb int;
  sa numeric;
  na int;
  nb int;
begin
  insert into public.match_ratings (user_id) values (new.created_by), (new.opponent_id)
  on conflict (user_id) do nothing;
  -- both rows, always in the same order, so two finishing matches cannot deadlock
  perform 1 from public.match_ratings where user_id in (new.created_by, new.opponent_id) order by user_id for update;

  select rating into ra from public.match_ratings where user_id = new.created_by;
  select rating into rb from public.match_ratings where user_id = new.opponent_id;
  sa := case when new.winner_id is null then 0.5 when new.winner_id = new.created_by then 1 else 0 end;
  na := public.elo_next(ra, rb, sa);
  nb := public.elo_next(rb, ra, 1 - sa);

  update public.match_ratings set rating = na, games = games + 1, updated_at = now() where user_id = new.created_by;
  update public.match_ratings set rating = nb, games = games + 1, updated_at = now() where user_id = new.opponent_id;
  update public.match_players set rating_before = ra, rating_after = na where match_id = new.id and user_id = new.created_by;
  update public.match_players set rating_before = rb, rating_after = nb where match_id = new.id and user_id = new.opponent_id;
  return null;
end;
$$;

drop trigger if exists trg_matches_apply_rating on public.matches;
create trigger trg_matches_apply_rating
  after update of status on public.matches
  for each row
  when (new.status = 'done' and old.status is distinct from 'done' and new.ranked)
  execute function public.matches_apply_rating();

-- ============================================================
-- The ladder
-- ============================================================

create or replace view public.leaderboard_ranked as
  select r.user_id,
         p.username,
         r.rating,
         r.games,
         coalesce(s.won, 0) as won,
         coalesce(s.lost, 0) as lost,
         coalesce(s.drawn, 0) as drawn
  from public.match_ratings r
  join public.profiles p on p.id = r.user_id
  left join lateral (
    select count(*) filter (where mp.result = 'won')::int as won,
           count(*) filter (where mp.result = 'lost')::int as lost,
           count(*) filter (where mp.result = 'drawn')::int as drawn
    from public.match_players mp
    join public.matches m on m.id = mp.match_id and m.ranked
    where mp.user_id = r.user_id
  ) s on true;

grant select on public.leaderboard_ranked to authenticated;

-- ============================================================
-- Looking for an opponent
-- ============================================================

-- Internal: a random level of the 1vs1 pool at a tier (the last tier if it is past the end), null with no pool.
create or replace function public.pick_match_level(p_tier int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  pool bigint := public.latest_pool('match');
  tiers int;
  lv jsonb;
begin
  if pool is null then return null; end if;
  select count(distinct tier) into tiers from public.pool_levels where pool_id = pool;
  if tiers = 0 then return null; end if;
  select level into lv from public.pool_levels
   where pool_id = pool and tier = least(greatest(coalesce(p_tier, 0), 0), tiers - 1)
   order by random() limit 1;
  return lv;
end;
$$;

create or replace function public.find_match(p_tier int default 0)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mid uuid;
  other uuid;
  lv jsonb;
  mine int;
begin
  if uid is null then
    raise exception 'sign in first' using errcode = '28000';
  end if;
  if p_tier is null or p_tier < 0 or p_tier > 9 then
    raise exception 'bad tier' using errcode = '22023';
  end if;

  perform public.close_expired_matches();

  -- already matched: by an earlier call, or by the other player's call while we waited
  select id into mid from public.matches
   where ranked and status in ('pending', 'active') and (created_by = uid or opponent_id = uid)
   order by created_at desc limit 1;
  if mid is not null then
    delete from public.match_queue where user_id = uid;
    return mid;
  end if;

  delete from public.match_queue where seen_at < now() - interval '20 seconds';
  mine := coalesce((select rating from public.match_ratings where user_id = uid), 1000);

  select q.user_id into other
    from public.match_queue q
    left join public.match_ratings r on r.user_id = q.user_id
   where q.user_id <> uid and q.tier = p_tier
     and not exists (
       select 1 from public.matches m
        where m.ranked and (m.created_at > now() - interval '10 minutes' or m.status in ('pending', 'active'))
          and ((m.created_by = uid and m.opponent_id = q.user_id) or (m.created_by = q.user_id and m.opponent_id = uid))
     )
   order by abs(coalesce(r.rating, 1000) - mine), q.joined_at
   limit 1
   for update of q skip locked;

  if other is null then
    if public.pick_match_level(p_tier) is null then
      raise exception 'no match levels published' using errcode = 'P0002';
    end if;
    insert into public.match_queue (user_id, tier) values (uid, p_tier)
    on conflict (user_id) do update set tier = excluded.tier, seen_at = now();
    return null;
  end if;

  lv := public.pick_match_level(p_tier);
  if lv is null then
    raise exception 'no match levels published' using errcode = 'P0002';
  end if;
  delete from public.match_queue where user_id in (uid, other);

  insert into public.matches (level, created_by, opponent_id, status, starts_at, ends_at, ranked)
  values (lv, other, uid, 'active', now() + interval '3 seconds', now() + interval '3 seconds' + interval '5 minutes', true)
  returning id into mid;
  insert into public.match_players (match_id, user_id, joined_at) values (mid, other, now()), (mid, uid, now());
  return mid;
end;
$$;

create or replace function public.leave_queue()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'sign in first' using errcode = '28000';
  end if;
  delete from public.match_queue where user_id = auth.uid();
end;
$$;

revoke all on function public.elo_next(int, int, numeric) from public;
revoke all on function public.matches_apply_rating() from public, anon, authenticated;
revoke all on function public.pick_match_level(int) from public, anon, authenticated;
revoke all on function public.find_match(int) from public, anon;
revoke all on function public.leave_queue() from public, anon;
grant execute on function public.elo_next(int, int, numeric) to authenticated;
grant execute on function public.find_match(int) to authenticated;
grant execute on function public.leave_queue() to authenticated;
