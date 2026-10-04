import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from './params';
import { runGeneration } from './runGeneration';

describe('runGeneration', () => {
  it('generates a level with stats for the defaults', () => {
    const o = runGeneration(DEFAULT_PARAMS);
    expect(o.level).not.toBeNull();
    expect(o.stats?.nodes).toBe(o.level?.nodes.length);
    expect(o.report.optima).toBe(1);
  });

  it('reports crossings when they are allowed', () => {
    const o = runGeneration({ ...DEFAULT_PARAMS, seed: 3, size: 24, diff: 3, crossings: true, reach: 2.3, maxDegree: 5, extraEdges: 2 });
    expect(o.stats?.crossings).toBe(o.crossings.length);
    expect(o.crossings.length).toBeGreaterThan(0);
  });
});
