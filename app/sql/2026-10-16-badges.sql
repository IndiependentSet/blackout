-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Run AFTER 2026-10-09-player-streaks.sql, 2026-10-10-campaign-clears.sql and
-- 2026-10-12-matches.sql (the award functions read player_streaks,
-- campaign_clears and match_players). Read app/sql/README.md first.
--
-- Why: six badges, shown on the staff ID card and on a workmate's personnel
-- file. They are a reward, not a currency (design decision D11): they unlock
-- cosmetics later, and nothing is spent.
--
-- Badges are only ever awarded here, by the server, from rows the server
-- already holds. There is no client write path at all: no INSERT/UPDATE/DELETE
-- grant on player_badges, and the award functions are not executable by
-- anon/authenticated. Triggers on site_clears, campaign_clears and
-- match_players call them.
--
--   purrfect-shift     all seven sites of one day cleared on budget
--   streak-7           a run of 7 days in a row with a clear (best_streak)
--   streak-30          a run of 30 days
--   chapter-clear      every level of one campaign chapter cleared
--   campaign-3-stars   a campaign level finished with all three campaign stars
--   first-duel-win     a 1vs1 match won
--
-- The ids are the contract with app/src/domain/badges.ts (the client's
-- catalogue, checked against this file by badges.test.ts) and with the
-- cosmetics that unlock from them. Do not rename them.
--
-- A bug in badge logic must never stop a clear from being saved. Each trigger
-- function catches every error from the award functions and downgrades it to
-- a WARNING, so the clear that fired it still commits.
--
-- Everything is idempotent (on conflict do nothing), so re-running a function
-- is harmless. The last statement backfills players who already qualify.

create table if not exists public.badges (
  id text primary key,
  name text not null,
  description text not null
);

-- names and descriptions here must match BADGES in app/src/domain/badges.ts;
-- no apostrophes, so badges.test.ts can compare the two literally
insert into public.badges (id, name, description) values
  ('purrfect-shift', 'PURR-FECT SHIFT', 'Cleared all seven sites of one day on budget.'),
  ('streak-7', 'WEEK ON THE JOB', 'Cleared at least one site seven days in a row.'),
  ('streak-30', 'LIFER', 'Cleared at least one site thirty days in a row.'),
  ('chapter-clear', 'SITE FOREMAN', 'Cleared every level of a campaign chapter.'),
  ('campaign-3-stars', 'CLEAN SWEEP', 'Finished a campaign level with all three stars.'),
  ('first-duel-win', 'FIRST BLOOD', 'Won a 1vs1 match.')
on conflict (id) do update set name = excluded.name, description = excluded.description;

create table if not exists public.player_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id text not null references public.badges (id),
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.badges enable row level security;
alter table public.player_badges enable row level security;

drop policy if exists badges_select_all on public.badges;
create policy badges_select_all on public.badges
  for select to anon, authenticated using (true);

-- a profile shows its badges to anyone signed in, so the read is public
drop policy if exists player_badges_select_all on public.player_badges;
create policy player_badges_select_all on public.player_badges
  for select to authenticated using (true);

grant select on public.badges to anon, authenticated;
grant select on public.player_badges to authenticated;

-- ---------------------------------------------------------------------------
-- Award functions: what each source of badges checks. security definer so they
-- can write player_badges; nobody but the owner (and the triggers below, which
-- run as the owner) can call them.
-- ---------------------------------------------------------------------------

create or replace function public.award_daily_badges(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 7 = SITE_COUNT in app/src/domain/sites.ts: every site of one day on budget
  insert into public.player_badges (user_id, badge_id)
  select p_user, 'purrfect-shift'
   where exists (
     select 1 from public.site_clears c
      where c.user_id = p_user
      group by c.day_number
     having count(distinct c.site_index) filter (where c.on_budget) >= 7)
  on conflict do nothing;

  insert into public.player_badges (user_id, badge_id)
  select p_user, b.id
    from public.player_streaks s
   cross join (values ('streak-7', 7), ('streak-30', 30)) as b(id, need)
   where s.user_id = p_user and s.best_streak >= b.need
  on conflict do nothing;
end;
$$;

create or replace function public.award_campaign_badges(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- the chapter bounds below are CHAPTERS in app/src/domain/campaign.ts
  -- (10/12/14/14/16/16/18 levels); badges.test.ts checks they still match
  insert into public.player_badges (user_id, badge_id)
  select p_user, 'chapter-clear'
   where exists (
     select 1 from (values (1, 10), (11, 22), (23, 36), (37, 50), (51, 66), (67, 82), (83, 100)) as ch(lo, hi)
      where (select count(*) from public.campaign_clears c
              where c.user_id = p_user and c.level_no between ch.lo and ch.hi) = ch.hi - ch.lo + 1)
  on conflict do nothing;

  insert into public.player_badges (user_id, badge_id)
  select p_user, 'campaign-3-stars'
   where exists (select 1 from public.campaign_clears c where c.user_id = p_user and c.campaign_stars = 3)
  on conflict do nothing;
end;
$$;

create or replace function public.award_duel_badges(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.player_badges (user_id, badge_id)
  select p_user, 'first-duel-win'
   where exists (select 1 from public.match_players m where m.user_id = p_user and m.result = 'won')
  on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers. The trigger functions swallow every error: see the header.
-- ---------------------------------------------------------------------------

create or replace function public.trg_award_daily_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.award_daily_badges(new.user_id);
  exception when others then
    raise warning 'award_daily_badges failed for %: %', new.user_id, sqlerrm;
  end;
  return null;
end;
$$;

create or replace function public.trg_award_campaign_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.award_campaign_badges(new.user_id);
  exception when others then
    raise warning 'award_campaign_badges failed for %: %', new.user_id, sqlerrm;
  end;
  return null;
end;
$$;

create or replace function public.trg_award_duel_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.award_duel_badges(new.user_id);
  exception when others then
    raise warning 'award_duel_badges failed for %: %', new.user_id, sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists trg_site_clears_badges on public.site_clears;
create trigger trg_site_clears_badges
  after insert or update on public.site_clears
  for each row execute function public.trg_award_daily_badges();

drop trigger if exists trg_campaign_clears_badges on public.campaign_clears;
create trigger trg_campaign_clears_badges
  after insert or update on public.campaign_clears
  for each row execute function public.trg_award_campaign_badges();

-- the match functions set result = 'won' with an UPDATE (finish_match, forfeit_match)
drop trigger if exists trg_match_players_badges on public.match_players;
create trigger trg_match_players_badges
  after update of result on public.match_players
  for each row
  when (new.result = 'won' and old.result is distinct from 'won')
  execute function public.trg_award_duel_badges();

revoke all on function public.award_daily_badges(uuid) from public, anon, authenticated;
revoke all on function public.award_campaign_badges(uuid) from public, anon, authenticated;
revoke all on function public.award_duel_badges(uuid) from public, anon, authenticated;
revoke all on function public.trg_award_daily_badges() from public, anon, authenticated;
revoke all on function public.trg_award_campaign_badges() from public, anon, authenticated;
revoke all on function public.trg_award_duel_badges() from public, anon, authenticated;

-- Backfill: players who already qualify get their badges now.
select public.award_daily_badges(id), public.award_campaign_badges(id), public.award_duel_badges(id)
  from public.profiles;
