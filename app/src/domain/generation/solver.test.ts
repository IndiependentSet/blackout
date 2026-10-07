import { describe, expect, it } from 'vitest';
import type { Edge } from '../types';
import { KEPT_OPTIMA, solve } from '.';

/** `copies` separate 4-cycles: each has 2 optimal covers, so 2^copies in all. */
function squares(copies: number) {
  const edges: Edge[] = [];
  for (let s = 0; s < copies; s++) {
    const o = 4 * s;
    edges.push([o, o + 1], [o + 1, o + 2], [o + 2, o + 3], [o + 3, o]);
  }
  const adj: number[][] = Array.from({ length: 4 * copies }, () => []);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  return { nodes: adj.map((_, i) => ({ c: i, r: 0 })), edges, adj };
}
const covers = (edges: Edge[], set: number[]) => edges.every(([a, b]) => set.includes(a) || set.includes(b));

describe('solve: other optima', () => {
  it('keeps every other optimal cover when there are few', () => {
    const g = squares(2);
    const r = solve(g);
    expect(r).toMatchObject({ k: 4, count: 4 });
    expect(r.alts).toHaveLength(3);
    expect(r.alt).toEqual(r.alts[0]);
    const all = [r.sol, ...r.alts].map(s => [...s].sort((a, b) => a - b).join());
    expect(new Set(all).size).toBe(4);
    for (const s of r.alts) { expect(s).toHaveLength(4); expect(covers(g.edges, s)).toBe(true); }
  });

  it('counts them all but keeps only the first few', () => {
    const r = solve(squares(6));
    expect(r.count).toBe(64);
    expect(r.alts).toHaveLength(KEPT_OPTIMA);
  });

  it('keeps none for a unique cover', () => {
    const r = solve({ nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }], edges: [[0, 1], [1, 2]], adj: [[1], [0, 2], [1]] });
    expect(r).toMatchObject({ count: 1, alt: null, alts: [] });
  });
});
