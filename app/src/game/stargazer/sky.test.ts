import { describe, expect, it } from 'vitest';
import type { Level, SiteResult } from '../../domain/types';
import { SKY_STEP, skyOf, skyPips, skyStatus } from './sky';

/* a path of three stars, 0 - 1 - 2: par is the middle one */
const path: Level = {
  nodes: [{ c: 2, r: 5 }, { c: 3, r: 5 }, { c: 4, r: 5 }],
  edges: [[0, 1], [1, 2]], adj: [[1], [0, 2], [1]], k: 1, sol: [1], stars: 1,
};

describe('skyOf', () => {
  it('puts the top-left star at the origin and lights lines touching a lit star', () => {
    const sky = skyOf(path, [0]);
    expect(sky.stars[0]).toMatchObject({ x: 0, y: 0, lit: true });
    expect(sky.stars[2]).toMatchObject({ x: 2 * SKY_STEP, y: 0, lit: false });
    expect(sky.lines.map(l => l.lit)).toEqual([true, false]);
    expect(sky.scale).toBe(1);
  });
});

describe('skyStatus', () => {
  it('counts dark lines, then says how the sky came out', () => {
    expect(skyStatus(null, [])).toBe('Scanning the sky…');
    expect(skyStatus(path, [])).toBe('2 lines still dark');
    expect(skyStatus(path, [0])).toBe('1 line still dark');
    expect(skyStatus(path, [1])).toBe('Par. Name your find.');
    expect(skyStatus(path, [0, 2])).toBe('All lit, but par is 1');
  });
});

describe('skyPips', () => {
  it('marks the open sky, then each result by how it went', () => {
    const perfect = { status: 'perfect' } as SiteResult;
    const over = { status: 'over' } as SiteResult;
    expect(skyPips([perfect, over, null, null], 2)).toEqual(['perfect', 'over', 'current', 'todo']);
  });
});
