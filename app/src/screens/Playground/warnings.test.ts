import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from './params';
import { paramWarnings, reachableCells } from './warnings';

describe('setting warnings', () => {
  it('counts the cells a line can reach', () => {
    expect(reachableCells(1)).toBe(4);
    expect(reachableCells(1.5)).toBe(8);
    expect(reachableCells(2.3)).toBe(20);
  });

  it('says nothing about the defaults, for either strategy', () => {
    expect(paramWarnings(DEFAULT_PARAMS)).toEqual([]);
    expect(paramWarnings({ ...DEFAULT_PARAMS, strategy: 'free' })).toEqual([]);
  });

  it('flags a density the max degree can never allow, and only for free graphs', () => {
    const free = { ...DEFAULT_PARAMS, strategy: 'free' as const, density: 3.4, maxDegree: 3 };
    expect(paramWarnings(free)).toEqual([expect.stringMatching(/^Density 3.4 can't be reached.*Raise Max degree/)]);
    expect(paramWarnings({ ...free, maxDegree: 5 })).toEqual([]);
    expect(paramWarnings({ ...free, strategy: 'gadgets' })).toEqual([]);
  });

  it('flags a max degree the edge reach caps, and a min degree nothing can meet', () => {
    expect(paramWarnings({ ...DEFAULT_PARAMS, reach: 1, maxDegree: 6 })).toEqual([expect.stringMatching(/^Max degree 6 can't be reached/)]);
    expect(paramWarnings({ ...DEFAULT_PARAMS, minDegree: 3, maxDegree: 3, reach: 1, strategy: 'free', density: 2.6 }))
      .toEqual([expect.stringMatching(/^Min degree 3 is above the density/)]);
    expect(paramWarnings({ ...DEFAULT_PARAMS, minDegree: 5, maxDegree: 6, reach: 1 }))
      .toEqual([expect.stringMatching(/^Max degree 6/), expect.stringMatching(/^Min degree 5 is above what any star can have \(4\)/)]);
  });
});
