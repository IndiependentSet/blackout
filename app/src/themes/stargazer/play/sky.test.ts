import { describe, expect, it } from 'vitest';
import type { Level, SiteResult } from '../../../domain/types';
import { skyLayout } from './warp';
import { CORE_R, HALO_R, SKY_STEP, activeScope, countMessage, darkLabel, SCOPES, scopeForKey, skyEntries, skyMessage, skyOf, skyPoints, skyProgress, starfield } from './sky';

/* a path of three stars, 0 - 1 - 2: par is the middle one */
const path: Level = {
  nodes: [{ c: 2, r: 5 }, { c: 3, r: 5 }, { c: 4, r: 5 }],
  edges: [[0, 1], [1, 2]], adj: [[1], [0, 2], [1]], k: 1, sol: [1], stars: 1,
};

describe('skyOf', () => {
  it('draws the stars where the warp puts them, the sky starting at the origin, and lights lines touching a lit star', () => {
    const sky = skyOf(path, [0]);
    const { at } = skyLayout(path);
    expect(Math.min(...sky.stars.map(s => s.x))).toBeCloseTo(0);
    expect(Math.min(...sky.stars.map(s => s.y))).toBeCloseTo(0);
    expect(sky.stars[2].x - sky.stars[0].x).toBeCloseTo((at[2].c - at[0].c) * SKY_STEP);
    expect(sky.stars[2].y - sky.stars[0].y).toBeCloseTo((at[2].r - at[0].r) * SKY_STEP);
    expect(sky.stars.map(s => s.lit)).toEqual([true, false, false]);
    expect(sky.hit).toBeLessThanOrEqual(45);
    expect(sky.lines.map(l => l.lit)).toEqual([true, false]);
    expect(sky.dark).toBe(1);
    expect(sky.scale).toBe(1);
  });
});

/* a row of seven stars: a long, thin sky */
const row: Level = {
  nodes: Array.from({ length: 7 }, (_, i) => ({ c: i, r: 0 })),
  edges: Array.from({ length: 6 }, (_, i) => [i, i + 1] as [number, number]),
  adj: Array.from({ length: 7 }, (_, i) => [i - 1, i + 1].filter(j => j >= 0 && j < 7)), k: 3, sol: [1, 3, 5], stars: 1,
};
/* a square of four: as wide as it is tall */
const square: Level = {
  nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 1, r: 1 }, { c: 0, r: 1 }],
  edges: [[0, 1], [1, 2], [2, 3], [3, 0]], adj: [[1, 3], [0, 2], [1, 3], [2, 0]], k: 2, sol: [0, 2], stars: 1,
};
/* a 8 × 5 grid: forty stars, the biggest sky the game plays */
const grid: Level = (() => {
  const nodes = Array.from({ length: 40 }, (_, i) => ({ c: i % 8, r: Math.floor(i / 8) }));
  const edges: [number, number][] = [];
  nodes.forEach((n, i) => { if (n.c < 7) edges.push([i, i + 1]); if (n.r < 4) edges.push([i, i + 8]); });
  const adj = nodes.map((_, i) => edges.filter(e => e.includes(i)).map(([a, b]) => (a === i ? b : a)));
  return { nodes, edges, adj, k: 20, sol: [], stars: 3 };
})();
const vb = (viewBox: string) => viewBox.split(' ').map(Number);
const pxPerUnit = (viewBox: string, w: number, h: number) => { const [, , vw, vh] = vb(viewBox); return Math.min(w / vw, h / vh); };

