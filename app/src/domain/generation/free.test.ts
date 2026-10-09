import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { distPtSeg } from '../geometry';
import { crossingPairs, graphStats } from '../graphStats';
import { rngFromSeed } from '../rng';
import type { GenOptions } from '../types';
import { generate } from '.';
import type { Graph } from './builder';
import { growFree } from './free';
import { resolveOptions } from './options';

beforeAll(() => { vi.spyOn(Date, 'now').mockReturnValue(0); });
afterAll(() => { vi.restoreAllMocks(); });

const grow = (seed: number, size: number, opts: Partial<GenOptions> = {}) =>
  growFree(rngFromSeed(seed), size, resolveOptions({ strategy: 'free', ...opts }));

/** Grow a few graphs, skipping the (rare) seeds where the lattice ran out of room. */
function sample(opts: Partial<GenOptions>, size = 20, seeds = 12): Graph[] {
  const out: Graph[] = [];
  for (let s = 1; s <= seeds; s++) { const g = grow(s, size, opts); if (g) out.push(g); }
  expect(out.length).toBeGreaterThan(seeds / 2);
  return out;
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const edgeLength = (g: Graph) => mean(g.edges.map(([a, b]) => Math.hypot(g.nodes[a].c - g.nodes[b].c, g.nodes[a].r - g.nodes[b].r)));

function fourCycles(adj: number[][]): number {
  let k = 0;
  for (let u = 0; u < adj.length; u++) for (let v = u + 1; v < adj.length; v++) {
    const common = adj[u].filter(x => adj[v].includes(x)).length;
    k += (common * (common - 1)) / 2;
  }
  return k;
}

describe('free strategy', () => {
  it('builds exactly the size asked for, in one piece, within the degree cap', () => {
    for (const g of sample({ maxDegree: 4, reach: 2.3 })) {
      const s = graphStats(g);
      expect(s.nodes).toBe(20);
      expect(s.components).toBe(1);
      expect(s.maxDegree).toBeLessThanOrEqual(4);
    }
  });

  it('keeps the drawing planar when crossings are off, and junctions clear of paths', () => {
    for (const g of sample({ reach: 3.2, lengthBias: 1, density: 3 })) {
      expect(crossingPairs(g)).toEqual([]);
      g.nodes.forEach((p, i) => g.edges.forEach(([a, b]) => {
        if (a !== i && b !== i) expect(distPtSeg(p, g.nodes[a], g.nodes[b])).toBeGreaterThanOrEqual(g.cfg.clearance);
      }));
    }
  });

  it('respects the shortest cycle allowed', () => {
    for (const g of sample({ girth: 4, density: 3, reach: 2.3 })) expect(graphStats(g).triangles).toBe(0);
    for (const g of sample({ girth: 5, density: 3, reach: 2.3 })) expect(fourCycles(g.adj)).toBe(0);
  });

  it('gets denser with density', () => {
    const at = (density: number) => mean(sample({ density, maxDegree: 6, reach: 2.3, crossings: true }).map(g => graphStats(g).meanDegree));
    expect(at(1)).toBeCloseTo(2 * 19 / 20, 5);       // a spanning tree: n − 1 edges
    expect(at(3.5)).toBeGreaterThan(at(2.2) + 0.5);
  });

  it('prefers long or short paths as told', () => {
    const at = (lengthBias: number) => mean(sample({ lengthBias, reach: 3.2, spread: 4, crossings: true }).map(edgeLength));
    expect(at(1)).toBeGreaterThan(at(-1) + 0.4);
  });

  it('spreads out with spread', () => {
    const area = (spread: number) => mean(sample({ spread }).map(g => {
      const cs = g.nodes.map(p => p.c), rs = g.nodes.map(p => p.r);
      return (Math.max(...cs) - Math.min(...cs) + 1) * (Math.max(...rs) - Math.min(...rs) + 1);
    }));
    expect(area(4)).toBeGreaterThan(area(1) * 1.5);
  });

  it('is seed-reproducible', () => {
    const opts = { reach: 2.3, density: 3 };
    expect(grow(9, 16, opts)?.edges).toEqual(grow(9, 16, opts)?.edges);
  });

  it('generates levels whose size never drifts from the target (repairs add paths, not junctions)', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const { level, report } = generate({ seed, size: 12, diff: 2, options: { strategy: 'free', matchStars: false, clock: false, attempts: 60 } });
      expect(level?.nodes.length).toBe(12);
      expect(report.optima).toBe(1);
    }
  });
});
