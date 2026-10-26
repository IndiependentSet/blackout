import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCHEDULE, levelForSite, levelsForDay, solve } from './generation';
import { hintDarkMatching, hintMatching } from './hints';
import { coveredEdges } from './cover';
import type { Level } from './types';

/* Stargazer's Count against par on the same 70 skies the old count was measured on (DEFAULT_SCHEDULE, days 190–199).
   The clock is frozen for the same reason as determinism.test.ts: generation has a wall-clock budget.
   A whole day takes ~20 s to generate, so by default only the four smaller skies of each night are checked (40 skies);
   MEASURE=1 runs all 70 and prints the before/after table. */
beforeAll(() => { vi.spyOn(Date, 'now').mockReturnValue(0); });
afterAll(() => { vi.restoreAllMocks(); });

const DAYS = Array.from({ length: 10 }, (_, i) => 190 + i);
const MEASURE = !!import.meta.env.MEASURE;
let skies: Level[] = [];
beforeAll(() => {
  skies = MEASURE ? DAYS.flatMap(d => levelsForDay(DEFAULT_SCHEDULE, d))
    : DAYS.flatMap(d => [0, 1, 2, 3].map(i => levelForSite(DEFAULT_SCHEDULE, d, i)));
}, 600_000);

/* the fewest more stars that light every dark line, exactly */
function stillNeeded(lv: Level, placed: number[]): number {
  const lit = coveredEdges(lv, placed);
  const dark = lv.edges.filter((_, i) => !lit.has(i));
  if (!dark.length) return 0;
  const ids = [...new Set(dark.flat())];
  const at = new Map(ids.map((v, i) => [v, i]));
  const edges = dark.map(([u, v]) => [at.get(u)!, at.get(v)!] as [number, number]);
  const adj: number[][] = ids.map(() => []);
  edges.forEach(([u, v]) => { adj[u].push(v); adj[v].push(u); });
  return solve({ nodes: ids.map(() => ({ c: 0, r: 0 })), edges, adj }).k;
}

describe('the telescope counts', () => {
  it('measures the skies', () => expect(skies).toHaveLength(MEASURE ? 70 : 40));

  it('counts at least as many as the greedy count, never more than par, and only dark lines', () => {
    const rows = skies.map(lv => {
      const greedy = hintMatching(lv).length, max = hintDarkMatching(lv, []).length;
      expect(max).toBeGreaterThanOrEqual(greedy);
      expect(max).toBeLessThanOrEqual(lv.k);
      return { stars: lv.nodes.length, par: lv.k, greedy, max };
    });
    const below = (key: 'greedy' | 'max') => rows.filter(r => r[key] < r.par).length;
    const gap = (key: 'greedy' | 'max') => rows.reduce((s, r) => s + r.par - r[key], 0) / rows.length;
    if (MEASURE) {
      console.table(rows);
      console.log(`below par: greedy ${below('greedy')}/${rows.length}, maximum ${below('max')}/${rows.length}; ` +
        `mean gap: greedy ${gap('greedy').toFixed(2)}, maximum ${gap('max').toFixed(2)}`);
    }
    expect(below('max')).toBeLessThanOrEqual(below('greedy'));
    expect(gap('max')).toBeLessThan(gap('greedy'));
  });

  it('stays a lower bound on the stars still needed, part way through any sky', () => {
    let overPar = 0;
    skies.forEach(lv => {
      const half = lv.sol.slice(0, Math.floor(lv.sol.length / 2));
      const n = hintDarkMatching(lv, half).length;
      expect(half.length + n).toBeLessThanOrEqual(lv.k);
      expect(n).toBeLessThanOrEqual(stillNeeded(lv, half));
      /* two stars off the answer, then half the answer */
      const wrong = lv.nodes.map((_, i) => i).filter(i => !lv.sol.includes(i)).slice(0, 2);
      const placed = [...wrong, ...half];
      const m = hintDarkMatching(lv, placed);
      expect(m.length).toBeLessThanOrEqual(stillNeeded(lv, placed));
      const lit = coveredEdges(lv, placed);
      expect(m.every(i => !lit.has(i))).toBe(true);
      if (placed.length + m.length > lv.k) overPar++;
    });
    if (MEASURE) console.log(`two wrong stars lit: the count shows par out of reach on ${overPar}/${skies.length}`);
  });

  it('counts nothing once the figure is complete', () => {
    skies.slice(0, 7).forEach(lv => expect(hintDarkMatching(lv, lv.sol)).toEqual([]));
  });
});
