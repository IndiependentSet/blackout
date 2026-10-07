/** What the consultants can point at on a level (SURVEY / ESTIMATE / INSIDER). Pure. */
import type { Level } from './types';

export function hintLeaf(lv: Level, placed: Set<number>): { leaf: number; forced: number } | null {
  for (let i = 0; i < lv.nodes.length; i++) {
    if (lv.adj[i].length !== 1) continue;
    const nb = lv.adj[i][0];
    if (!placed.has(nb)) return { leaf: i, forced: nb };
  }
  return null;
}
export function hintMatching(lv: Level): number[] {
  const used = new Set<number>(); const m: number[] = [];
  for (let i = 0; i < lv.edges.length; i++) {
    const [u, v] = lv.edges[i];
    if (!used.has(u) && !used.has(v)) { used.add(u); used.add(v); m.push(i); }
  }
  return m;
}
export function hintReveal(lv: Level, placed: Set<number>): number | null {
  return lv.sol.find(v => !placed.has(v)) ?? null;
}
