-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Run AFTER 2026-10-12-matches.sql (which itself needs
-- 2026-10-11-cover-is-valid.sql and 2026-09-08-crew-squads.sql).
--
-- Why: the client has no write access to matches / match_players. Everything
-- that changes a match is one of these functions, which run as the table
-- owner (security definer, search_path pinned to public) and check the input
-- themselves: who is calling, whether the match is in that state, whether the
-- clear is a real cover, and whether it arrived in time. Time is the server's
-- now(); a client clock never decides anything.
--
-- Rules
--   * Only accepted friends and squad mates can be challenged (are_crew).
--   * One open (pending or active) match per pair of players at a time.
--   * accept: starts_at = now() + 3 s, ends_at = starts_at + 5 min.
--   * submit: must be inside [starts_at, ends_at]. The server keeps each
--     player's best clear (fewest cats). A clear at par or better ends the
--     match at once; the first one in wins (rows are locked, so two
--     simultaneous submits are ordered).
--   * At ends_at (or when nobody ever clears) the best clear wins: fewest
--     cats, then the earlier finished_at. Equal on both = drawn. No clear at
--     all = void.
--   * A pending challenge expires after 1 hour.
--   * forfeit_match is always the CALLER giving up. There is deliberately no
--     "my opponent left, I win" call: the server cannot see presence, so it
--     would be a button anyone could press. A vanished opponent simply runs
--     the clock out, and the lone clear wins.
--   * Expiry is applied lazily: close_expired_matches() is called by
--     create_match and by the app (lobby open, and when a match clock ends).
--     It can also be put on a cron if you want it prompt.
--
-- All functions return the match row or void, and raise an exception with a
-- readable message for anything the caller should not be doing.

-- ---------------------------------------------------------------- helpers

-- Internal: are the two players friends, or in the same squad?
create or replace function public.are_crew(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
           select 1 from public.friendships f
           where f.status = 'accepted'
             and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
         )
      or exists (
           select 1 from public.squad_members x
           join public.squad_members y on y.squad_id = x.squad_id
           where x.user_id = a and y.user_id = b
         );
$$;

