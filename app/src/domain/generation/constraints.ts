/** Extra conditions a level must meet, as data rather than a closure, so they
    can be stored, edited and sent to a worker. Pure. */
import type { Level, LevelFilter } from '../types';
import { MAX_LEVEL_NODES } from './options';

export interface LevelConstraints {
  /** at least this many junctions */
  minNodes?: number;
  /** at most this many junctions */
  maxNodes?: number;
  /** par no lower than this */
  minK?: number;
  /** par no higher than this */
  maxK?: number;
  /** some junction has exactly this many paths */
  hasDegree?: number;
}

/** The filter the generator checks each candidate against; null when there is nothing to check. */
export function constraintFilter(c: LevelConstraints | undefined): LevelFilter | null {
  if (!c) return null;
  const { minNodes, maxNodes, minK, maxK, hasDegree } = c;
  if (minNodes === undefined && maxNodes === undefined && minK === undefined && maxK === undefined && hasDegree === undefined) return null;
  return (lv: Level) =>
    (minNodes === undefined || lv.nodes.length >= minNodes)
    && (maxNodes === undefined || lv.nodes.length <= maxNodes)
    && (hasDegree === undefined || lv.adj.some(a => a.length === hasDegree))
    && (minK === undefined || lv.k >= minK)
    && (maxK === undefined || lv.k <= maxK);
}

/** What the game itself asks of every level, whatever the schedule or curve says: no more than MAX_LEVEL_NODES junctions. */
export function gameConstraints(c?: LevelConstraints): LevelConstraints {
  return { ...c, maxNodes: Math.min(c?.maxNodes ?? MAX_LEVEL_NODES, MAX_LEVEL_NODES) };
}
