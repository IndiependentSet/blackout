import { describe, expect, it } from 'vitest';
import type { Level, PlaySet } from '../../domain/types';
import { scoreRun } from '../../domain/scoring';
import { banner, budgetTone, hud, isWarning, perfectCount, pips, statusMessage } from './selectors';

const lv: Level = {
  nodes: [{ c: 0, r: 0 }, { c: 1, r: 0 }, { c: 2, r: 0 }, { c: 3, r: 0 }],
  edges: [[0, 1], [1, 2], [2, 3]], adj: [[1], [0, 2], [1, 3], [2]], k: 2, sol: [1, 2], stars: 2,
};

describe('hud', () => {
  it('counts hired cats and wrecked fixtures', () => {
    expect(hud(lv, [1])).toMatchObject({ used: 1, par: 2, lit: 2, edgeCount: 3, tone: 'under' });
  });
  it('colours by budget', () => {
    expect(budgetTone(2, 2)).toBe('at');
    expect(budgetTone(3, 2)).toBe('over');
  });
});

describe('banner', () => {
  it('shows progress while working', () => {
    expect(banner(lv, [1], 0)).toMatchObject({ text: 'SITE 1/7 · BUDGET 2 CATS', tone: 'working', canAdvance: false });
  });
  it('celebrates an on-budget clear and offers the next site', () => {
    expect(banner(lv, [1, 2], 0)).toMatchObject({ tone: 'perfect', canAdvance: true, nextLabel: 'NEXT SITE' });
  });
  it('flags an over-budget clear', () => {
    expect(banner(lv, [0, 1, 2], 0)).toMatchObject({ tone: 'over', text: 'CLEARED — BUT 3/2 CATS' });
  });
  it('has no next site after the last', () => {
    expect(banner(lv, [1, 2], 6)).toMatchObject({ canAdvance: false, nextLabel: 'SHIFT DONE' });
  });
  it('counts an open set from the offset, with no total', () => {
    const open = { count: 1, open: true, unitLabel: 'SITE' as const, finishLabel: 'NEXT SITE', name: () => 'X' };
    expect(banner(lv, [1], 0, open, 4)).toMatchObject({ text: 'SITE 5 · BUDGET 2 CATS', tone: 'working' });
  });
  it('numbers a bounded set from the offset too', () => {
    expect(banner(lv, [1], 0, undefined, 2).text).toBe('SITE 3/7 · BUDGET 2 CATS');
  });
});

describe('statusMessage', () => {
  it('nudges once the budget is spent and the site is still standing', () => {
    expect(statusMessage(lv, [0, 3], '')).toBe('SOMETHING IS STILL STANDING…');
  });
  it('prefers an explicit message', () => expect(statusMessage(lv, [0, 3], 'hi')).toBe('hi'));
  it('flags warnings', () => {
    expect(isWarning('PAYROLL SAYS NO — RECALL SOMEONE')).toBe(true);
    expect(isWarning('ESTIMATE: 2 CATS MINIMUM')).toBe(false);
  });
});

describe('pips', () => {
  it('marks the current, finished and still-loading sites', () => {
    const results = [scoreRun(lv, 2), null, null, null, null, null, null];
    const levels = [lv, lv, null, null, null, null, null];
    const p = pips(results, levels, 1);
    expect(p[0].state).toBe('perfect');
    expect(p[1].state).toBe('current');
    expect(p[2].state).toBe('pending');
    expect(pips(results, levels, 0)[1].state).toBe('ready');
    expect(perfectCount(results)).toBe(1);
  });
});

/* a 12-level campaign chapter: the labels and counts come from the set, not from the daily seven */
const chapter: PlaySet = { count: 12, name: i => 'LEVEL ' + (i + 1), unitLabel: 'LEVEL', finishLabel: 'CHAPTER DONE' };

describe('banner for another set', () => {
  it('counts and names the unit from the set', () => {
    expect(banner(lv, [1], 3, chapter)).toMatchObject({ text: 'LEVEL 4/12 · BUDGET 2 CATS', tone: 'working' });
    expect(banner(lv, [1, 2], 3, chapter)).toMatchObject({ text: 'LEVEL CLEARED — ON BUDGET 2/2', canAdvance: true, nextLabel: 'NEXT LEVEL' });
  });
  it('ends on the last level of the set, wherever that is', () => {
    expect(banner(lv, [1, 2], 11, chapter)).toMatchObject({ canAdvance: false, nextLabel: 'CHAPTER DONE' });
    expect(banner(lv, [1, 2], 6, chapter)).toMatchObject({ canAdvance: true });
  });
});

describe('pips for another set', () => {
  it('draws one pip per level of the set', () => {
    const results = Array<null>(12).fill(null);
    const p = pips(results, Array<Level | null>(12).fill(null), 0, chapter);
    expect(p).toHaveLength(12);
    expect(p[0].state).toBe('current');
    expect(p[11]).toMatchObject({ n: 12, state: 'pending' });
  });
});