-- Internal: decide a match that is over. pending -> void; active -> by the
-- best clears (see the rules above). Safe to call twice.
create or replace function public.finish_match(p_match uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches;
  a public.match_players;
  b public.match_players;
  win uuid;
  voided boolean := false;
begin
  select * into m from public.matches where id = p_match for update;
  if not found or m.status in ('done', 'void') then
    return;
  end if;

  if m.status = 'pending' then
    update public.matches set status = 'void', ended_at = now() where id = p_match;
    update public.match_players set result = 'void' where match_id = p_match;
    return;
  end if;

  select * into a from public.match_players where match_id = p_match and user_id = m.created_by;
  select * into b from public.match_players where match_id = p_match and user_id = m.opponent_id;

  if a.cats_used is null and b.cats_used is null then
    voided := true;
  elsif b.cats_used is null then
    win := a.user_id;
  elsif a.cats_used is null then
    win := b.user_id;
  elsif a.cats_used < b.cats_used then
    win := a.user_id;
  elsif b.cats_used < a.cats_used then
    win := b.user_id;
  elsif a.finished_at < b.finished_at then
    win := a.user_id;
  elsif b.finished_at < a.finished_at then
    win := b.user_id;
  end if;

  if voided then
    update public.matches set status = 'void', ended_at = now() where id = p_match;
    update public.match_players set result = 'void' where match_id = p_match;
  else
    update public.matches set status = 'done', ended_at = now(), winner_id = win where id = p_match;
    update public.match_players
       set result = case when win is null then 'drawn' when user_id = win then 'won' else 'lost' end
     where match_id = p_match;
  end if;
end;
$$;

-- ----------------------------------------------------------------- public API

create or replace function public.close_expired_matches()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select id from public.matches
    where (status = 'pending' and created_at < now() - interval '1 hour')
       or (status = 'active' and ends_at < now())
  loop
    perform public.finish_match(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

create or replace function public.create_match(p_opponent uuid, p_level jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  mid uuid;
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
  if not public.level_is_valid(p_level) then
    raise exception 'that is not a playable level' using errcode = 'P0001';
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
  values (p_level, uid, p_opponent)
  returning id into mid;

  insert into public.match_players (match_id, user_id, joined_at)
  values (mid, uid, now()), (mid, p_opponent, null);

  return mid;
end;
$$;

create or replace function public.accept_match(p_match uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.matches;
begin
  if uid is null then
    raise exception 'sign in first' using errcode = '28000';
  end if;
  select * into m from public.matches where id = p_match for update;
  if not found or m.opponent_id <> uid then
    raise exception 'no such challenge' using errcode = 'P0002';
  end if;
  if m.status <> 'pending' then
    raise exception 'that challenge is no longer open' using errcode = 'P0001';
  end if;
  if m.created_at < now() - interval '1 hour' then
    perform public.finish_match(p_match);
    select * into m from public.matches where id = p_match;
    return m;
  end if;

  update public.matches
     set status = 'active',
         starts_at = now() + interval '3 seconds',
         ends_at = now() + interval '3 seconds' + interval '5 minutes'
   where id = p_match
   returning * into m;
  update public.match_players set joined_at = now() where match_id = p_match and user_id = uid;
  return m;
end;
$$;

create or replace function public.decline_match(p_match uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.matches;
begin
  if uid is null then
    raise exception 'sign in first' using errcode = '28000';
  end if;
  select * into m from public.matches where id = p_match for update;
  if not found or m.opponent_id <> uid then
    raise exception 'no such challenge' using errcode = 'P0002';
  end if;
  if m.status <> 'pending' then
    raise exception 'that challenge is no longer open' using errcode = 'P0001';
  end if;
  perform public.finish_match(p_match);
  select * into m from public.matches where id = p_match;
  return m;
end;
$$;

create or replace function public.submit_match(p_match uuid, p_nodes int[])
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.matches;
  used int;
  par int;
begin
  if uid is null then
    raise exception 'sign in first' using errcode = '28000';
  end if;
  select * into m from public.matches where id = p_match for update;
  if not found or uid not in (m.created_by, m.opponent_id) then
    raise exception 'no such match' using errcode = 'P0002';
  end if;

  -- late: the clock ran out first. Settle the match and report how it ended.
  if m.status = 'active' and now() > m.ends_at then
    perform public.finish_match(p_match);
    select * into m from public.matches where id = p_match;
    return m;
  end if;
  if m.status <> 'active' then
    raise exception 'that match is not live' using errcode = 'P0001';
  end if;
  if now() < m.starts_at then
    raise exception 'the match has not started yet' using errcode = 'P0001';
  end if;
  if not public.cover_is_valid(m.level, p_nodes) then
    raise exception 'those cats do not cover every cable' using errcode = 'P0001';
  end if;

  used := coalesce(array_length(p_nodes, 1), 0);
  par := (m.level ->> 'k')::int;

  -- keep each player's best clear; a worse replay changes nothing
  update public.match_players
     set cats_used = used, finished_at = now()
   where match_id = p_match and user_id = uid
     and (cats_used is null or used < cats_used);

  if used <= par then
    perform public.finish_match(p_match);
  end if;

  select * into m from public.matches where id = p_match;
  return m;
end;
$$;

create or replace function public.forfeit_match(p_match uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m public.matches;
  other uuid;
begin
  if uid is null then
    raise exception 'sign in first' using errcode = '28000';
  end if;
  select * into m from public.matches where id = p_match for update;
  if not found or uid not in (m.created_by, m.opponent_id) then
    raise exception 'no such match' using errcode = 'P0002';
  end if;

  if m.status = 'pending' then
    -- cancelling (creator) or declining (opponent): nobody played
    perform public.finish_match(p_match);
  elsif m.status = 'active' then
    other := case when uid = m.created_by then m.opponent_id else m.created_by end;
    update public.matches set status = 'done', ended_at = now(), winner_id = other where id = p_match;
    update public.match_players
       set result = case when user_id = uid then 'lost' else 'won' end
     where match_id = p_match;
  end if;

  select * into m from public.matches where id = p_match;
  return m;
end;
$$;

-- ------------------------------------------------------------------ grants
-- Postgres gives EXECUTE to everyone on a new function; take it back first.

revoke all on function public.are_crew(uuid, uuid) from public, anon, authenticated;
revoke all on function public.finish_match(uuid) from public, anon, authenticated;

revoke all on function public.close_expired_matches() from public, anon;
revoke all on function public.create_match(uuid, jsonb) from public, anon;
revoke all on function public.accept_match(uuid) from public, anon;
revoke all on function public.decline_match(uuid) from public, anon;
revoke all on function public.submit_match(uuid, int[]) from public, anon;
revoke all on function public.forfeit_match(uuid) from public, anon;

grant execute on function public.close_expired_matches() to authenticated;
grant execute on function public.create_match(uuid, jsonb) to authenticated;
grant execute on function public.accept_match(uuid) to authenticated;
grant execute on function public.decline_match(uuid) to authenticated;
grant execute on function public.submit_match(uuid, int[]) to authenticated;
grant execute on function public.forfeit_match(uuid) to authenticated;
