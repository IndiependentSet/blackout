import { describe, expect, it } from 'vitest';
import type { Level } from '../../domain/types';
import { dayLabel, SLOW_MS, siteSummary } from './week';

const level = { nodes: Array(9).fill({ c: 0, r: 0 }), k: 4, stars: 2 } as unknown as Level;   // only what the summary reads

describe('week strip', () => {
  it('words a site that settled on its first try', () => {
    expect(siteSummary({ level, salt: 0, ms: 120 })).toEqual({ line: '9 nodes · par 4 · ★★', made: 'first try', slow: false });
  });
  it('names a later retry and the fallback', () => {
    expect(siteSummary({ level, salt: 2, ms: 1 }).made).toBe('try 3');
    expect(siteSummary({ level, salt: null, ms: 1 }).made).toBe('fallback');
  });
  it('flags a site slow enough to freeze a phone', () => {
    expect(siteSummary({ level, salt: 0, ms: SLOW_MS + 1 }).slow).toBe(true);
  });
  it('dates a puzzle day', () => expect(dayLabel(176)).toBe('Thu, 8 Oct 2026'));
});
