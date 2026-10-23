/* Where a sky's stars are drawn. The generator puts every star on a whole
   lattice cell and joins neighbours, so drawn as-is every line is level,
   upright or at 45°, and one of two lengths. This takes the figure off the
   grid: a seeded tilt, stretch and slant for the whole sky, a slow drift
   that bends long rows, a nudge for each star, and longer or shorter tails.

   Only the drawing changes: the puzzle, its par and its answer are the
   level's own. The warp is seeded by the figure itself (never the day or the
   site), so a sky, its preview and its atlas page always look the same, for
   every player. A star whose warp would make two lines cross, put a star on
   a line it isn't part of, crowd two stars or fold two lines onto each other
   is calmed, round by round, until the sky reads; in the end it goes back on
   its cell. Pure. */
import { distPtSeg } from '../../../domain/geometry';
import { rngFromSeed } from '../../../domain/rng';
import type { Cell, Edge, Rng, SkyFigure } from '../../../domain/types';

/** Where each star is drawn, in lines (the median line is 1 long), and how big. */
export interface SkyLayout {
  /** star positions, y down; not lattice cells any more, just numbers */
  at: Cell[];
  /** each star's size, around 1: some stars are brighter than others */
  size: number[];
}

/** whole-sky tilt, either way, in radians (about 26°) */
const TILT = 0.45;
/** one axis stretched by up to this much, the other shrunk by the same */
const STRETCH = 1.2;
/** how far the sky may slant, as a share of its height */
const SLANT = 0.15;
/** the slow drift that bends long rows: cells moved at most, and its wavelength in cells */
const DRIFT = 0.35;
const WAVE = [3, 6] as const;
/** how far a star may be nudged off its cell */
const NUDGE = 0.3;
/** a tail (a star with one line) is drawn this much shorter or longer, in cells */
const TAIL = [-0.2, 0.7] as const;
/** star sizes run between these */
const SIZE = [0.8, 1.2] as const;
/** rounds of calming the stars that break a rule before the whole sky is drawn on its cells */
const ROUNDS = 10;

/** What a drawn sky must keep, in median lines (or the lattice's own value, when it had less). */
const MIN_GAP = 0.7;      // between two stars (keeps their tap targets apart)
const MIN_CLEAR = 0.3;    // between a star and a line that doesn't touch it
const MIN_ANGLE = 0.44;   // between two lines at a star, radians (about 25°)

/** The figure's own seed: its stars and lines, nothing else. */
export function skySeed(fig: SkyFigure): number {
  let h = 0x9e3779b9;
  const mix = (v: number) => { h = Math.imul(h ^ (v & 0xffff), 0x01000193) >>> 0; };
  mix(fig.nodes.length); mix(fig.edges.length);
  for (const n of fig.nodes) { mix(n.c + 512); mix(n.r + 512); }
  for (const [a, b] of fig.edges) { mix(a); mix(b); }
  return h >>> 0;
}

const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + rng() * (hi - lo);

/** Every random number a sky's warp uses, drawn once so each calmer try is the same sky, only quieter. */
function draw(fig: SkyFigure, rng: Rng) {
  const tilt = (rng() * 2 - 1) * TILT;
  const stretch = STRETCH ** (rng() * 2 - 1);
  const slant = (rng() * 2 - 1) * SLANT;
  const waves = [0, 1].map(() => {
    const k = rng() * Math.PI, d = rng() * 2 * Math.PI;
    return { kc: Math.cos(k), kr: Math.sin(k), len: between(rng, WAVE), phase: rng() * 2 * Math.PI, dc: Math.cos(d), dr: Math.sin(d) };
  });
  const nudge = fig.nodes.map(() => {
    const a = rng() * 2 * Math.PI, m = Math.sqrt(rng()) * NUDGE;
    return { c: Math.cos(a) * m, r: Math.sin(a) * m };
  });
  const tail = fig.nodes.map(() => between(rng, TAIL));
  const size = fig.nodes.map(() => between(rng, SIZE));
  return { tilt, stretch, slant, waves, nudge, tail, size };
}
type Draw = ReturnType<typeof draw>;

function neighbours(fig: SkyFigure): number[][] {
  const adj: number[][] = fig.nodes.map(() => []);
  for (const [a, b] of fig.edges) { adj[a].push(b); adj[b].push(a); }
  return adj;
}

/** The sky with each star's share of its own warp (`calm`), then tilted, stretched and slanted. */
function place(fig: SkyFigure, adj: number[][], d: Draw, calm: readonly number[]): Cell[] {
  const local = fig.nodes.map((n, i) => {
    const k = calm[i];
    let c = n.c + d.nudge[i].c * k, r = n.r + d.nudge[i].r * k;
    for (const w of d.waves) {
      const s = Math.sin((2 * Math.PI * (n.c * w.kc + n.r * w.kr)) / w.len + w.phase) * (DRIFT / 2) * k;
      c += w.dc * s; r += w.dr * s;
    }
    if (adj[i].length === 1) {
      const q = fig.nodes[adj[i][0]];
      const len = Math.hypot(n.c - q.c, n.r - q.r) || 1;
      c += ((n.c - q.c) / len) * d.tail[i] * k;
      r += ((n.r - q.r) / len) * d.tail[i] * k;
    }
    return { c, r };
  });
  const cos = Math.cos(d.tilt), sin = Math.sin(d.tilt);
  return local.map(({ c, r }) => {
    const x = (c + d.slant * r) * d.stretch, y = r / d.stretch;
    return { c: x * cos - y * sin, r: x * sin + y * cos };
  });
}

