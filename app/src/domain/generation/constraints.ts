/** Extra conditions a level must meet, as data rather than a closure, so they
    can be stored, edited and sent to a worker. Pure. */
import type { Level, LevelFilter } from '../types';

export interface LevelConstraints {
  /** at least this many junctions */
  minNodes?: number;
  /** par no higher than this */
  maxK?: number;
  /** some junction has exactly this many paths */
  hasDegree?: number;
}

/** The filter the generator checks each candidate against; null when there is nothing to check. */
export function constraintFilter(c: LevelConstraints | undefined): LevelFilter | null {
  if (!c) return null;
  const { minNodes, maxK, hasDegree } = c;
  if (minNodes === undefined && maxK === undefined && hasDegree === undefined) return null;
  return (lv: Level) =>
    (minNodes === undefined || lv.nodes.length >= minNodes)
    && (hasDegree === undefined || lv.adj.some(a => a.length === hasDegree))
    && (maxK === undefined || lv.k <= maxK);
}
