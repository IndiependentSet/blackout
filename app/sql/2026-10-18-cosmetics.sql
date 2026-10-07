-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
-- Run AFTER 2026-10-16-badges.sql (needs `badges` and `player_badges`). Read
-- app/sql/README.md first: RLS is on for the tables here, and every write is
-- a server function.
--
-- Why: cats can wear accessories (a hat on the head, a scarf at the neck).
-- They are purely cosmetic and are never sold: each one is unlocked by a
-- badge, so owning it proves the player did something. Until a monetisation
-- model is decided (D13-D16 in design-game-modes.md) there is no price column
-- and no payment path, on purpose.
--
-- Tables
--   cosmetics         the catalogue: slot, label and the badge that unlocks it.
--                     Mirrors COSMETICS in app/src/domain/cosmetics.ts — change
--                     one, change both. Readable by everyone.
--   player_cosmetics  what a player has unlocked. Written only by the badge
--                     trigger below, never by the client.
--   player_loadout    what a player has on: one accessory per slot. Written
--                     only through set_loadout().
--
-- Unlocking: a trigger on player_badges adds the matching accessories when a
-- badge is awarded. It swallows its own errors (with a warning), so a problem
-- here can never stop a badge from being recorded. The last statement of this
-- file backfills players who already hold a badge.
--
-- Wearing: set_loadout(slot, cosmetic) checks the player owns it and that it
-- belongs in that slot; a null cosmetic takes the slot's accessory off.
--
-- Art: the accessory pictures are separate files in app/src/assets/cosmetics/
-- (see the README there). Until they exist the cats are drawn bare; unlocking
-- and wearing still work and are stored.

create table if not exists public.cosmetics (
  id text primary key,
  slot text not null check (slot in ('head', 'neck')),
  label text not null,
  unlock_badge_id text not null references public.badges (id)
);

insert into public.cosmetics (id, slot, label, unlock_badge_id) values
  ('hard-hat', 'head', 'HARD HAT', 'purrfect-shift'),
  ('party-hat', 'head', 'PARTY HAT', 'first-duel-win'),
  ('bow-tie', 'neck', 'BOW TIE', 'streak-7'),
  ('scarf', 'neck', 'SCARF', 'campaign-3-stars')
on conflict (id) do update
  set slot = excluded.slot, label = excluded.label, unlock_badge_id = excluded.unlock_badge_id;

create table if not exists public.player_cosmetics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  cosmetic_id text not null references public.cosmetics (id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

create table if not exists public.player_loadout (
  user_id uuid not null references public.profiles (id) on delete cascade,
  slot text not null check (slot in ('head', 'neck')),
  cosmetic_id text not null references public.cosmetics (id),
  primary key (user_id, slot)
);

alter table public.cosmetics enable row level security;
alter table public.player_cosmetics enable row level security;
alter table public.player_loadout enable row level security;

drop policy if exists cosmetics_select_all on public.cosmetics;
create policy cosmetics_select_all on public.cosmetics
  for select to anon, authenticated using (true);

drop policy if exists player_cosmetics_select_own on public.player_cosmetics;
create policy player_cosmetics_select_own on public.player_cosmetics
  for select to authenticated using (user_id = auth.uid());

drop policy if exists player_loadout_select_own on public.player_loadout;
create policy player_loadout_select_own on public.player_loadout
  for select to authenticated using (user_id = auth.uid());

-- Read only. There is deliberately no insert/update/delete grant on any of these.
grant select on public.cosmetics to anon, authenticated;
grant select on public.player_cosmetics, public.player_loadout to authenticated;

-- Wear an accessory, or take the slot's one off with a null cosmetic.
create or replace function public.set_loadout(p_slot text, p_cosmetic text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'sign in to dress your cats' using errcode = '28000';
  end if;
  if p_slot is null or p_slot not in ('head', 'neck') then
    raise exception 'unknown slot' using errcode = '22023';
  end if;

  if p_cosmetic is null then
    delete from public.player_loadout where user_id = uid and slot = p_slot;
    return;
  end if;

  if not exists (select 1 from public.cosmetics c where c.id = p_cosmetic and c.slot = p_slot) then
    raise exception 'that accessory does not go there' using errcode = '22023';
  end if;
  if not exists (select 1 from public.player_cosmetics o where o.user_id = uid and o.cosmetic_id = p_cosmetic) then
    raise exception 'you have not unlocked that accessory' using errcode = '42501';
  end if;

  insert into public.player_loadout (user_id, slot, cosmetic_id)
  values (uid, p_slot, p_cosmetic)
  on conflict (user_id, slot) do update set cosmetic_id = excluded.cosmetic_id;
end;
$$;

-- Awarding a badge unlocks the accessories tied to it. Never lets an error
-- here undo or block the badge insert that fired it.
create or replace function public.unlock_cosmetics_for_badge()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.player_cosmetics (user_id, cosmetic_id)
    select new.user_id, c.id from public.cosmetics c where c.unlock_badge_id = new.badge_id
    on conflict do nothing;
  exception when others then
    raise warning 'unlock_cosmetics_for_badge failed for % / %: %', new.user_id, new.badge_id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists trg_unlock_cosmetics_for_badge on public.player_badges;
create trigger trg_unlock_cosmetics_for_badge
  after insert on public.player_badges
  for each row execute function public.unlock_cosmetics_for_badge();

revoke all on function public.set_loadout(text, text) from public, anon;
revoke all on function public.unlock_cosmetics_for_badge() from public, anon, authenticated;
grant execute on function public.set_loadout(text, text) to authenticated;

-- Players who already hold a badge get what it unlocks. Safe to re-run.
insert into public.player_cosmetics (user_id, cosmetic_id)
select b.user_id, c.id
  from public.player_badges b
  join public.cosmetics c on c.unlock_badge_id = b.badge_id
on conflict do nothing;
