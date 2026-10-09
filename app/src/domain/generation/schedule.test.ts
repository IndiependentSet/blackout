import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Level } from '../types';
import { DEFAULT_SCHEDULE, generate, levelForSite, levelForSiteReport, levelsForDay, parseSchedule, type GenerationSchedule } from '.';
import { constraintFilter } from './constraints';

/* frozen clock, as in determinism.test.ts */
beforeAll(() => { vi.spyOn(Date, 'now').mockReturnValue(0); });
afterAll(() => { vi.restoreAllMocks(); });

/* the closure makeLevelForDay() used for site 1 before the schedule became data */
const oldSiteOne = (lv: Level) => lv.nodes.length >= 4 && lv.adj.some(a => a.length === 3) && lv.k <= 2;

describe('schedule', () => {
  it('compiles site 1\'s constraints to the filter it replaced', () => {
    const accept = constraintFilter(DEFAULT_SCHEDULE.sites[0].constraints);
    expect(accept).not.toBeNull();
    let seen = 0, kept = 0;
    for (let seed = 0; seed < 60; seed++) {
      const { level } = generate({ seed, size: 3 + (seed % 6), diff: 1 + (seed % 2), options: { clock: false, attempts: 3, maxOptima: 0 } });
      if (!level) continue;
      seen++;
      if (oldSiteOne(level)) kept++;
      expect(accept?.(level)).toBe(oldSiteOne(level));
    }
    expect(seen).toBeGreaterThan(40);
    expect(kept).toBeGreaterThan(0);
    expect(kept).toBeLessThan(seen);
  });

  it('has nothing to check without constraints', () => {
    expect(constraintFilter(undefined)).toBeNull();
    expect(constraintFilter({})).toBeNull();
  });

  it('gives the same week after a trip through JSON and the parser', () => {
    const parsed = parseSchedule(JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(levelsForDay(parsed.value, 12)).toEqual(levelsForDay(DEFAULT_SCHEDULE, 12));
  });

  it('falls back when a site can grow nothing', () => {
    const broken: GenerationSchedule = {
      ...DEFAULT_SCHEDULE,
      sites: DEFAULT_SCHEDULE.sites.map((s, i) => (i === 1 ? { ...s, options: { ...s.options, menu: [] } } : s)),
    };
    const lv = levelForSite(broken, 12, 1);
    expect(lv.nodes.length).toBeGreaterThan(0);
    expect(lv).toEqual(levelForSite({ ...broken, retries: 0 }, 12, 1));
  });

  it('refuses a site it does not have', () => {
    expect(() => levelForSite(DEFAULT_SCHEDULE, 1, DEFAULT_SCHEDULE.sites.length)).toThrow(RangeError);
  });

  it('reports which retry settled a site without changing the level', () => {
    const r = levelForSiteReport(DEFAULT_SCHEDULE, 40, 2);
    expect(r.level).toEqual(levelForSite(DEFAULT_SCHEDULE, 40, 2));
    expect(r.salt).not.toBeNull();
  });

  it('reports the fallback when no retry can meet the rules', () => {
    const impossible: GenerationSchedule = {
      ...DEFAULT_SCHEDULE, retries: 1,
      sites: DEFAULT_SCHEDULE.sites.map(s => ({ ...s, options: { ...s.options, clock: false, attempts: 2 }, constraints: { maxK: 0 } })),
    };
    expect(levelForSiteReport(impossible, 40, 1).salt).toBeNull();
  });
});