describe('skyOf on the board', () => {
  it('draws exactly as a preview does with no view (previews and the atlas)', () => {
    expect(skyOf(grid, [3])).toEqual(skyOf(grid, [3], {}));
    expect(skyOf(grid, [3]).turned).toBe(false);
  });

  it('turns a long sky a quarter turn to fill a tall board, and only then', () => {
    expect(skyOf(row, [], { box: { w: 300, h: 600 } }).turned).toBe(true);
    expect(skyOf(row, [], { box: { w: 600, h: 300 } }).turned).toBe(false);
    expect(skyOf(square, [], { box: { w: 300, h: 330 } }).turned).toBe(false);
  });

  it('turns by moving the stars only: a quarter turn of the same sky, lines and lit stars kept', () => {
    const flat = skyPoints(row), turned = skyPoints(row, { box: { w: 300, h: 600 } });
    expect(turned.turned).toBe(true);
    expect([turned.w, turned.h]).toEqual([flat.h, flat.w]);
    turned.at.forEach((p, i) => {
      expect(p.x).toBeCloseTo(flat.h - flat.at[i].y);
      expect(p.y).toBeCloseTo(flat.at[i].x);
    });
    const a = skyOf(row, [2], { box: { w: 300, h: 600 } }), b = skyOf(row, [2]);
    expect(a.lines.map(l => l.lit)).toEqual(b.lines.map(l => l.lit));
    expect(a.stars.map(s => [s.lit, s.size])).toEqual(b.stars.map(s => [s.lit, s.size]));
    expect(a.hit).toBe(b.hit);
  });

  it('keeps a tighter margin when asked', () => {
    const loose = vb(skyOf(grid, [], { box: { w: 340, h: 360 } }).viewBox);
    const tight = vb(skyOf(grid, [], { box: { w: 340, h: 360 }, tight: true }).viewBox);
    expect(tight[0]).toBeGreaterThan(loose[0]);
    expect(tight[2]).toBeLessThan(loose[2]);
  });

  it('draws a big sky on a phone no smaller than readable, without its stars meeting', () => {
    for (const box of [{ w: 343, h: 363 }, { w: 200, h: 200 }]) {
      const sky = skyOf(grid, [], { box, tight: true });
      const closest = Math.min(...sky.stars.flatMap((a, i) => sky.stars.slice(i + 1).map(b => Math.hypot(a.x - b.x, a.y - b.y))));
      const maxSize = Math.max(...sky.stars.map(s => s.size));
      const core = CORE_R * sky.scale * pxPerUnit(sky.viewBox, box.w, box.h);
      expect(HALO_R * sky.scale * maxSize).toBeLessThanOrEqual(closest / 2 + 1e-6);
      expect(core >= 4.5 - 1e-3 || HALO_R * sky.scale * 1.2 >= closest / 2 - 1e-3).toBe(true);
    }
    /* a small board raises the scale past the preview's */
    expect(skyOf(grid, [], { box: { w: 200, h: 200 }, tight: true }).scale).toBeGreaterThan(skyOf(grid, []).scale);
  });
});

describe('skyProgress', () => {
  it('is the share of the lines lit', () => {
    expect(skyProgress(path, [])).toBe(0);
    expect(skyProgress(path, [0])).toBe(0.5);
    expect(skyProgress(path, [1])).toBe(1);
    expect(skyProgress(null, [1])).toBe(0);
  });
});

describe('darkLabel', () => {
  it('counts dark lines until the whole figure shows', () => {
    expect(darkLabel(path, [])).toBe('2 lines dark');
    expect(darkLabel(path, [0])).toBe('1 line dark');
    expect(darkLabel(path, [1])).toBe('whole figure shows');
  });
});

describe('telescope', () => {
  it('maps keys 1/2/3 to Spot, Sweep, Count', () => {
    expect([1, 2, 3].map(t => scopeForKey(t as 1 | 2 | 3))).toEqual(['spot', 'sweep', 'count']);
  });
  it('shows Spot only once the reducer has answered with its star; Count draws its own proof', () => {
    expect(activeScope('spot', null)).toBeNull();
    expect(activeScope('spot', { kind: 'reveal', node: 1 })).toBe('spot');
    expect(activeScope('count', null)).toBe('count');
    expect(activeScope('count', { kind: 'proof', edges: [0] })).toBe('count');
    expect(activeScope('sweep', null)).toBe('sweep');
    expect(activeScope(null, { kind: 'reveal', node: 1 })).toBeNull();
  });
  it("labels Count \"Count what's left\" on desktop and \"Count\" on a phone", () => {
    const count = SCOPES.find(t => t.scope === 'count')!;
    expect([count.short, count.long]).toEqual(['Count', "Count what's left"]);
  });
});

