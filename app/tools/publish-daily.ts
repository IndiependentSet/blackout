/* Generates one puzzle day's seven levels and stores them in public.daily_levels, so every player plays the
 * same week. Run by .github/workflows/publish-daily.yml at 00:00 GMT (and on demand).
 *
 *   publish-daily.ts [--day N]
 *
 *   --day N   a puzzle day (domain/calendar.ts) instead of today's
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. It never overwrites: a day that already has rows is left
 * alone (players may have cleared them), so running it twice is harmless. The schedule is the config in force on
 * that day (generation_configs), or the default. Not type-checked by `npm run check` (it lives outside src/);
 * keep it small.
 */
import { createClient } from '@supabase/supabase-js';
import { dayNumber, daySeed } from '../src/domain/calendar';
import { levelForSiteReport, solve } from '../src/domain/generation';
import { resolveSchedule, type StoredConfig } from '../src/domain/generationConfig';
import { SITE_COUNT } from '../src/domain/sites';

/** The job has time to spare: more fresh seeds per site than a player's device would try, so a site settles on a
    level that meets every rule instead of the first near miss. */
const JOB_MIN_RETRIES = 20;

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

const have = must('read daily_levels', await db.from('daily_levels').select('idx').eq('day', day)) ?? [];
if (have.length >= SITE_COUNT) {
  console.log(`day ${day}: already published (${have.length} levels), nothing to do`);
  process.exit(0);
}

const rows = must('read generation_configs', await db.from('generation_configs')
  .select('id, mode, effective_from_day, schedule, note, created_at')
  .eq('mode', 'daily').lte('effective_from_day', day).order('effective_from_day', { ascending: false }).limit(1));
const row = (rows as { id: number; mode: 'daily'; effective_from_day: number; schedule: unknown; note: string | null; created_at: string }[])[0];
const stored: StoredConfig | null = row
  ? { id: row.id, mode: 'daily', effectiveFromDay: row.effective_from_day, schedule: row.schedule, note: row.note ?? '', createdAt: row.created_at }
  : null;
const resolved = resolveSchedule(stored);
if (resolved.source === 'invalid') console.warn(`day ${day}: the saved config does not parse (${resolved.errors.join('; ')}), using the default week`);
const schedule = { ...resolved.schedule, retries: Math.max(resolved.schedule.retries, JOB_MIN_RETRIES) };

const entries = [];
for (let idx = 0; idx < SITE_COUNT; idx++) {
  const t0 = Date.now();
  const { level, salt } = levelForSiteReport(schedule, daySeed(day), idx);
  const r = solve(level);
  if (r.count !== 1 || r.k !== level.k) throw new Error(`day ${day} site ${idx}: not a unique cover`);
  const want = schedule.sites[idx];
  const missed = level.stars !== want.diff;
  console.log(`day ${day} site ${idx}: ${level.nodes.length} nodes, par ${level.k}, ${level.stars}★${missed ? ` (wanted ${want.diff}★)` : ''}, ${salt === null ? 'fallback' : 'retry ' + salt}, ${Date.now() - t0} ms`);
  const { _score, ...clean } = level;   // the generator's private ranking, not part of the level
  entries.push({ day, idx, level: clean });
}

must('insert daily_levels', await db.from('daily_levels').upsert(entries, { onConflict: 'day,idx', ignoreDuplicates: true }).select('idx'));
console.log(`day ${day}: published ${entries.length} levels`);
