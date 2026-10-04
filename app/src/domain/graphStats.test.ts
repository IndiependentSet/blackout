import { describe, expect, it } from 'vitest';
import { crossingPairs, graphStats } from './graphStats';
import type { Cell, Edge } from './types';

const graph = (nodes: Cell[], edges: Edge[]) => {
  const adj = nodes.map(() => [] as number[]);
  for (const [a, b] of edges) { adj[a].push(b); adj[b].push(a); }
  return { nodes, edges, adj };
};
const square = [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 1, r: 1 }, { c: 0, r: 1 }];

describe('graphStats', () => {
  it('describes a 4-cycle', () => {
    const s = graphStats(graph(square, [[0, 1], [1, 2], [2, 3], [3, 0]]));
    expect(s).toMatchObject({
      nodes: 4, edges: 4, minDegree: 2, maxDegree: 2, meanDegree: 2, degrees: [0, 0, 4],
      components: 1, bipartite: true, triangles: 0, crossings: 0, eulerNonPlanar: false,
    });
  });

  it('finds triangles, odd cycles and separate components', () => {
    const nodes = [...square, { c: 5, r: 5 }, { c: 6, r: 5 }];
    const s = graphStats(graph(nodes, [[0, 1], [1, 2], [2, 0], [4, 5]]));
    expect(s.triangles).toBe(1);
    expect(s.bipartite).toBe(false);
    expect(s.components).toBe(3);     // triangle, the isolated node 3, the far pair
    expect(s.degrees).toEqual([1, 2, 3]);
  });

  it('counts crossing diagonals but not paths that share a junction', () => {
    const g = graph(square, [[0, 2], [1, 3], [0, 1]]);
    expect(crossingPairs(g)).toEqual([[0, 1]]);
    expect(graphStats(g).crossings).toBe(1);
  });

  it('flags K5 as non-planar by edge count', () => {
    const nodes = [0, 1, 2, 3, 4].map(i => ({ c: i, r: i * i }));
    const edges: Edge[] = [];
    for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) edges.push([a, b]);
    expect(graphStats(graph(nodes, edges)).eulerNonPlanar).toBe(true);
  });
});
