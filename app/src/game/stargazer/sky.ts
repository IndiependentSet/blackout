import { coveredEdges, isCleared } from '../../domain/cover';
import type { Level, SiteResult } from '../../domain/types';

/** World units per lattice step on the sky board. */
export const SKY_STEP = 100;
const MARGIN = 60;

export interface SkyStar { i: number; x: number; y: number; lit: boolean }
export interface SkyLine { i: number; x1: number; y1: number; x2: number; y2: number; lit: boolean }
export interface Sky {
  viewBox: string;
  /** stars grow with the board so a big sky shrinks less on screen; 1 for a small one */
  scale: number;
  stars: SkyStar[];
  lines: SkyLine[];
}

/** The level drawn as a patch of sky: stars on the lattice, lines lit once a star at either end is. */
export function skyOf(lv: Level, placed: number[]): Sky {
  const lit = new Set(placed);
  const covered = coveredEdges(lv, placed);
  const cs = lv.nodes.map(n => n.c);
  const rs = lv.nodes.map(n => n.r);
  const c0 = Math.min(...cs), r0 = Math.min(...rs);
  const w = (Math.max(...cs) - c0) * SKY_STEP, h = (Math.max(...rs) - r0) * SKY_STEP;
  const at = (i: number) => ({ x: (lv.nodes[i].c - c0) * SKY_STEP, y: (lv.nodes[i].r - r0) * SKY_STEP });
  const scale = Math.min(2, Math.max(1, Math.max(w, h) / 400));
  const pad = MARGIN * scale;
  return {
    viewBox: `${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`,
    scale,
    stars: lv.nodes.map((_, i) => ({ i, ...at(i), lit: lit.has(i) })),
    lines: lv.edges.map(([u, v], i) => {
      const a = at(u), b = at(v);
      return { i, x1: a.x, y1: a.y, x2: b.x, y2: b.y, lit: covered.has(i) };
    }),
  };
}

/** The line under the big count: how many lines are still dark, or how the sky came out. */
export function skyStatus(lv: Level | null, placed: number[]): string {
  if (!lv) return 'Scanning the sky…';
  const dark = lv.edges.length - coveredEdges(lv, placed).size;
  if (!isCleared(lv, placed)) return dark === 1 ? '1 line still dark' : dark + ' lines still dark';
  return placed.length <= lv.k ? 'Par. Name your find.' : 'All lit, but par is ' + lv.k;
}

export type SkyPip = 'perfect' | 'over' | 'current' | 'todo';
/** The seven-night strip under the board. */
export const skyPips = (results: (SiteResult | null)[], idx: number): SkyPip[] =>
  results.map((r, i) => (i === idx ? 'current' : r ? (r.status === 'perfect' ? 'perfect' : 'over') : 'todo'));
