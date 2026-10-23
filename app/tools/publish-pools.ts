/* One-shot: generates the campaign and survival pools and publishes them as version 1 when no pool exists yet.
 * Run by hand from .github/workflows/publish-pools.yml (workflow_dispatch only, never scheduled).
 *
 *   publish-pools.ts [MODE…]   campaign and/or survival; both if none named
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. A mode that already has a pool is skipped, and the database
 * refuses to replace one (publish_seed_pool_system), so a pool an admin published is never touched. Every level is
 * re-checked with the solver for a unique cover; the campaign goes through orderByHardness, easiest first.
 * Not type-checked by `npm run check` (it lives outside src/); keep it small.
 */
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_CURVES, curveRuleErrors, generateSlot, orderByHardness, poolSlots, solve } from '../src/domain/generation';

const need = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
};
const must = <T>(what: string, r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data;
};

const SEEDABLE = ['campaign', 'survival'] as const;
type Mode = (typeof SEEDABLE)[number];
const named = process.argv.slice(2);
for (const m of named) if (!(SEEDABLE as readonly string[]).includes(m)) throw new Error(`not a mode to seed: ${m}`);
const modes = (named.length ? named : [...SEEDABLE]) as Mode[];

const db = createClient(need('SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

for (const mode of modes) {
  const have = must('read level_pools', await db.from('level_pools').select('version').eq('mode', mode)) ?? [];
  if (have.length) {
    console.log(`${mode}: already published, skipped`);
    continue;
  }
  const curve = DEFAULT_CURVES[mode];
  const errors = curveRuleErrors(mode, curve);
  if (errors.length) throw new Error(`${mode}: ${errors.join('; ')}`);
  const slots = poolSlots(mode, curve);
  const entries = [];
  const t0 = Date.now();
  const keys = new Set<string>();   // no sky twice in a pool
  for (const slot of slots) {
    const { level, key, duplicate } = generateSlot(curve, slot, keys);
    if (duplicate) console.warn(`${mode} slot ${slot.slot}: repeats a sky already in the pool (nothing new found)`);
    keys.add(key);
    const r = solve(level);
    if (r.count !== 1 || r.k !== level.k) throw new Error(`${mode} slot ${slot.slot}: not a unique cover`);
    const { _score, ...clean } = level;   // the generator's private ranking, not part of the level
    entries.push({ slot: slot.slot, tier: slot.tier, level: clean });
    if (entries.length % 10 === 0) console.log(`${mode}: ${entries.length}/${slots.length}`);
  }
  const version = must(`publish ${mode}`, await db.rpc('publish_seed_pool_system', {
    p_mode: mode, p_curve: curve, p_levels: mode === 'campaign' ? orderByHardness(entries) : entries, p_note: 'seed',
  }));
  console.log(`${mode}: published as version ${version} (${slots.length} levels, ${Math.round((Date.now() - t0) / 1000)} s)`);
}
