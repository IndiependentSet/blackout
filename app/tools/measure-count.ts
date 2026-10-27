/* How close the telescope's Count gets to par: the old greedy count over every line against the new maximum matching
 * of the dark lines, on a fresh sky, over ten nights of DEFAULT_SCHEDULE.
 *
 *   npx tsx tools/measure-count.ts [--from 190] [--days 10] [--seed]
 *
 *   --seed   pass each night through daySeed() (as publish-daily does) instead of using the number as the seed
 *
 * Read-only, prints a table and a summary. The clock is frozen as in determinism.test.ts, so the skies are the ones
 * the tests see. Not type-checked by `npm run check` (it lives outside src/); keep it small.
 */
import { daySeed } from '../src/domain/calendar';
import { DEFAULT_SCHEDULE, levelsForDay } from '../src/domain/generation';
import { hintDarkMatching, hintMatching } from '../src/domain/hints';

Date.now = () => 0;
const arg = (name: string, def: number) => { const i = process.argv.indexOf(name); return i < 0 ? def : Number(process.argv[i + 1]); };
const from = arg('--from', 190), days = arg('--days', 10), seeded = process.argv.includes('--seed');

const rows = Array.from({ length: days }, (_, d) => from + d).flatMap(day =>
  levelsForDay(DEFAULT_SCHEDULE, seeded ? daySeed(day) : day).map((lv, i) => ({
    night: day, sky: i + 1, stars: lv.nodes.length, par: lv.k,
    greedy: hintMatching(lv).length, maximum: hintDarkMatching(lv, []).length,
  })));
console.table(rows);
for (const key of ['greedy', 'maximum'] as const) {
  const below = rows.filter(r => r[key] < r.par).length;
  const gap = rows.reduce((s, r) => s + r.par - r[key], 0) / rows.length;
  console.log(`${key.padEnd(8)} below par on ${below}/${rows.length} skies, ${gap.toFixed(2)} under on average`);
}
