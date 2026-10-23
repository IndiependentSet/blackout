-- Applied to production automatically on merge to main (app/tools/migrate.sh;
-- see app/sql/README.md). Safe to run twice.
--
-- Why: a Meteor Rush run met the same sky twice in ten sites. pool_pick chose
-- each site with an independent hash of (seed, step), and every step past the
-- tiers stays on the last tier, so from there on the sites were draws WITH
-- replacement from a handful of levels (six in the default pool: two of six
-- draws repeating is almost certain).
--
-- Now a run walks each tier WITHOUT replacement: the tier's levels are shuffled
-- by the run's seed (a hash of seed, tier and slot) and step n takes the next
-- one. A tier is only revisited once all of its levels have been played, and
-- then in the same order. Still a pure function of (pool, seed, step), so
-- submit_survival_site re-derives exactly the level the client was shown.
-- Same signature: survival_level and submit_survival_site pick it up as is.

create or replace function public.pool_pick(p_pool bigint, p_key text, p_step int)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  tiers int;
  t int;
  cnt int;
  pos int;
  lv jsonb;
begin
  select count(distinct tier) into tiers from public.pool_levels where pool_id = p_pool;
  if tiers = 0 then return null; end if;
  t := least(greatest(p_step, 0), tiers - 1);
  select count(*) into cnt from public.pool_levels where pool_id = p_pool and tier = t;
  -- steps before the last tier play one level of their tier; the rest walk the last one
  pos := (greatest(p_step, 0) - t) % cnt;
  select level into lv from public.pool_levels
   where pool_id = p_pool and tier = t
   order by hashtext(p_key || ':' || t || ':' || slot), slot
   offset pos limit 1;
  return lv;
end;
$$;

revoke all on function public.pool_pick(bigint, text, int) from public;
grant execute on function public.pool_pick(bigint, text, int) to anon, authenticated;
