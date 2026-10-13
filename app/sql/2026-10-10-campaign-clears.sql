-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Run AFTER 2026-09-08-merge-nickname-username.sql. Read app/sql/README.md
-- first: this is the first table that turns row level security on.
--
-- Why: the campaign (100 levels, 7 chapters; domain/campaign.ts) needs a
-- record per player that survives a reload. One row per (user, level), keeping
-- the best run: recordCampaignClear() upserts, the same pattern as
-- site_clears.
--
-- Campaign clears are deliberately NOT in site_clears, so nothing here changes
-- the daily leaderboard or its views.
--
-- stars / cats_used / par describe the run the same way site_clears does.
-- `stars` is the level's difficulty rating (1-3). `campaign_stars` (0-3) is
-- the campaign's own reward: 1 for the clear, +1 on budget, +1 when INSIDER
-- never gave the answer away (domain/campaign.ts campaignStars()).
--
-- `score` is generated with exactly the same expression as site_clears.score
-- (domain/scoring.ts mirrors both). Change one, change them all.
--
-- Keep-best: a BEFORE UPDATE trigger keeps the fewer cats and the higher
-- campaign_stars, independently, so a worse replay is a no-op (mirrors
-- mergeClear() on the client).
--
-- Access: RLS is on and every policy is "this row is mine", so a signed-in
-- player can read and write only their own record. No grants to anon.

create table if not exists public.campaign_clears (
  user_id uuid not null references public.profiles (id) on delete cascade,
  level_no smallint not null check (level_no between 1 and 100),
  cats_used int not null check (cats_used >= 1),
  par int not null check (par >= 1),
  stars smallint not null check (stars between 1 and 3),
  campaign_stars smallint not null check (campaign_stars between 0 and 3),
  score int generated always as (
    greatest(0, stars * 10 - (cats_used - par) * 5)
  ) stored,
  cleared_at timestamptz not null default now(),
  primary key (user_id, level_no)
);

create or replace function public.campaign_clears_keep_best()
returns trigger language plpgsql as $$
begin
  if new.cats_used > old.cats_used then
    new.cats_used := old.cats_used;
  end if;
  new.campaign_stars := greatest(new.campaign_stars, old.campaign_stars);
  return new;
end;
$$;

drop trigger if exists trg_campaign_clears_keep_best on public.campaign_clears;
create trigger trg_campaign_clears_keep_best
  before update on public.campaign_clears
  for each row execute function public.campaign_clears_keep_best();

alter table public.campaign_clears enable row level security;

drop policy if exists campaign_clears_select_own on public.campaign_clears;
create policy campaign_clears_select_own on public.campaign_clears
  for select to authenticated using (user_id = auth.uid());

drop policy if exists campaign_clears_insert_own on public.campaign_clears;
create policy campaign_clears_insert_own on public.campaign_clears
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists campaign_clears_update_own on public.campaign_clears;
create policy campaign_clears_update_own on public.campaign_clears
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- update is needed as well as insert: recordCampaignClear() upserts, and
-- Postgres requires UPDATE privilege for ON CONFLICT DO UPDATE even on the
-- path where nothing conflicts (see 2026-09-07-site-clears-upsert-grant.sql).
grant select, insert, update on public.campaign_clears to authenticated;
