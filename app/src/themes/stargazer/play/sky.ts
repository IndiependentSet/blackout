import { coveredEdges } from '../../../domain/cover';
import { rngFromSeed } from '../../../domain/rng';
import type { Hint, HintTier, Level, SiteResult } from '../../../domain/types';
import { skyLayout } from './warp';

/** World units per line on the sky board (the median line is this long). */
export const SKY_STEP = 100;
/** room around the stars for a lit star's glow (previews and the atlas), and the board's tighter one: the board's
    svg lets the glow spill past its edge, so it only keeps a lit star's own points inside */
const MARGIN = 48;
const MARGIN_TIGHT = 22;
/** a star's tap target, world units, at most: a warped sky shrinks it to half its closest pair */
const HIT = 45;
/** the board turns a sky a quarter turn only when that draws it at least this much bigger */
const TURN_GAIN = 1.15;
/** on screen, a dim star's core is never drawn smaller than this, in px (a line keeps in proportion) */
const MIN_CORE_PX = 4.5;
/** a dim star's core and halo, world units at scale 1 and size 1 (SkyBoard draws them), and the largest star size */
export const CORE_R = 6;
export const HALO_R = 13;
const MAX_SIZE = 1.2;
/** from this many stars a sky is big: the phone column around it tightens */
export const BIG_SKY = 20;

/** The board's size on screen, px. */
export interface Box { w: number; h: number }
/** How the board shows a sky: in a box of this size (it may turn and draw its stars bigger to fit), with a tight margin. */
export interface SkyView { box?: Box | null; tight?: boolean }

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
  /** drawn a quarter turn round, to fit the board */
  turned: boolean;
}

interface Points { at: { x: number; y: number }[]; w: number; h: number; turned: boolean; base: number; closest: number }

/** the stars' scale before any floor: a big sky's stars grow so it shrinks less on screen */
const baseScale = (w: number, h: number) => Math.min(2, Math.max(1, Math.max(w, h) / 400));
/** the viewBox's size for a sky w × h drawn at scale s */
const frame = (w: number, h: number, s: number, tight?: boolean) => {
  const pad = (tight ? MARGIN_TIGHT : MARGIN) * s;
  return { pad, w: w + 2 * pad, h: h + 2 * pad };
};
/** px per world unit when a frame is fitted ("meet") into a box */
const fitOf = (f: { w: number; h: number }, box: Box) => Math.min(box.w / f.w, box.h / f.h);

/** Where each star is drawn on the board, world units from the sky's top left corner: where `skyLayout` puts it, turned
    a quarter turn (clockwise) when the board is a box the turned sky fills at least `TURN_GAIN` better. Drawing only:
    every player sees the same sky, turned to fit their screen. The arrow keys move by these too. */
export function skyPoints(lv: Pick<Level, 'nodes' | 'edges'>, view: SkyView = {}): Points {
  const { at: pos } = skyLayout(lv);
  const xs = pos.map(p => p.c), ys = pos.map(p => p.r);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const w = (Math.max(...xs) - x0) * SKY_STEP, h = (Math.max(...ys) - y0) * SKY_STEP;
  const at = pos.map(p => ({ x: (p.c - x0) * SKY_STEP, y: (p.r - y0) * SKY_STEP }));
  const base = baseScale(w, h);
  const closest = closestPair(pos) * SKY_STEP;
  const box = view.box;
  if (box && box.w > 0 && box.h > 0) {
    const asIs = fitOf(frame(w, h, base, view.tight), box), round = fitOf(frame(h, w, base, view.tight), box);
    if (round >= asIs * TURN_GAIN) {
      return { at: at.map(p => ({ x: h - p.y, y: p.x })), w: h, h: w, turned: true, base, closest };
    }
  }
  return { at, w, h, turned: false, base, closest };
}

/** The stars' scale on the board: never so small that a dim star's core is under `MIN_CORE_PX` on screen, nor so big
    that two stars' halos meet. Without a box, the base scale (previews and the atlas). */
function boardScale(p: Points, view: SkyView): number {
  const box = view.box;
  if (!box || box.w <= 0 || box.h <= 0) return p.base;
  const cap = p.closest / 2 / (HALO_R * MAX_SIZE);
  let s = p.base;
  /* the margin grows with the scale, so the fit moves a little: twice settles it */
  for (let k = 0; k < 2; k++) {
    const pxPerUnit = fitOf(frame(p.w, p.h, s, view.tight), box);
    s = Math.max(p.base, Math.min(cap, MIN_CORE_PX / (CORE_R * pxPerUnit)));
  }
  return s;
}

/** The level drawn as a patch of sky: stars where `skyPoints` puts them, lines lit once a star at either end is.
    `view` is the board's: without it (previews, the atlas) the sky is drawn as it always was. */
