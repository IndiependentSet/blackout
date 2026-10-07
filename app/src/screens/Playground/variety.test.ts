import { describe, expect, it } from 'vitest';
import type { Level } from '../../domain/types';
import { DEFAULT_PARAMS } from './params';
import { addLevel, chao1, newAcc, repeatChance, summarize, sweep } from './variety';

const lv = (edges: [number, number][], nodes: { c: number; r: number }[]): Level => {
  const adj = nodes.map(() => [] as number[]);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  return { nodes, edges, adj, k: 1, sol: [1], stars: 1 };
};
const straight = lv([[0, 1], [1, 2]], [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }]);
const bent = lv([[0, 1], [1, 2]], [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 1, r: 1 }]);
const turned = lv([[0, 1], [1, 2]], [{ c: 3, r: 3 }, { c: 3, r: 4 }, { c: 3, r: 5 }]);

describe('variety estimators', () => {
  it('chao1 adds unseen species from singletons and doubletons', () => {
    expect(chao1([5, 5, 5])).toBe(3);            // nothing rare: probably saw them all
    expect(chao1([1, 1, 1, 1, 2])).toBe(5 + 3);  // 5 seen; 4 singletons, 1 doubleton: 4·3 / (2·2) = 3 unseen
  });
  it('repeat chance is the share of non-singletons', () => {
    expect(repeatChance([1, 1, 2], 4)).toBe(0.5);
    expect(repeatChance([], 0)).toBe(0);
  });
});

describe('variety accumulator', () => {
  it('counts drawings and abstract graphs separately', () => {
    const acc = newAcc();
    addLevel(acc, 10, straight);
    addLevel(acc, 11, bent);
    addLevel(acc, 12, turned);
    addLevel(acc, 13, null);
    const s = summarize(acc);
    expect(s).toMatchObject({ tried: 4, found: 3, shapes: 1, drawings: 2 });
    expect(s.top[0]).toMatchObject({ count: 3, seed: 10, drawings: 2, nodes: 3, edges: 2 });
    expect(s.curve.at(-1)).toEqual({ tried: 4, shapes: 1, drawings: 2 });
  });

  it('counts closest misses and time apart from the levels that met every rule', () => {
    const acc = newAcc();
    addLevel(acc, 1, straight, { fallback: false, ms: 10 });
    addLevel(acc, 2, bent, { fallback: true, ms: 30 });
    addLevel(acc, 3, null, { fallback: false, ms: 20 });
    expect(summarize(acc)).toMatchObject({ tried: 3, found: 2, met: 1, msPerLevel: 20 });
  });

  it('sweeps consecutive seeds reproducibly', () => {
    const run = () => { const it = sweep({ ...DEFAULT_PARAMS, size: 4, diff: 1, seed: 100 }, 40); let r = it.next(); while (!r.done) r = it.next(); return summarize(r.value); };
    const a = run(), b = run();
    expect({ ...a, msPerLevel: 0 }).toEqual({ ...b, msPerLevel: 0 });     // time is wall time
    expect(a.tried).toBe(40);
    expect(a.shapes).toBeGreaterThan(0);
    expect(a.top.every(t => t.seed >= 100 && t.seed < 140)).toBe(true);
  });
});
