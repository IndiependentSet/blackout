/** Structural facts about a level's graph, for the generator playground. Pure. */
import { segCross } from './engine';
import type { Level } from './types';

export interface GraphStats {
  nodes: number;
  edges: number;
  minDegree: number;
  maxDegree: number;
  meanDegree: number;
  /** histogram[d] = junctions with exactly d paths */
  degrees: number[];
  components: number;
  bipartite: boolean;
  triangles: number;
  /** pairs of paths whose drawn segments cross */
  crossings: number;
  /** edges > 3n - 6 proves the graph non-planar (the converse doesn't hold) */
  eulerNonPlanar: boolean;
}

/** Index pairs of edges whose segments cross (shared endpoints don't count). */
export function crossingPairs(lv: Pick<Level, 'nodes' | 'edges'>): [number, number][] {
  const out: [number, number][] = [];
  const { nodes: P, edges: E } = lv;
  for (let i = 0; i < E.length; i++) {
    const [a, b] = E[i];
    for (let j = i + 1; j < E.length; j++) {
      const [c, d] = E[j];
      if (a === c || a === d || b === c || b === d) continue;
      if (segCross(P[a], P[b], P[c], P[d])) out.push([i, j]);
    }
  }
  return out;
}

/* BFS 2-colouring; returns the component count and whether every one coloured cleanly */
function colour(adj: number[][]) {
  const side = new Int8Array(adj.length).fill(-1);
  let components = 0, bipartite = true;
  for (let s = 0; s < adj.length; s++) {
    if (side[s] >= 0) continue;
    components++;
    side[s] = 0;
    const queue = [s];
    while (queue.length) {
      const v = queue.pop() as number;
      for (const u of adj[v]) {
        if (side[u] < 0) { side[u] = 1 - side[v]; queue.push(u); }
        else if (side[u] === side[v]) bipartite = false;
      }
    }
  }
  return { components, bipartite };
}

function triangles(adj: number[][]) {
  let t = 0;
  const sets = adj.map(a => new Set(a));
  for (let v = 0; v < adj.length; v++)
    for (const u of adj[v]) if (u > v)
      for (const w of adj[u]) if (w > u && sets[v].has(w)) t++;
  return t;
}

export function graphStats(lv: Pick<Level, 'nodes' | 'edges' | 'adj'>): GraphStats {
  const n = lv.nodes.length, m = lv.edges.length;
  const deg = lv.adj.map(a => a.length);
  const maxDegree = n ? Math.max(...deg) : 0;
  const degrees = new Array<number>(maxDegree + 1).fill(0);
  for (const d of deg) degrees[d]++;
  return {
    nodes: n, edges: m,
    minDegree: n ? Math.min(...deg) : 0, maxDegree,
    meanDegree: n ? (2 * m) / n : 0,
    degrees,
    ...colour(lv.adj),
    triangles: triangles(lv.adj),
    crossings: crossingPairs(lv).length,
    eulerNonPlanar: n >= 3 && m > 3 * n - 6,
  };
}
