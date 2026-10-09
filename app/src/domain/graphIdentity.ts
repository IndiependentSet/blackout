/* When are two levels "the same"? Two answers, both independent of node order:

   - drawingKey: the same picture — same lattice layout up to moving it and the
     8 symmetries of the square (rotations and mirrors). Exact.
   - shapeKey: the same abstract graph — same connections however they are
     drawn (graph isomorphism). Exact via a canonical labelling: colour
     refinement, then individualisation of one node at a time where colours
     tie, keeping the smallest edge list over all branches. Symmetric graphs
     branch a lot, so the search is capped; past the cap the key falls back to
     the refined colouring alone, which can merge two different graphs and is
     flagged `exact: false`.

   Pure; used by the playground's variety sweep. */
import type { Level } from './types';

type Graph = Pick<Level, 'nodes' | 'edges' | 'adj'>;

const SQUARE: ((c: number, r: number) => [number, number])[] = [
  (c, r) => [c, r], (c, r) => [-r, c], (c, r) => [-c, -r], (c, r) => [r, -c],
  (c, r) => [-c, r], (c, r) => [r, c], (c, r) => [c, -r], (c, r) => [-r, -c],
];

export function drawingKey(g: Pick<Level, 'nodes' | 'edges'>): string {
  let best = '';
  for (const f of SQUARE) {
    const p = g.nodes.map(n => f(n.c, n.r));
    const c0 = Math.min(...p.map(q => q[0])), r0 = Math.min(...p.map(q => q[1]));
    const at = (i: number) => (p[i][0] - c0) + ',' + (p[i][1] - r0);
    const nodes = p.map((_, i) => at(i)).sort().join(' ');
    const edges = g.edges.map(([a, b]) => [at(a), at(b)].sort().join('-')).sort().join(' ');
    const key = nodes + '|' + edges;
    if (!best || key < best) best = key;
  }
  return best;
}

/* ---------- canonical labelling ---------- */

function cmpNums(a: readonly number[], b: readonly number[]) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

/* Split colour classes by the colours of their neighbours until nothing
   changes. Ordered by (old colour, neighbour colours), so the result depends
   only on the graph and the starting colours, never on node indices. */
function refine(adj: number[][], start: number[]): number[] {
  let col = start;
  for (;;) {
    const sig = col.map((c, v) => [c, ...adj[v].map(u => col[u]).sort((x, y) => x - y)]);
    const order = sig.map((_, v) => v).sort((a, b) => cmpNums(sig[a], sig[b]));
    const next = new Array<number>(col.length);
    let rank = 0;
    order.forEach((v, i) => {
      if (i > 0 && cmpNums(sig[order[i - 1]], sig[v]) !== 0) rank++;
      next[v] = rank;
    });
    if (new Set(next).size === new Set(col).size) return next;
    col = next;
  }
}

function certificate(g: Graph, col: number[]): string {
  return g.edges.map(([a, b]) => (col[a] < col[b] ? col[a] + '-' + col[b] : col[b] + '-' + col[a]))
    .sort().join(' ');
}

export interface ShapeKey { key: string; exact: boolean }

/** Canonical form of the abstract graph. `maxLeaves` caps the branching. */
export function shapeKey(g: Graph, maxLeaves = 4000): ShapeKey {
  const n = g.nodes.length;
  const root = refine(g.adj, g.adj.map(a => a.length));
  let best: string | null = null, leaves = 0;

  const search = (col: number[]): void => {
    if (leaves > maxLeaves) return;
    const count = new Map<number, number>();
    for (const c of col) count.set(c, (count.get(c) ?? 0) + 1);
    /* the target cell: the lowest colour shared by more than one node */
    let cell = Infinity;
    for (const [c, k] of count) if (k > 1 && c < cell) cell = c;
    if (cell === Infinity) {
      leaves++;
      const cert = certificate(g, col);
      if (best === null || cert < best) best = cert;
      return;
    }
    for (let v = 0; v < n; v++) {
      if (col[v] !== cell) continue;
      /* individualise v: it keeps the cell's place, its twins move just after it */
      search(refine(g.adj, col.map((c, i) => c * 2 + (c === cell && i !== v ? 1 : 0))));
    }
  };
  search(root);

  if (best !== null && leaves <= maxLeaves) return { key: n + ':' + best, exact: true };
  return { key: '~' + n + ':' + g.edges.length + ':' + [...root].sort((a, b) => a - b).join(','), exact: false };
}
