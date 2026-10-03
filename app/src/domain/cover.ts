import type { Level } from './types';

/** Indices of the edges covered by at least one placed cat. */
export function coveredEdges(lv: Pick<Level, 'edges'>, placed: Iterable<number>): Set<number> {
  const p = new Set(placed);
  const out = new Set<number>();
  lv.edges.forEach(([u, v], i) => { if (p.has(u) || p.has(v)) out.add(i); });
  return out;
}

export function isCleared(lv: Pick<Level, 'edges'>, placed: Iterable<number>): boolean {
  return coveredEdges(lv, placed).size === lv.edges.length;
}
