-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md). Safe to run twice.
--
-- Why: an admin can draw a sky by hand (the admin pages' sky editor) and pin
-- it to one site of one future day of Tonight, instead of the generated one.
-- The daily job (app/tools/publish-daily.ts) reads this table when it
-- publishes that day and copies the drawn level into daily_levels in place of
-- generating that site; the other sites are generated as always.
--
--   daily_manual_levels  one row per (day, site): the level the drawing makes
--                        (par, answer and stars worked out by the solver in
--                        the browser, re-checked by the job) and the drawing.
--
-- Access: RLS on and no grants to players, so a future puzzle never leaks:
-- admins read through list_daily_manual_levels and write through
-- save_/delete_daily_manual_level (security definer, admin-checked, tomorrow
-- or later only, and never a day the job already published). The job reads
-- the table as the service role.

create table if not exists public.daily_manual_levels (
  day int not null check (day >= 1),
  idx int not null check (idx between 0 and 6),
  level jsonb not null,
  figure jsonb not null,
  note text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (day, idx)
);

alter table public.daily_manual_levels enable row level security;
revoke all on public.daily_manual_levels from anon, authenticated;
grant select on public.daily_manual_levels to service_role;

create or replace function public.save_daily_manual_level(
  p_day int, p_idx int, p_level jsonb, p_figure jsonb, p_note text default ''
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can pin a hand-drawn sky' using errcode = '42501';
  end if;
  if p_day is null or p_day <= public.current_puzzle_day() then
    raise exception 'a hand-drawn sky can only be pinned from tomorrow (day %) on', public.current_puzzle_day() + 1
      using errcode = '22023';
  end if;
  if p_idx is null or p_idx not between 0 and 6 then
    raise exception 'Tonight has skies 0 to 6' using errcode = '22023';
  end if;
  if not public.level_is_valid(p_level) or jsonb_array_length(p_level -> 'nodes') > 40 then
    raise exception 'not a valid level of at most 40 stars' using errcode = '22023';
  end if;
  if jsonb_typeof(p_figure) is distinct from 'object' then
    raise exception 'not a drawing' using errcode = '22023';
  end if;
  if exists (select 1 from public.daily_levels where day = p_day and idx = p_idx) then
    raise exception 'day % sky % is already published', p_day, p_idx using errcode = '22023';
  end if;
  insert into public.daily_manual_levels (day, idx, level, figure, note, created_by)
  values (p_day, p_idx, p_level, p_figure, coalesce(p_note, ''), auth.uid())
  on conflict (day, idx) do update
    set level = excluded.level, figure = excluded.figure, note = excluded.note,
        created_by = excluded.created_by, created_at = now();
end;
$$;

revoke all on function public.save_daily_manual_level(int, int, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.save_daily_manual_level(int, int, jsonb, jsonb, text) to authenticated;

create or replace function public.delete_daily_manual_level(p_day int, p_idx int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can pin a hand-drawn sky' using errcode = '42501';
  end if;
  delete from public.daily_manual_levels
    where day = p_day and idx = p_idx and day > public.current_puzzle_day();
  if not found then
    raise exception 'no upcoming hand-drawn sky for day % sky %', p_day, p_idx using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_daily_manual_level(int, int) from public, anon, authenticated;
grant execute on function public.delete_daily_manual_level(int, int) to authenticated;

-- The pinned skies from today on, for the admin page.
create or replace function public.list_daily_manual_levels()
returns table (day int, idx int, level jsonb, figure jsonb, note text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'only admins can see hand-drawn skies' using errcode = '42501';
  end if;
  return query
    select m.day, m.idx, m.level, m.figure, m.note, m.created_at from public.daily_manual_levels m
    where m.day >= public.current_puzzle_day() order by m.day, m.idx;
end;
$$;

revoke all on function public.list_daily_manual_levels() from public, anon, authenticated;
grant execute on function public.list_daily_manual_levels() to authenticated;
