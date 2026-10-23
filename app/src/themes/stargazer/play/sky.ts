import { coveredEdges } from '../../../domain/cover';
import { rngFromSeed } from '../../../domain/rng';
import type { Hint, HintTier, Level, SiteResult } from '../../../domain/types';
import { skyLayout } from './warp';

/** World units per line on the sky board (the median line is this long). */
export const SKY_STEP = 100;
const MARGIN = 48;
/** a star's tap target, world units, at most: a warped sky shrinks it to half its closest pair */
const HIT = 45;

export interface SkyStar {
  i: number; x: number; y: number; lit: boolean;
  /** how big this star is drawn, around 1 */
  size: number;
}
export interface SkyLine { i: number; x1: number; y1: number; x2: number; y2: number; lit: boolean }
export interface Sky {
  viewBox: string;
  /** stars grow with the board so a big sky shrinks less on screen; 1 for a small one */
  scale: number;
  stars: SkyStar[];
  lines: SkyLine[];
  /** lines with no lit star at either end */
  dark: number;
  /** tap target radius: never so big that two stars' targets overlap */
  hit: number;
}

/** The level drawn as a patch of sky: stars where `skyLayout` puts them (off the lattice), lines lit once a
    star at either end is. */
export function skyOf(lv: Pick<Level, 'nodes' | 'edges'>, placed: readonly number[]): Sky {
  const lit = new Set(placed);
  const covered = coveredEdges(lv, placed);
  const { at: pos, size } = skyLayout(lv);
  const xs = pos.map(p => p.c), ys = pos.map(p => p.r);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const w = (Math.max(...xs) - x0) * SKY_STEP, h = (Math.max(...ys) - y0) * SKY_STEP;
  const at = (i: number) => ({ x: (pos[i].c - x0) * SKY_STEP, y: (pos[i].r - y0) * SKY_STEP });
  const scale = Math.min(2, Math.max(1, Math.max(w, h) / 400));
  const pad = MARGIN * scale;
  return {
    viewBox: `${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`,
    scale,
    stars: lv.nodes.map((_, i) => ({ i, ...at(i), lit: lit.has(i), size: size[i] })),
    lines: lv.edges.map(([u, v], i) => {
      const a = at(u), b = at(v);
      return { i, x1: a.x, y1: a.y, x2: b.x, y2: b.y, lit: covered.has(i) };
    }),
    dark: lv.edges.length - covered.size,
    hit: Math.min(HIT, closest(pos) * SKY_STEP / 2),
  };
}

function closest(pos: readonly { c: number; r: number }[]): number {
  let d = Infinity;
  for (let i = 0; i < pos.length; i++)
    for (let j = i + 1; j < pos.length; j++) d = Math.min(d, Math.hypot(pos[i].c - pos[j].c, pos[i].r - pos[j].r));
  return d;
}

const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's');

/** "3 lines dark" under the big count, or "whole figure shows". */
export function darkLabel(lv: Level | null, placed: number[]): string {
  if (!lv) return 'scanning the sky…';
  const dark = lv.edges.length - coveredEdges(lv, placed).size;
  return dark ? plural(dark, 'line') + ' dark' : 'whole figure shows';
}

/* ---- the telescope: Stargazer's three hints ---- */

export type Scope = 'spot' | 'sweep' | 'count';
export const SCOPES: { scope: Scope; key: string; short: string; long: string }[] = [
  { scope: 'spot', key: '1', short: 'Spot', long: 'Spot a par star' },
  { scope: 'sweep', key: '2', short: 'Sweep', long: 'Sweep dark lines' },
  { scope: 'count', key: '3', short: 'Count', long: 'Count the minimum' },
];
/** Spot and Count are the game's own INSIDER and ESTIMATE hints (so a clear scores the same); Sweep only
    highlights the dark lines already on the board, so it asks the reducer for nothing. */
export const SCOPE_TIER: Record<Scope, HintTier | null> = { spot: 3, sweep: null, count: 2 };
/** The board keys 1/2/3 pick the telescope in the order its buttons show. */
export const scopeForKey = (tier: HintTier): Scope => SCOPES[tier - 1].scope;

/** Which telescope view is showing. `chosen` is what was picked for the board as it stands now (null once a
    star changes); Spot and Count also need the reducer to have answered with their hint. */
export function activeScope(chosen: Scope | null, hint: Hint | null): Scope | null {
  if (chosen === 'spot') return hint?.kind === 'reveal' ? 'spot' : null;
  if (chosen === 'count') return hint?.kind === 'proof' ? 'count' : null;
  return chosen;
}

/** The message panel: what the telescope found, a notice, or a nudge for where the sky stands. */
export function skyMessage(lv: Level | null, placed: number[], hint: Hint | null, scope: Scope | null, notice: string): string {
  if (!lv) return 'Scanning the sky…';
  if (notice) return notice;
  const dark = lv.edges.length - coveredEdges(lv, placed).size;
  if (scope === 'count' && hint?.kind === 'proof') {
    return `The telescope counts: this sky can't be shown with fewer than ${plural(hint.edges.length, 'star')}.`;
  }
  if (scope === 'spot' && hint?.kind === 'reveal') return 'The ringed star is part of a par answer.';
  if (scope === 'sweep' && dark) return `${plural(dark, 'dark line')} highlighted. Each needs a lit star at one end.`;
  if (!placed.length) return 'Tap a star to light it. Every line it touches will glow.';
  if (dark) return `${plural(dark, 'line')} still dark. Light a star at either end.`;
  if (placed.length > lv.k) return `The whole figure shows. Par is ${lv.k}. Can you dim one and still show it all?`;
  return 'Par. The figure is complete and the sky is ready to chart.';
}

/* ---- tonight's seven skies ---- */

export type SkyState = 'par' | 'over' | 'cur' | 'next';
export interface SkyEntry { n: number; state: SkyState; note: string }
/** One entry per sky: charted at par, charted over par (+N), the open one, or still to come. */
export const skyEntries = (results: (SiteResult | null)[], idx: number): SkyEntry[] =>
  results.map((r, i) => {
    if (i === idx) return { n: i + 1, state: 'cur', note: 'now' };
    if (!r) return { n: i + 1, state: 'next', note: '' };
    return r.status === 'perfect' ? { n: i + 1, state: 'par', note: 'par' } : { n: i + 1, state: 'over', note: '+' + (r.used - r.par) };
  });

/* ---- the twinkling background ---- */

export interface Twinkle { x: number; y: number; r: number; dur: number; delay: number }
/** A fixed scatter of background stars (seeded, so it never shifts between renders). */
export function starfield(seed: number, count: number): Twinkle[] {
  const r = rngFromSeed(seed);
  return Array.from({ length: count }, () => ({
    x: r() * 100, y: r() * 100, r: 1 + r() * 1.8, dur: 2 + r() * 4, delay: r() * 4,
  }));
}
