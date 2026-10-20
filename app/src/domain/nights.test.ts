import { describe, expect, it } from 'vitest';
import { figureOf, moonOf, tallyNights } from './nights';

describe('tallyNights', () => {
  it('counts each site once per night, at par if any clear of it was', () => {
    expect(tallyNights([
      { day: 3, site: 0, perfect: false }, { day: 3, site: 0, perfect: true }, { day: 3, site: 1, perfect: false },
      { day: 2, site: 4, perfect: true },
    ])).toEqual([{ day: 2, charted: 1, perfect: 1 }, { day: 3, charted: 2, perfect: 1 }]);
  });
});

describe('moonOf', () => {
  it('is new with nothing charted, full at seven at par, partly lit between', () => {
    expect(moonOf(undefined)).toEqual({ state: 'none', fill: 0 });
    expect(moonOf({ day: 1, charted: 7, perfect: 7 })).toEqual({ state: 'full', fill: 1 });
    expect(moonOf({ day: 1, charted: 3, perfect: 0 }).state).toBe('part');
    expect(moonOf({ day: 1, charted: 3, perfect: 0 }).fill).toBeGreaterThan(0);
  });
});

describe('figureOf', () => {
  it('keeps the stars and lines, and drops the answer', () => {
    const f = figureOf({ nodes: [{ c: 1, r: 2 }, { c: 2, r: 2 }], edges: [[0, 1]], k: 1, sol: [0] } as never);
    expect(f).toEqual({ nodes: [{ c: 1, r: 2 }, { c: 2, r: 2 }], edges: [[0, 1]] });
  });
});