export function skyOf(lv: Pick<Level, 'nodes' | 'edges'>, placed: readonly number[], view: SkyView = {}): Sky {
  const lit = new Set(placed);
  const covered = coveredEdges(lv, placed);
  const { size } = skyLayout(lv);
  const p = skyPoints(lv, view);
  const scale = boardScale(p, view);
  const f = frame(p.w, p.h, scale, view.tight);
  return {
    viewBox: `${-f.pad} ${-f.pad} ${f.w} ${f.h}`,
    scale,
    stars: lv.nodes.map((_, i) => ({ i, ...p.at[i], lit: lit.has(i), size: size[i] })),
    lines: lv.edges.map(([u, v], i) => {
      const a = p.at[u], b = p.at[v];
      return { i, x1: a.x, y1: a.y, x2: b.x, y2: b.y, lit: covered.has(i) };
    }),
    dark: lv.edges.length - covered.size,
    hit: Math.min(HIT, p.closest / 2),
    turned: p.turned,
  };
}

function closestPair(pos: readonly { c: number; r: number }[]): number {
  let d = Infinity;
  for (let i = 0; i < pos.length; i++)
    for (let j = i + 1; j < pos.length; j++) d = Math.min(d, Math.hypot(pos[i].c - pos[j].c, pos[i].r - pos[j].r));
  return d;
}

const plural = (n: number, word: string) => n + ' ' + word + (n === 1 ? '' : 's');

/** How much of the figure glows, 0..1: the share of its lines lit. What the stars' notes climb by. */
export function skyProgress(lv: Level | null, placed: number[]): number {
  if (!lv || !lv.edges.length) return 0;
  return coveredEdges(lv, placed).size / lv.edges.length;
}

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
  { scope: 'count', key: '3', short: 'Count', long: "Count what's left" },
];
/** Spot and Count are the game's own INSIDER and ESTIMATE hint tiers (so a clear scores the same); Sweep only
    highlights the dark lines already on the board, so it asks the reducer for nothing. Count draws its own proof
    (`hintDarkMatching` over the lines still dark), not the reducer's: it recounts as stars change. */
export const SCOPE_TIER: Record<Scope, HintTier | null> = { spot: 3, sweep: null, count: 2 };
/** The board keys 1/2/3 pick the telescope in the order its buttons show. */
export const scopeForKey = (tier: HintTier): Scope => SCOPES[tier - 1].scope;

/** Which telescope view is showing. `chosen` is what was picked and still stands (Spot and Sweep are put away when a
    star changes, Count stays on for the sky); Spot also needs the reducer to have answered with its star. */
export function activeScope(chosen: Scope | null, hint: Hint | null): Scope | null {
  if (chosen === 'spot') return hint?.kind === 'reveal' ? 'spot' : null;
  return chosen;
}

/** Count's message: N marked dark lines share no star, so at least N more stars must be lit. A lower bound only: par
    may need more, unless the lit stars plus N already pass it. */
export function countMessage(k: number, lit: number, n: number): string {
  const head = n === 1 ? '1 marked line is still dark' : `${n} marked lines share no star`;
  if (lit + n > k) return `${head}: at least ${n} more, so par (${k}) is out of reach with these stars lit. Dim one.`;
  if (!lit) return `${head}: this sky needs at least ${plural(n, 'star')}. Par may need more.`;
  if (lit + n === k) return `${head}: at least ${plural(n, 'more star')} — all that par has left.`;
  return `${head}: you need at least ${plural(n, 'more star')}. Par may need more.`;
}

/** The message panel: what the telescope found, a notice, or a nudge for where the sky stands. `turnHint`: a big sky on a
    phone held upright, where turning it sideways gives the board more room. `counted`: Count's marked lines. */
export function skyMessage(lv: Level | null, placed: number[], hint: Hint | null, scope: Scope | null, notice: string,
  { turnHint = false, counted = null }: { turnHint?: boolean; counted?: number[] | null } = {}): string {
  if (!lv) return 'Scanning the sky…';
  if (notice) return notice;
  const dark = lv.edges.length - coveredEdges(lv, placed).size;
  if (scope === 'count' && counted && dark) return countMessage(lv.k, placed.length, counted.length);
  if (scope === 'spot' && hint?.kind === 'reveal') return 'The ringed star is part of a par answer.';
  if (scope === 'sweep' && dark) return `${plural(dark, 'dark line')} highlighted. Each needs a lit star at one end.`;
  if (!placed.length) return turnHint ? 'Turn your phone sideways for a bigger sky.' : 'Tap a star to light it. Every line it touches will glow.';
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
