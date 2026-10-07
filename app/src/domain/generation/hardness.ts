/* Two cheap measures of how much thinking a level asks for, used as filters
   by the generator and shown by the playground. Pure. */
import { hintMatching } from '../hints';
import type { Level } from '../types';

type Shape = Pick<Level, 'nodes' | 'edges' | 'adj'>;

/** The cover you get by always taking the junction with the most uncovered
    paths (lowest index on ties). When this already reaches par, the level can
    be solved without looking ahead. */
export function greedyCover(lv: Shape): number {
  const open = lv.adj.map(a => a.length);
  const taken = new Uint8Array(lv.nodes.length);
  let left = lv.edges.length, size = 0;
  while (left > 0) {
    let best = -1;
    for (let v = 0; v < open.length; v++) if (!taken[v] && (best < 0 || open[v] > open[best])) best = v;
    taken[best] = 1; size++;
    left -= open[best];
    for (const u of lv.adj[best]) if (!taken[u]) open[u]--;
    open[best] = 0;
  }
  return size;
}

/** Paths that share no junction, picked in order: each needs its own cat, so
    par is at least this. It is the number the ESTIMATE consultant gives. */
export function matchingBound(lv: Pick<Level, 'edges'>): number {
  return hintMatching(lv).length;
}