describe('countMessage', () => {
  /* par 5 */
  it('says how many more stars at least, never that par is the count', () => {
    expect(countMessage(5, 0, 4)).toBe('4 marked lines share no star: this sky needs at least 4 stars. Par may need more.');
    expect(countMessage(5, 1, 2)).toBe('2 marked lines share no star: you need at least 2 more stars. Par may need more.');
    expect(countMessage(5, 3, 2)).toBe('2 marked lines share no star: at least 2 more stars — all that par has left.');
    expect(countMessage(5, 4, 2)).toBe('2 marked lines share no star: at least 2 more, so par (5) is out of reach with these stars lit. Dim one.');
  });
  it('speaks of one line in the singular', () => {
    expect(countMessage(5, 0, 1)).toBe('1 marked line is still dark: this sky needs at least 1 star. Par may need more.');
    expect(countMessage(5, 2, 1)).toBe('1 marked line is still dark: you need at least 1 more star. Par may need more.');
    expect(countMessage(5, 4, 1)).toBe('1 marked line is still dark: at least 1 more star — all that par has left.');
  });
});

describe('skyMessage', () => {
  it('nudges, then says how the sky came out', () => {
    expect(skyMessage(path, [], null, null, '')).toBe('Tap a star to light it. Every line it touches will glow.');
    expect(skyMessage(path, [0], null, null, '')).toBe('1 line still dark. Light a star at either end.');
    expect(skyMessage(path, [], null, null, '', { turnHint: true })).toBe('Turn your phone sideways for a bigger sky.');
    expect(skyMessage(path, [0], null, null, '', { turnHint: true })).toBe('1 line still dark. Light a star at either end.');
    expect(skyMessage(path, [0, 2], null, null, '')).toBe('The whole figure shows. Par is 1. Can you dim one and still show it all?');
    expect(skyMessage(path, [1], null, null, '')).toBe('Par. The figure is complete and the sky is ready to chart.');
  });
  it('puts a notice first, then what the telescope found', () => {
    expect(skyMessage(path, [], null, null, 'out of power')).toBe('out of power');
    expect(skyMessage(path, [], null, 'count', '', { counted: [0] }))
      .toBe('1 marked line is still dark: this sky needs at least 1 star. Par may need more.');
    expect(skyMessage(path, [0, 2], null, 'count', '', { counted: [] }))
      .toBe('The whole figure shows. Par is 1. Can you dim one and still show it all?');
    expect(skyMessage(path, [2], null, 'count', '', { counted: [0] }))
      .toBe('1 marked line is still dark: at least 1 more, so par (1) is out of reach with these stars lit. Dim one.');
    expect(skyMessage(path, [], { kind: 'reveal', node: 1 }, 'spot', '')).toBe('The ringed star is part of a par answer.');
    expect(skyMessage(path, [0], null, 'sweep', '')).toBe('1 dark line highlighted. Each needs a lit star at one end.');
  });
});

describe('skyEntries', () => {
  it('marks the open sky, then each result by how it went', () => {
    const perfect = { status: 'perfect', used: 2, par: 2 } as SiteResult;
    const over = { status: 'over', used: 4, par: 3 } as SiteResult;
    expect(skyEntries([perfect, over, null, null], 2).map(e => [e.state, e.note]))
      .toEqual([['par', 'par'], ['over', '+1'], ['cur', 'now'], ['next', '']]);
  });
});

describe('starfield', () => {
  it('is the same scatter every time for a seed', () => {
    expect(starfield(7, 5)).toEqual(starfield(7, 5));
    expect(starfield(7, 70)).toHaveLength(70);
  });
});
