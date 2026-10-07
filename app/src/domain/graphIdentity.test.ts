import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE, levelForSite } from './generation';
import { rngFromSeed } from './rng';
import { drawingKey, shapeKey } from './graphIdentity';
import type { Cell, Edge } from './types';

const graph = (edges: Edge[], nodes?: Cell[]) => {
  const n = 1 + Math.max(...edges.flat());
  const adj = Array.from({ length: n }, () => [] as number[]);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  return { nodes: nodes ?? Array.from({ length: n }, (_, i) => ({ c: i, r: 0 })), edges, adj };
};
/* the same graph with its nodes renumbered */
const relabel = (g: ReturnType<typeof graph>, perm: number[]) => graph(
  g.edges.map(([a, b]) => [perm[a], perm[b]] as Edge),
  g.nodes.map((_, i) => g.nodes[perm.indexOf(i)]));
const shuffle = (n: number, seed: number) => {
  const rng = rngFromSeed(seed), p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  return p;
};

describe('shapeKey', () => {
  it('ignores node order, on real levels', () => {
    for (const site of [1, 3, 5, 6]) {
      const lv = levelForSite(DEFAULT_SCHEDULE, 40, site);
      const g = graph(lv.edges, lv.nodes);
      for (let s = 0; s < 3; s++) {
        const k = shapeKey(relabel(g, shuffle(lv.nodes.length, s)));
        expect(k).toEqual(shapeKey(g));
        expect(k.exact).toBe(true);
      }
    }
  });

  it('separates graphs that colour refinement alone cannot', () => {
    /* both 3-regular on 6 nodes: the prism and K3,3 */
    const prism = graph([[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]]);
    const k33 = graph([[0, 3], [0, 4], [0, 5], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5]]);
    /* both 2-regular on 6 nodes: one hexagon and two triangles */
    const hex = graph([[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]);
    const twoTri = graph([[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]]);
    expect(shapeKey(prism).key).not.toBe(shapeKey(k33).key);
    expect(shapeKey(hex).key).not.toBe(shapeKey(twoTri).key);
    expect(shapeKey(relabel(k33, [5, 3, 1, 0, 2, 4])).key).toBe(shapeKey(k33).key);
  });

  it('flags a fallback when the search is capped', () => {
    const hex = graph([[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]);
    expect(shapeKey(hex, 1).exact).toBe(false);
    expect(shapeKey(hex).exact).toBe(true);
  });
});

describe('drawingKey', () => {
  const L = graph([[0, 1], [1, 2]], [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 1, r: 1 }]);
  it('ignores position, rotation, mirroring and node order', () => {
    const moved = graph([[0, 1], [1, 2]], [{ c: 5, r: 7 }, { c: 5, r: 8 }, { c: 4, r: 8 }]);
    expect(drawingKey(moved)).toBe(drawingKey(L));
    expect(drawingKey(relabel(L, [2, 0, 1]))).toBe(drawingKey(L));
  });
  it('tells apart two drawings of the same graph', () => {
    const straight = graph([[0, 1], [1, 2]], [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }]);
    expect(drawingKey(straight)).not.toBe(drawingKey(L));
    expect(shapeKey(straight).key).toBe(shapeKey(L).key);
  });
});
