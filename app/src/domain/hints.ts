/** What the consultants can point at on a level (SURVEY / ESTIMATE / INSIDER). Pure. */
import { coveredEdges } from './cover';
import { maxMatching } from './matching';
import type { Level } from './types';

export function hintLeaf(lv: Level, placed: Set<number>): { leaf: number; forced: number } | null {
  for (let i = 0; i < lv.nodes.length; i++) {
    if (lv.adj[i].length !== 1) continue;
    const nb = lv.adj[i][0];
    if (!placed.has(nb)) return { leaf: i, forced: nb };
  }
  return null;
}
export function hintMatching(lv: Pick<Level, 'edges'>): number[] {
  const used = new Set<number>(); const m: number[] = [];
  for (let i = 0; i < lv.edges.length; i++) {
    const [u, v] = lv.edges[i];
    if (!used.has(u) && !used.has(v)) { used.add(u); used.add(v); m.push(i); }
  }
  return m;
}
/** Stargazer's Count: a largest set of still-dark lines (no lit star at either end) that share no star, as indices
    into `lv.edges`. Each needs a different star still to light, so its size is a lower bound on the stars left.
    (`hintMatching` above stays greedy: generation's `matchingBound` and CATASTROPHE INC.'s ESTIMATE use it.) */
export function hintDarkMatching(lv: Pick<Level, 'nodes' | 'edges'>, placed: Iterable<number>): number[] {
  const lit = coveredEdges(lv, placed);
  const dark = lv.edges.map((_, i) => i).filter(i => !lit.has(i));
  return maxMatching(lv.nodes.length, dark.map(i => lv.edges[i])).map(j => dark[j]);
}
export function hintReveal(lv: Level, placed: Set<number>): number | null {
  return lv.sol.find(v => !placed.has(v)) ?? null;
}
