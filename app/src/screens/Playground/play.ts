/* Play-testing a generated level by hand, in either view. Pure. */
import { coveredEdges } from '../../domain/cover';
import type { Level } from '../../domain/types';

/** Hire a cat on a free node, or recall the one already there. */
export function togglePlaced(placed: readonly number[], node: number): number[] {
  return placed.includes(node) ? placed.filter(n => n !== node) : [...placed, node];
}

export interface PlayStatus {
  used: number;
  par: number;
  /** paths no cat touches yet */
  open: number;
  cleared: boolean;
  /** cats beyond par; only meaningful once cleared */
  overPar: number;
}

export function playStatus(lv: Pick<Level, 'edges' | 'k'>, placed: readonly number[]): PlayStatus {
  const open = lv.edges.length - coveredEdges(lv, placed).size;
  return { used: placed.length, par: lv.k, open, cleared: open === 0, overPar: placed.length - lv.k };
}
