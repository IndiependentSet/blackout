/* Generates a fresh 1vs1 level pool and publishes it as the next version of the match pool, so ranked players do not
 * meet the same maps for long. Run by .github/workflows/publish-match-pool.yml every night (and on demand).
 *
 *   publish-match-pool.ts [--day N]
 *
 *   --day N   the puzzle day (domain/calendar.ts) that seeds the pool, instead of today's
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The curve is DEFAULT_CURVES.match with the day as its seed; the
 * pool's note is "nightly day N", which is how a second run for the same day knows to do nothing. The database keeps
 * the newest seven match pools. Every level is re-checked with the solver for a unique cover before anything is sent.
 * Not type-checked by `npm run check` (it lives outside src/); keep it small.
 */
import { createClient } from '@supabase/supabase-js';
import { dayNumber } from '../src/domain/calendar';
import { DEFAULT_CURVES, curveRuleErrors, generateSlot, poolSlots, solve } from '../src/domain/generation';

const need = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
};
const must = <T>(what: string, r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

const args = process.argv.slice(2);
const dayArg = args.indexOf('--day');
const day = dayArg >= 0 ? Number(args[dayArg + 1]) : dayNumber();
if (!Number.isInteger(day) || day < 1) throw new Error(`not a puzzle day: ${args[dayArg + 1]}`);

const db = createClient(need('SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const note = `nightly day ${day}`;

const done = must('read level_pools', await db.from('level_pools').select('version').eq('mode', 'match').eq('note', note)) ?? [];
if (done.length) {
  console.log(`${note}: already published (v${(done[0] as { version: number }).version}), nothing to do`);
  process.exit(0);
}

const curve = { ...DEFAULT_CURVES.match, seed: day };
const errors = curveRuleErrors('match', curve);
if (errors.length) throw new Error(errors.join('; '));

const entries = [];
const keys = new Set<string>();   // no sky twice in a pool
for (const slot of poolSlots('match', curve)) {
  const t0 = Date.now();
  const { level, salt, key, duplicate } = generateSlot(curve, slot, keys);
  if (duplicate) console.warn(`slot ${slot.slot}: repeats a sky already in the pool (nothing new found)`);
  keys.add(key);
  const r = solve(level);
  if (r.count !== 1 || r.k !== level.k) throw new Error(`slot ${slot.slot}: not a unique cover`);
  const want = curve.tiers[slot.tier];
  console.log(`slot ${slot.slot} (tier ${slot.tier}): ${level.nodes.length} nodes, par ${level.k}, ${level.stars}★${level.stars !== want.diff ? ` (wanted ${want.diff}★)` : ''}, ${salt === null ? 'fallback' : 'retry ' + salt}, ${Date.now() - t0} ms`);
  const { _score, ...clean } = level;   // the generator's private ranking, not part of the level
  entries.push({ slot: slot.slot, tier: slot.tier, level: clean });
}

const version = must('publish_match_pool_system', await db.rpc('publish_match_pool_system', { p_curve: curve, p_levels: entries, p_note: note }));
console.log(`${note}: published as version ${version} (${entries.length} levels)`);
