-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md).
--
-- Why: Stargazer lets a player name the constellation they charted on a night
-- (the "Night charted" page) and keeps the named ones in their atlas. One row
-- per player per night: naming the same night again renames it.
--
--   day_number  the night, as dayNumber() in app/src/domain/calendar.ts
--   name        what the player called it, 1 to 40 characters once trimmed
--   figure      the drawing: the night's last sky as {nodes, edges}, copied in
--               so the atlas can draw every figure without re-reading old
--               weeks. Cosmetic only: nothing about scoring reads it.
--
-- A player reads and writes only their own rows (row level security, as for
-- campaign_clears). Names are not shown to anyone else.

create table if not exists public.sky_names (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_number int not null check (day_number >= 1),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  figure jsonb not null check (
    jsonb_typeof(figure -> 'nodes') = 'array'
    and jsonb_typeof(figure -> 'edges') = 'array'
    and jsonb_array_length(figure -> 'nodes') <= 40
    and pg_column_size(figure) <= 8192
  ),
  named_at timestamptz not null default now(),
  primary key (user_id, day_number)
);

alter table public.sky_names enable row level security;

drop policy if exists sky_names_select_own on public.sky_names;
create policy sky_names_select_own on public.sky_names
  for select to authenticated using (user_id = auth.uid());

drop policy if exists sky_names_insert_own on public.sky_names;
create policy sky_names_insert_own on public.sky_names
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists sky_names_update_own on public.sky_names;
create policy sky_names_update_own on public.sky_names
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- update as well as insert: the client upserts, and ON CONFLICT DO UPDATE needs
-- UPDATE privilege even when nothing conflicts.
revoke all on public.sky_names from anon, authenticated;
grant select, insert, update on public.sky_names to authenticated;
