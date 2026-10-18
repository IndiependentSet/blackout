-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md). Safe to run twice.
--
-- Why: the daily week (7 sites) used to be generated on every player's device
-- from the day's seed. The generator has a wall-clock search budget, so two
-- devices could settle on different levels for the same day, and the server
-- had no copy to judge a clear against. Now a scheduled job
-- (.github/workflows/publish-daily.yml, app/tools/publish-daily.ts) generates
-- the week at 00:00 GMT and stores it here; every player reads the same rows.
-- Until the job has run, the app falls back to generating locally, exactly as
-- before, and does not record those clears.
--
--   daily_levels   one row per (day, site): the level as the generator made
--                  it. `day` is the puzzle day (domain/calendar.ts dayNumber),
--                  `idx` the site, 0..6. Rows are never rewritten: players may
--                  already have cleared them.
--
-- Access: RLS is on; anyone may read. Only the service role (the job) may
-- insert, and a trigger refuses any level that level_is_valid does not accept.
-- It cannot prove the optimum is unique: the generator guarantees that and the
-- job re-checks it with the solver before it sends anything.

create table if not exists public.daily_levels (
  day int not null check (day >= 1),
  idx int not null check (idx between 0 and 6),
  level jsonb not null,
  created_at timestamptz not null default now(),
  primary key (day, idx)
);

alter table public.daily_levels enable row level security;

drop policy if exists daily_levels_read on public.daily_levels;
create policy daily_levels_read on public.daily_levels for select to anon, authenticated using (true);

revoke all on public.daily_levels from anon, authenticated;
grant select on public.daily_levels to anon, authenticated;
grant select, insert on public.daily_levels to service_role;

create or replace function public.daily_levels_check()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.level_is_valid(new.level) then
    raise exception 'daily level % of day % is not a valid level', new.idx, new.day using errcode = '22023';
  end if;
  if jsonb_array_length(new.level -> 'nodes') > 40 then
    raise exception 'daily level % of day % has more than 40 junctions', new.idx, new.day using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_daily_levels_check on public.daily_levels;
create trigger trg_daily_levels_check
  before insert on public.daily_levels
  for each row execute function public.daily_levels_check();
