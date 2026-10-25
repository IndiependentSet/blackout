import { describe, expect, it } from 'vitest';
import type { Level, SiteResult } from '../../../domain/types';
import { skyLayout } from './warp';
import { SKY_STEP, activeScope, darkLabel, scopeForKey, skyEntries, skyMessage, skyOf, skyProgress, starfield } from './sky';

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
  it('shows Spot and Count only once the reducer has answered with their hint', () => {
    expect(activeScope('spot', null)).toBeNull();
    expect(activeScope('spot', { kind: 'reveal', node: 1 })).toBe('spot');
    expect(activeScope('count', { kind: 'proof', edges: [0] })).toBe('count');
    expect(activeScope('sweep', null)).toBe('sweep');
    expect(activeScope(null, { kind: 'reveal', node: 1 })).toBeNull();
  });
});

describe('skyMessage', () => {
  it('nudges, then says how the sky came out', () => {
    expect(skyMessage(path, [], null, null, '')).toBe('Tap a star to light it. Every line it touches will glow.');
    expect(skyMessage(path, [0], null, null, '')).toBe('1 line still dark. Light a star at either end.');
    expect(skyMessage(path, [0, 2], null, null, '')).toBe('The whole figure shows. Par is 1. Can you dim one and still show it all?');
    expect(skyMessage(path, [1], null, null, '')).toBe('Par. The figure is complete and the sky is ready to chart.');
  });
  it('puts a notice first, then what the telescope found', () => {
    expect(skyMessage(path, [], null, null, 'out of power')).toBe('out of power');
    expect(skyMessage(path, [], { kind: 'proof', edges: [0] }, 'count', '')).toContain('fewer than 1 star.');
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
