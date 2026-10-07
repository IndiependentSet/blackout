-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
--
-- Adds admins and admin-edited level generation:
--   * admins — who may use /playground.html and /generation.html. Nobody can
--     read or write it from the client; add rows here, in the SQL editor.
--   * generation_configs — a GenerationSchedule (domain/generation/schedule.ts)
--     per game mode, each taking effect from a given puzzle day. Every player,
--     signed in or not, reads the row in force for today and generates the
--     week from it; with no row, the game plays DEFAULT_SCHEDULE.
--
-- Same constraints as before: no custom auth, RLS stays off project-wide —
-- access control is GRANTs plus the security-definer functions below, which
-- are the only way to write generation_configs. The admin gate in the app
-- only decides what is shown; these checks are the real ones.
--
-- A config can only be saved for a day that hasn't started yet (tomorrow at
-- the earliest), so the puzzles everyone is playing today — and the
-- leaderboard rows already recorded for them — never change under anyone.

-- ============================================================
-- 1) Admins
-- ============================================================

create table if not exists public.admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ============================================================
-- 2) The puzzle day — mirrors domain/calendar.ts dayNumber()
-- ============================================================
-- DAY_EPOCH = Date.UTC(2026, 3, 15); day = max(1, floor((now - epoch) / 1 day)).

create or replace function public.current_puzzle_day()
returns integer language sql stable as $$
  select greatest(1, floor(extract(epoch from (now() - timestamptz '2026-04-15 00:00:00+00')) / 86400)::integer);
$$;

grant execute on function public.current_puzzle_day() to anon, authenticated;

-- ============================================================
-- 3) Generation configs
-- ============================================================

create table if not exists public.generation_configs (
  id bigint generated always as identity primary key,
  mode text not null check (mode in ('daily')),
  effective_from_day integer not null check (effective_from_day >= 1),
  schedule jsonb not null,
  note text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (mode, effective_from_day)
);

create index if not exists generation_configs_mode_day_idx on public.generation_configs (mode, effective_from_day desc);

revoke all on public.generation_configs from anon, authenticated;
grant select (id, mode, effective_from_day, schedule, note, created_at) on public.generation_configs to anon, authenticated;

-- Save (or replace) the config for a mode from a future day on. The full
-- schedule is validated client-side by parseSchedule (on save and again on
-- every load, falling back to the default if it doesn't parse); this only
-- rejects what is obviously not a schedule.
create or replace function public.save_generation_config(
  p_mode text, p_effective_from_day integer, p_schedule jsonb, p_note text default ''
) returns bigint language plpgsql security definer set search_path = public as $$
declare
  saved_id bigint;
begin
  if not public.is_admin() then
    raise exception 'only admins can change level generation' using errcode = '42501';
  end if;
  if p_effective_from_day <= public.current_puzzle_day() then
    raise exception 'a config can only take effect from tomorrow (day %) on', public.current_puzzle_day() + 1;
  end if;
  if jsonb_typeof(p_schedule) <> 'object'
     or p_schedule->>'version' is distinct from '1'
     or jsonb_typeof(p_schedule->'sites') <> 'array'
     or jsonb_array_length(p_schedule->'sites') <> 7 then
    raise exception 'not a schedule: expected version 1 with 7 sites';
  end if;

  insert into public.generation_configs (mode, effective_from_day, schedule, note, created_by)
  values (p_mode, p_effective_from_day, p_schedule, coalesce(p_note, ''), auth.uid())
  on conflict (mode, effective_from_day) do update
    set schedule = excluded.schedule, note = excluded.note,
        created_by = excluded.created_by, created_at = now()
  returning id into saved_id;
  return saved_id;
end;
$$;

revoke all on function public.save_generation_config(text, integer, jsonb, text) from public, anon, authenticated;
grant execute on function public.save_generation_config(text, integer, jsonb, text) to authenticated;

-- Cancel a config that hasn't taken effect yet. Ones already in force (or
-- past) stay, so any day's puzzles can still be traced to what made them.
create or replace function public.delete_generation_config(p_id bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can change level generation' using errcode = '42501';
  end if;
  delete from public.generation_configs
    where id = p_id and effective_from_day > public.current_puzzle_day();
  if not found then
    raise exception 'no scheduled config % (configs already in force cannot be deleted)', p_id;
  end if;
end;
$$;

revoke all on function public.delete_generation_config(bigint) from public, anon, authenticated;
grant execute on function public.delete_generation_config(bigint) to authenticated;

-- ============================================================
-- 4) Make yourself an admin (fill in your profile id, then run)
-- ============================================================
-- insert into public.admins (user_id)
--   select id from public.profiles where username = 'your_handle'
--   on conflict do nothing;
