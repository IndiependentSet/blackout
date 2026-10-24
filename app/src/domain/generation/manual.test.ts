import { describe, expect, it } from 'vitest';
import { figureOf } from '../nights';
import type { SkyFigure } from '../types';
import { generate } from './generate';
import {
  EMPTY_FIGURE, addStar, checkFigure, decodeFigure, encodeFigure, figureErrors, figureWarnings, levelFromFigure, moveStar,
  normalizeFigure, removeLine, removeStar, starAt, toggleLine,
} from './manual';
import { MAX_LEVEL_NODES } from './options';
import { parseFigure } from './parse';

/** a three-star line, 0–1–2: the middle star alone covers it */
const path3: SkyFigure = { nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }], edges: [[0, 1], [1, 2]] };
/** one line: either end covers it */
const pair: SkyFigure = { nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }], edges: [[0, 1]] };

describe('checkFigure', () => {
  it('turns a drawing with one answer into a playable level', () => {
    const c = checkFigure(path3);
    expect(c.playable).toBe(true);
    expect(c.level).toMatchObject({ k: 1, sol: [1], adj: [[1], [0, 2], [1]] });
    expect(c.level?.stars).toBeGreaterThanOrEqual(1);
  });
  it('makes a level of a drawing with several answers, but not a playable one', () => {
    const c = checkFigure(pair);
    expect(c.level?.k).toBe(1);
    expect(c.optima).toBe(2);
    expect(c.playable).toBe(false);
    expect(c.warnings.join(' ')).toMatch(/2 best answers/);
  });
  it('makes no level of an empty or line-less drawing', () => {
    expect(checkFigure(EMPTY_FIGURE).level).toBeNull();
    expect(checkFigure({ nodes: path3.nodes, edges: [] }).errors.join(' ')).toMatch(/at least one line/);
  });
  it('gives back the same par and answer as the generator for a generated sky', () => {
    const { level } = generate({ seed: 9, size: 12, diff: 2, options: { clock: false } });
    if (!level) throw new Error('no level');
    const c = checkFigure(figureOf(level));
    expect(c.level?.k).toBe(level.k);
    expect(c.level?.sol).toEqual(level.sol);
    expect(c.level?.stars).toBe(level.stars);
    expect(c.playable).toBe(true);
  });
  it('levelFromFigure throws on a drawing that is no level', () => {
    expect(() => levelFromFigure(EMPTY_FIGURE)).toThrow();
    expect(levelFromFigure(path3).k).toBe(1);
  });
});

describe('figureErrors', () => {
  it('refuses too many stars, shared cells, self loops and repeated lines', () => {
    const many: SkyFigure = { nodes: Array.from({ length: MAX_LEVEL_NODES + 1 }, (_, i) => ({ c: i, r: 0 })), edges: [[0, 1]] };
    expect(figureErrors(many).join(' ')).toMatch(/At most/);
    expect(figureErrors({ nodes: [{ c: 0, r: 0 }, { c: 0, r: 0 }], edges: [[0, 1]] }).join(' ')).toMatch(/share a cell/);
    expect(figureErrors({ ...path3, edges: [[1, 1]] }).join(' ')).toMatch(/itself/);
    expect(figureErrors({ ...path3, edges: [[0, 1], [1, 0]] }).join(' ')).toMatch(/same stars/);
    expect(figureErrors({ ...path3, edges: [[0, 7]] }).join(' ')).toMatch(/nowhere/);
    expect(figureErrors(path3)).toEqual([]);
  });
});

describe('figureWarnings', () => {
  it('flags what a generated sky would not have', () => {
    const cross: SkyFigure = {
      nodes: [{ c: 0, r: 0 }, { c: 1, r: 1 }, { c: 1, r: 0 }, { c: 0, r: 1 }, { c: 5, r: 5 }],
      edges: [[0, 1], [2, 3]],
    };
    const w = figureWarnings(cross).join(' ');
    expect(w).toMatch(/1 star with no line/);
    expect(w).toMatch(/1 pair of lines cross/);
    expect(w).toMatch(/separate pieces/);
    expect(figureWarnings({ nodes: [{ c: 0, r: 0 }, { c: 3, r: 0 }], edges: [[0, 1]] }).join(' ')).toMatch(/longer/);
    expect(figureWarnings({ ...path3, edges: [[0, 2], [0, 1]] }).join(' ')).toMatch(/over a star/);
    expect(figureWarnings(path3)).toEqual([]);
  });
});

describe('editing', () => {
  it('adds a star once per cell and moves it only to a free cell', () => {
    const one = addStar(EMPTY_FIGURE, { c: 2, r: 3 });
    expect(addStar(one, { c: 2, r: 3 })).toBe(one);
    const two = addStar(one, { c: 4, r: 3 });
    expect(moveStar(two, 0, { c: 4, r: 3 })).toBe(two);
    expect(moveStar(two, 0, { c: 0, r: 0 }).nodes[0]).toEqual({ c: 0, r: 0 });
    expect(starAt(two, { c: 4, r: 3 })).toBe(1);
  });
  it('toggles a line either way round', () => {
    const on = toggleLine(path3, 0, 2);
    expect(on.edges).toHaveLength(3);
    expect(toggleLine(on, 2, 0).edges).toEqual(path3.edges);
    expect(toggleLine(path3, 1, 1)).toBe(path3);
    expect(removeLine(path3, 0).edges).toEqual([[1, 2]]);
  });
  it('removes a star with its lines and renumbers the rest', () => {
    const out = removeStar(path3, 0);
    expect(out.nodes).toEqual([{ c: 1, r: 0 }, { c: 2, r: 0 }]);
    expect(out.edges).toEqual([[0, 1]]);
  });
  it('normalizes a drawing to start at cell (0, 0)', () => {
    expect(normalizeFigure({ nodes: [{ c: 3, r: 5 }, { c: 4, r: 7 }], edges: [[0, 1]] }).nodes).toEqual([{ c: 0, r: 0 }, { c: 1, r: 2 }]);
  });
});

describe('text form', () => {
  it('round-trips', () => {
    const fig: SkyFigure = { nodes: [{ c: -1, r: 2 }, ...path3.nodes], edges: [[0, 1], [1, 2]] };
    expect(decodeFigure(encodeFigure(fig))).toEqual(fig);
    expect(decodeFigure(encodeFigure(EMPTY_FIGURE))).toEqual(EMPTY_FIGURE);
  });
  it('refuses what it did not write', () => {
    expect(decodeFigure('a,b|')).toBeNull();
    expect(decodeFigure('0,0;1,0|0-5')).toBeNull();
  });
});

describe('parseFigure', () => {
  it('accepts a drawing and refuses junk', () => {
    expect(parseFigure(JSON.parse(JSON.stringify(path3)))).toEqual({ ok: true, value: path3 });
    expect(parseFigure({ nodes: [{ c: 0.5, r: 0 }], edges: [] }).ok).toBe(false);
    expect(parseFigure({ nodes: [{ c: 0, r: 0 }], edges: [[0, 3]] }).ok).toBe(false);
    expect(parseFigure({ nodes: [], edges: [], extra: 1 }).ok).toBe(false);
  });
});
