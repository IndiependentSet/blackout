-- Run once in the Supabase SQL editor (Database > SQL Editor) against the
-- live project. Not applied automatically — no DB tool available client-side.
--
-- Why: recordClear() upserts one row per (user_id, day_number, site_index)
-- — the unique constraint already stops a replay from creating a second
-- row, but a plain upsert still overwrites with whatever the *latest*
-- attempt scored, even if it's worse than a previous one. A player who
-- replays an already-cleared site just to see if they can beat their own
-- time/cat-count would silently knock their own leaderboard score down.
--
-- Fix: a BEFORE UPDATE trigger that clamps a replay to the better of the
-- two cats_used values (par and stars are constant for a given day+site —
-- they're properties of the puzzle, not the attempt — so "better" is just
-- "fewer cats"). A worse replay becomes a no-op write; a better one goes
-- through as normal. This makes it safe to replay a cleared site purely to
-- chase a better score, per the product ask — the DB, not client
-- discipline, is what guarantees the leaderboard can only go up.

create or replace function public.site_clears_keep_best()
returns trigger language plpgsql as $$
begin
  if new.cats_used > old.cats_used then
    new.cats_used := old.cats_used;
  end if;
  new.on_budget := new.cats_used <= new.par;
  return new;
end;
$$;

drop trigger if exists trg_site_clears_keep_best on public.site_clears;
create trigger trg_site_clears_keep_best
  before update on public.site_clears
  for each row execute function public.site_clears_keep_best();