/** The same sky scaled so its median line is 1 long. */
function normalise(fig: SkyFigure, at: Cell[]): Cell[] {
  const lens = fig.edges.map(([a, b]) => Math.hypot(at[a].c - at[b].c, at[a].r - at[b].r)).sort((x, y) => x - y);
  const med = lens.length ? lens[lens.length >> 1] : 1;
  return med > 0 ? at.map(p => ({ c: p.c / med, r: p.r / med })) : at;
}

const EPS = 1e-9;
const side = (a: Cell, b: Cell, c: Cell) => (b.c - a.c) * (c.r - a.r) - (b.r - a.r) * (c.c - a.c);
/** Do ab and cd cross, each clearly on both sides of the other? (Two lines in one row never do:
    a tilt's rounding must not make them.) */
function crosses(a: Cell, b: Cell, c: Cell, d: Cell) {
  const d1 = side(a, b, c), d2 = side(a, b, d), d3 = side(c, d, a), d4 = side(c, d, b);
  return d1 * d2 < -EPS && d3 * d4 < -EPS;
}

function angleAt(at: Cell[], v: number, u: number, w: number) {
  const t = Math.abs(Math.atan2(at[u].r - at[v].r, at[u].c - at[v].c) - Math.atan2(at[w].r - at[v].r, at[w].c - at[v].c)) % (2 * Math.PI);
  return Math.min(t, 2 * Math.PI - t);
}

/** What a sky must keep: the rules, or the lattice's own value where it had less. */
interface Floor { gap: number; clear: number; angle: number; crossed: Set<number> }

/** The lattice's closest stars, the closest a star comes to a line it isn't on,
    the narrowest angle at a star, and which pairs of lines cross. */
function floorOf(fig: SkyFigure, adj: number[][], at: Cell[]): Floor {
  let gap = Infinity, clear = Infinity, angle = Infinity;
  for (let i = 0; i < at.length; i++)
    for (let j = i + 1; j < at.length; j++) gap = Math.min(gap, Math.hypot(at[i].c - at[j].c, at[i].r - at[j].r));
  for (const [a, b] of fig.edges)
    for (let i = 0; i < at.length; i++) if (i !== a && i !== b) clear = Math.min(clear, distPtSeg(at[i], at[a], at[b]));
  adj.forEach((ns, v) => {
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) angle = Math.min(angle, angleAt(at, v, ns[i], ns[j]));
  });
  const crossed = new Set<number>(), E = fig.edges;
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
    const [a, b] = E[i], [u, v] = E[j];
    if (a !== u && a !== v && b !== u && b !== v && crosses(at[a], at[b], at[u], at[v])) crossed.add(i * E.length + j);
  }
  return { gap: Math.min(MIN_GAP, gap), clear: Math.min(MIN_CLEAR, clear), angle: Math.min(MIN_ANGLE, angle), crossed };
}

/** The stars a drawn sky lets down: too close to another star, on a line that isn't theirs, at either
    end of two lines folded together or of two lines that newly cross. None means it reads. */
function offenders(fig: SkyFigure, adj: number[][], at: Cell[], floor: Floor): Set<number> {
  const bad = new Set<number>();
  const flag = (...ids: number[]) => { for (const i of ids) bad.add(i); };
  for (let i = 0; i < at.length; i++)
    for (let j = i + 1; j < at.length; j++) if (Math.hypot(at[i].c - at[j].c, at[i].r - at[j].r) < floor.gap) flag(i, j);
  for (const [a, b] of fig.edges)
    for (let i = 0; i < at.length; i++) if (i !== a && i !== b && distPtSeg(at[i], at[a], at[b]) < floor.clear) flag(i, a, b);
  adj.forEach((ns, v) => {
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++)
      if (angleAt(at, v, ns[i], ns[j]) < floor.angle) flag(v, ns[i], ns[j]);
  });
  const E = fig.edges;
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
    const [a, b] = E[i], [u, v] = E[j];
    if (a === u || a === v || b === u || b === v || floor.crossed.has(i * E.length + j)) continue;
    if (crosses(at[a], at[b], at[u], at[v])) flag(a, b, u, v);
  }
  return bad;
}

/** Where a figure's stars are drawn. The same figure always gets the same sky. Each round, only the
    stars that broke a rule are calmed (their nudge, drift and tail halved), so one tight corner
    doesn't flatten the whole sky; the last rounds put them back on their cells. */
export function warpSky(fig: SkyFigure): SkyLayout {
  const adj = neighbours(fig);
  const d = draw(fig, rngFromSeed(skySeed(fig)));
  const lattice = normalise(fig, fig.nodes.map(n => ({ c: n.c, r: n.r })));
  const floor = floorOf(fig, adj, lattice);
  const calm = fig.nodes.map(() => 1);
  for (let round = 0; round < ROUNDS; round++) {
    const at = normalise(fig, place(fig, adj, d, calm));
    const bad = offenders(fig, adj, at, floor);
    if (!bad.size) return { at, size: d.size };
    for (const i of bad) calm[i] = round < ROUNDS - 3 ? calm[i] / 2 : 0;
  }
  const still = normalise(fig, place(fig, adj, d, calm.map(() => 0)));
  return { at: offenders(fig, adj, still, floor).size ? lattice : still, size: d.size };
}

/* A level's layout is asked for on every render (every tap), so it is kept per stars array. */
const cache = new WeakMap<readonly Cell[], { edges: readonly Edge[]; layout: SkyLayout }>();

/** warpSky, worked out once per figure. */
export function skyLayout(fig: SkyFigure): SkyLayout {
  const hit = cache.get(fig.nodes);
  if (hit && hit.edges === fig.edges) return hit.layout;
  const layout = warpSky(fig);
  cache.set(fig.nodes, { edges: fig.edges, layout });
  return layout;
}
