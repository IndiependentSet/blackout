import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { graphStats } from '../graphStats';
import { DEFAULT_GEN, generate, solve } from '.';

/* frozen clock, as in determinism.test.ts: budgets never cut a run short */
beforeAll(() => { vi.spyOn(Date, 'now').mockReturnValue(0); });
afterAll(() => { vi.restoreAllMocks(); });

describe('generate', () => {
  it('is seed-reproducible with the clock off', () => {
    const opts = { clock: false, attempts: 40 };
    const a = generate({ seed: 5, size: 12, diff: 2, options: opts });
    const b = generate({ seed: 5, size: 12, diff: 2, options: opts });
    expect(b.level).toEqual(a.level);
    expect(b.report.attempts).toBe(a.report.attempts);
  });

  it('respects a raised maximum degree and still finds a unique cover', () => {
    const { level, report } = generate({ seed: 11, size: 16, diff: 3, options: { maxDegree: 5, reach: 2.3, clock: false, attempts: 60 } });
    expect(level).not.toBeNull();
    if (!level) return;
    expect(graphStats(level).maxDegree).toBeLessThanOrEqual(5);
    expect(solve(level).count).toBe(1);      // fallbacks are only ever taken from unique covers
    expect(report.optima).toBe(1);
  });

  it('never exceeds the maximum degree it was given', () => {
    const { level } = generate({ seed: 2, size: 10, diff: 1, options: { maxDegree: 2, menu: ['path3', 'ring4', 'spur'], clock: false, attempts: 30 } });
    if (level) expect(graphStats(level).maxDegree).toBeLessThanOrEqual(2);
  });

  it('can be asked for crossings and accepts non-unique covers when told to', () => {
    const { level, report } = generate({ seed: 8, size: 20, diff: 3,
      options: { crossings: true, reach: 2.3, maxDegree: 4, unique: false, clock: false, attempts: 20 } });
    expect(level).not.toBeNull();
    expect(report.optima).toBeGreaterThanOrEqual(1);
  });

  it('meets a minimum degree or reports the miss', () => {
    const { level, report } = generate({ seed: 4, size: 12, diff: 2,
      options: { minDegree: 2, maxDegree: 4, reach: 1.5, clock: false, attempts: 80 } });
    if (level && !report.fallback) expect(graphStats(level).minDegree).toBeGreaterThanOrEqual(2);
    else expect(report.rejected.minDegree + report.rejected.unresolved + report.rejected.blowup).toBeGreaterThan(0);
  });

  it('returns nothing, with a report, for an empty menu', () => {
    const { level, report } = generate({ seed: 1, size: 8, diff: 1, options: { menu: [] } });
    expect(level).toBeNull();
    expect(report.attempts).toBe(0);
  });

  it('keeps DEFAULT_GEN equal to the constants the game was tuned with', () => {
    expect(DEFAULT_GEN).toMatchObject({ maxDegree: 3, reach: 1.5, clearance: 0.4, crossings: false, unique: true });
  });
});
