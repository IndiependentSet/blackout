import { describe, expect, it } from 'vitest';
import { distPtSeg } from '../../../domain/geometry';
import { generate } from '../../../domain/generation';
import type { Cell, Level, SkyFigure } from '../../../domain/types';
import { skyLayout, skySeed, warpSky } from './warp';

/* small, fast levels of every difficulty and size the game plays (clock off: the same on any machine) */
const LEVELS: Level[] = [5, 9, 14, 20, 26, 33, 40].flatMap((size, i) => [1, 2, 3].map(diff =>
  generate({ seed: 17 + 31 * i + diff, size, diff, options: { clock: false, attempts: 40 } }).level))
  .filter((lv): lv is Level => lv !== null);
const levels = () => LEVELS;

const len = (at: Cell[], [a, b]: [number, number]) => Math.hypot(at[a].c - at[b].c, at[a].r - at[b].r);
const dir = (at: Cell[], [a, b]: [number, number]) => Math.atan2(at[b].r - at[a].r, at[b].c - at[a].c);
/** how far a line is from level, upright or 45°, in radians */
const offGrid = (t: number) => {
  const q = Math.PI / 4, m = ((t % q) + q) % q;
  return Math.min(m, q - m);
};

/** a proper crossing, both lines clearly on both sides of each other (rounding never counts) */
const side = (a: Cell, b: Cell, c: Cell) => (b.c - a.c) * (c.r - a.r) - (b.r - a.r) * (c.c - a.c);
const segCross = (a: Cell, b: Cell, c: Cell, d: Cell) => side(a, b, c) * side(a, b, d) < -1e-9 && side(c, d, a) * side(c, d, b) < -1e-9;

function crossings(fig: SkyFigure, at: Cell[]) {
  let n = 0;
  fig.edges.forEach(([a, b], i) => fig.edges.slice(i + 1).forEach(([u, v]) => {
    if (a !== u && a !== v && b !== u && b !== v && segCross(at[a], at[b], at[u], at[v])) n++;
  }));
  return n;
}

describe('warpSky', () => {
  it('gives the same figure the same sky, and a copy of it too (the atlas keeps a copy)', () => {
    const lv = levels()[3];
    const copy: SkyFigure = { nodes: lv.nodes.map(n => ({ ...n })), edges: lv.edges.map(([a, b]) => [a, b]) };
    expect(skySeed(copy)).toBe(skySeed(lv));
    expect(warpSky(copy)).toEqual(warpSky(lv));
  });

  it('keeps every sky readable: no new crossings, stars apart and off other lines', () => {
    for (const lv of levels()) {
      const { at } = warpSky(lv);
      expect(crossings(lv, at)).toBe(crossings(lv, lv.nodes));
      at.forEach((p, i) => at.forEach((q, j) => { if (i < j) expect(Math.hypot(p.c - q.c, p.r - q.r)).toBeGreaterThanOrEqual(0.7); }));
      for (const [a, b] of lv.edges)
        at.forEach((p, i) => { if (i !== a && i !== b) expect(distPtSeg(p, at[a], at[b])).toBeGreaterThanOrEqual(0.3); });
    }
  });

  it('takes the lines off the grid: many angles, many lengths', () => {
    let lines = 0, tilted = 0, lengths: number[] = [];
    for (const lv of levels()) {
      const { at } = warpSky(lv);
      for (const e of lv.edges) {
        lines++;
        if (offGrid(dir(at, e)) > 0.05) tilted++;
        lengths.push(len(at, e));
      }
    }
    lengths = lengths.sort((x, y) => x - y);
    const p10 = lengths[Math.floor(lengths.length * 0.1)], p90 = lengths[Math.floor(lengths.length * 0.9)];
    expect(tilted / lines).toBeGreaterThan(0.8);
    expect(p90 / p10).toBeGreaterThan(1.5);
  });

  it('sizes every star around 1', () => {
    const { size } = warpSky(levels()[0]);
    for (const s of size) { expect(s).toBeGreaterThanOrEqual(0.8); expect(s).toBeLessThanOrEqual(1.2); }
  });

  it('falls back to the plain lattice when nothing else reads', () => {
    /* two stars on one line: nothing to cross, and the lattice is always allowed */
    const fig: SkyFigure = { nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }], edges: [[0, 1]] };
    const { at } = warpSky(fig);
    expect(len(at, [0, 1])).toBeCloseTo(1);
  });
});

describe('skyLayout', () => {
  it('works a figure out once', () => {
    const lv = levels()[0];
    expect(skyLayout(lv)).toBe(skyLayout(lv));
  });
});
