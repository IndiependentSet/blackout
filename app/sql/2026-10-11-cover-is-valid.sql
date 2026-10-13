-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- No earlier migration is needed: these are pure functions over jsonb.
-- Run BEFORE 2026-10-12-match-rpc.sql (and before the survival RPC file).
--
-- Why: 1vs1 matches and survival runs are decided on the server, so the
-- server has to be able to tell whether a set of cats really covers every
-- cable of a level. The client never decides a result.
--
--   cover_is_valid(level, nodes)  true when every edge of `level` has a cat on
--                                 at least one end. `nodes` are node indices;
--                                 each must exist and none may repeat.
--   level_is_valid(level)         true when `level` looks like a Level
--                                 (src/domain/types.ts): integer cells, edges
--                                 between distinct existing nodes, k and stars
--                                 in range, and `sol` is a cover of size k.
--                                 Bounded in size so a client cannot park a
--                                 huge document in the table.
--
-- Neither function checks that `sol` is the OPTIMUM cover, or that `adj`
-- matches `edges` (the client's isMatchLevel() checks adj). While levels come
-- from the client (mock level source) a tampered client can pick a bad graph
-- for its own match; it cannot fake the result, which is computed here on the
-- stored graph, the same one both players see.
--
-- Manual checks, run after applying (expected result in the comment):
--   -- a path 0-1-2 with edges 0-1 and 1-2
--   select public.cover_is_valid('{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]]}', array[1]);      -- true
--   select public.cover_is_valid('{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]]}', array[0]);      -- false: edge 1-2 uncovered
--   select public.cover_is_valid('{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]]}', array[1,1]);    -- false: node picked twice
--   select public.cover_is_valid('{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]]}', array[1,7]);    -- false: node 7 does not exist
--   select public.cover_is_valid('{"nodes":[{"c":0,"r":0}],"edges":[[0,3]]}', array[0]);                                        -- false: edge to a missing node
--   select public.cover_is_valid('{"nodes":[{"c":0,"r":0},{"c":1,"r":0}],"edges":[[0,1]]}', null);                              -- false: nothing covers 0-1
--   select public.cover_is_valid('{"nodes":[{"c":0,"r":0},{"c":1,"r":0}],"edges":[]}', null);                                   -- true: no cables to cover
--   select public.cover_is_valid('{"nodes":"nope","edges":[]}', array[0]);                                                      -- false: not a level
--   select public.level_is_valid('{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]],"k":1,"sol":[1],"stars":1}');  -- true
--   select public.level_is_valid('{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]],"k":1,"sol":[0],"stars":1}');  -- false: sol is not a cover
--   select public.level_is_valid('{"nodes":[{"c":0,"r":0},{"c":1,"r":0},{"c":2,"r":0}],"edges":[[0,1],[1,2]],"k":2,"sol":[1],"stars":1}');  -- false: |sol| <> k

create or replace function public.cover_is_valid(level jsonb, nodes int[])
returns boolean
language plpgsql
immutable
as $$
declare
  n int;
  picked int[] := coalesce(nodes, '{}');
  e jsonb;
  u int;
  v int;
begin
  if level is null
     or jsonb_typeof(level -> 'nodes') is distinct from 'array'
     or jsonb_typeof(level -> 'edges') is distinct from 'array' then
    return false;
  end if;
  n := jsonb_array_length(level -> 'nodes');

  -- every picked node exists, and none is picked twice
  if exists (select 1 from unnest(picked) as x where x is null or x < 0 or x >= n) then
    return false;
  end if;
  if (select count(distinct x) from unnest(picked) as x) <> coalesce(array_length(picked, 1), 0) then
    return false;
  end if;

  for e in select value from jsonb_array_elements(level -> 'edges') loop
    if jsonb_typeof(e) is distinct from 'array' or jsonb_array_length(e) <> 2 then
      return false;
    end if;
    -- a missing or non-integer endpoint makes the comparison null, so test it
    -- explicitly: null must read as "invalid", not "fine"
    if coalesce((e ->> 0) !~ '^[0-9]{1,6}$', true) or coalesce((e ->> 1) !~ '^[0-9]{1,6}$', true) then
      return false;
    end if;
    u := (e ->> 0)::int;
    v := (e ->> 1)::int;
    if u >= n or v >= n or u = v then
      return false;
    end if;
    if not (u = any (picked) or v = any (picked)) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.level_is_valid(level jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  n int;
  m int;
  k int;
  sol int[];
begin
  if level is null
     or jsonb_typeof(level) is distinct from 'object'
     or jsonb_typeof(level -> 'nodes') is distinct from 'array'
     or jsonb_typeof(level -> 'edges') is distinct from 'array'
     or jsonb_typeof(level -> 'sol') is distinct from 'array' then
    return false;
  end if;

  n := jsonb_array_length(level -> 'nodes');
  m := jsonb_array_length(level -> 'edges');
  if n < 2 or n > 200 or m < 1 or m > 600 then
    return false;
  end if;

  if exists (
    select 1 from jsonb_array_elements(level -> 'nodes') as x
    where jsonb_typeof(x) is distinct from 'object'
       or coalesce((x ->> 'c') !~ '^-?[0-9]{1,6}$', true)
       or coalesce((x ->> 'r') !~ '^-?[0-9]{1,6}$', true)
  ) then
    return false;
  end if;

  if coalesce((level ->> 'k') !~ '^[0-9]{1,4}$', true)
     or coalesce((level ->> 'stars') !~ '^[1-3]$', true) then
    return false;
  end if;
  k := (level ->> 'k')::int;

  if exists (
    select 1 from jsonb_array_elements(level -> 'sol') as x
    where coalesce((x #>> '{}') !~ '^[0-9]{1,6}$', true)
  ) then
    return false;
  end if;
  select coalesce(array_agg((x #>> '{}')::int), '{}') into sol
  from jsonb_array_elements(level -> 'sol') as x;

  if k < 1 or coalesce(array_length(sol, 1), 0) <> k then
    return false;
  end if;

  return public.cover_is_valid(level, sol);
end;
$$;

grant execute on function public.cover_is_valid(jsonb, int[]) to authenticated;
grant execute on function public.level_is_valid(jsonb) to authenticated;
