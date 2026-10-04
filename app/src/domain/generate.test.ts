import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GEN, generate, makeLevel, rngFromSeed, solve } from './engine';
import { graphStats } from './graphStats';

/* frozen clock, as in determinism.test.ts: budgets never cut a run short */
beforeAll(() => { vi.spyOn(Date, 'now').mockReturnValue(0); });
afterAll(() => { vi.restoreAllMocks(); });

describe('generate', () => {
  it('matches makeLevel under the default rules', () => {
    for (const [seed, n, d] of [[3, 7, 1], [9, 14, 2], [21, 18, 3]]) {
      const a = makeLevel(rngFromSeed(seed), n, d);
      const b = generate(rngFromSeed(seed), n, d, { budgetMs: 500 }).level;
      expect(b).toEqual(a);
    }
  });

  it('is seed-reproducible with the clock off', () => {
    const opts = { clock: false, attempts: 40 };
    const a = generate(rngFromSeed(5), 12, 2, opts);
    const b = generate(rngFromSeed(5), 12, 2, opts);
    expect(b.level).toEqual(a.level);
    expect(b.report.attempts).toBe(a.report.attempts);
  });

  it('respects a raised maximum degree and still finds a unique cover', () => {
    const { level, report } = generate(rngFromSeed(11), 16, 3, { maxDegree: 5, reach: 2.3, clock: false, attempts: 60 });
    expect(level).not.toBeNull();
    if (!level) return;
    expect(graphStats(level).maxDegree).toBeLessThanOrEqual(5);
    expect(solve(level).count).toBe(1);      // fallbacks are only ever taken from unique covers
    expect(report.optima).toBe(1);
  });

  it('never exceeds the maximum degree it was given', () => {
    const { level } = generate(rngFromSeed(2), 10, 1, { maxDegree: 2, menu: ['path3', 'ring4', 'spur'], clock: false, attempts: 30 });
    if (level) expect(graphStats(level).maxDegree).toBeLessThanOrEqual(2);
  });

  it('can be asked for crossings and accepts non-unique covers when told to', () => {
    const { level, report } = generate(rngFromSeed(8), 20, 3,
      { crossings: true, reach: 2.3, maxDegree: 4, unique: false, clock: false, attempts: 20 });
    expect(level).not.toBeNull();
    expect(report.optima).toBeGreaterThanOrEqual(1);
  });

  it('meets a minimum degree or reports the miss', () => {
    const { level, report } = generate(rngFromSeed(4), 12, 2,
      { minDegree: 2, maxDegree: 4, reach: 1.5, clock: false, attempts: 80 });
    if (level && !report.fallback) expect(graphStats(level).minDegree).toBeGreaterThanOrEqual(2);
    else expect(report.rejected.minDegree + report.rejected.unresolved + report.rejected.blowup).toBeGreaterThan(0);
  });

  it('returns nothing, with a report, for an empty menu', () => {
    const { level, report } = generate(rngFromSeed(1), 8, 1, { menu: [] });
    expect(level).toBeNull();
    expect(report.attempts).toBe(0);
  });

  it('keeps DEFAULT_GEN equal to the constants the game was tuned with', () => {
    expect(DEFAULT_GEN).toMatchObject({ maxDegree: 3, reach: 1.5, clearance: 0.4, crossings: false, unique: true });
  });
});
