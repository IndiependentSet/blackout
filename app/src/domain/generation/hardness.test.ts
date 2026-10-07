import { describe, expect, it } from 'vitest';
import { hintMatching } from '../hints';
import type { Edge, Level } from '../types';
import { DEFAULT_SCHEDULE, greedyCover, levelForSite, matchingBound, solve } from '.';

/** A level shape from an edge list (positions don't matter here). */
function shape(n: number, edges: Edge[]): Pick<Level, 'nodes' | 'edges' | 'adj'> {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  return { nodes: adj.map((_, i) => ({ c: i, r: 0 })), edges, adj };
}

describe('greedyCover', () => {
  it('falls for the busiest junction when its neighbours are the real answer', () => {
    /* 0 touches 1, 2, 3 and each of those has a dead end: greedy takes 0 first (3 paths),
       then still needs 1, 2 and 3 — four cats against a par of three */
    const g = shape(7, [[0, 1], [0, 2], [0, 3], [1, 4], [2, 5], [3, 6]]);
    expect(solve(g).k).toBe(3);
    expect(greedyCover(g)).toBe(4);
  });

  it('matches par where taking the busiest junction is right', () => {
    const star = shape(5, [[0, 1], [0, 2], [0, 3], [0, 4]]);
    expect(greedyCover(star)).toBe(1);
    expect(greedyCover(shape(3, []))).toBe(0);
  });

  it('never beats par on real levels', () => {
    for (let i = 0; i < 4; i++) {
      const lv = levelForSite(DEFAULT_SCHEDULE, 12, i);
      expect(greedyCover(lv)).toBeGreaterThanOrEqual(lv.k);
    }
  });
});

describe('matchingBound', () => {
  it('is what the ESTIMATE consultant shows, and never above par', () => {
    for (let i = 0; i < 4; i++) {
      const lv = levelForSite(DEFAULT_SCHEDULE, 40, i);
      expect(matchingBound(lv)).toBe(hintMatching(lv).length);
      expect(matchingBound(lv)).toBeLessThanOrEqual(lv.k);
    }
  });
});
