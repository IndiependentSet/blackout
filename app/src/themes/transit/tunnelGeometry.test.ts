import { describe, expect, it } from 'vitest';
import { NR, SIDES, tubeGeometry } from './tunnelGeometry';

describe('tubeGeometry', () => {
  const rings = tubeGeometry(7, 0.3, 195, 400);

  it('has every ring, each with six corners', () => {
    expect(rings).toHaveLength(NR);
    for (const g of rings) expect(g.pts).toHaveLength(SIDES);
  });

  it('is ordered far to near, and the near rings are bigger', () => {
    for (let i = 1; i < rings.length; i++) {
      expect(rings[i].p).toBeGreaterThanOrEqual(rings[i - 1].p);
      expect(rings[i].r).toBeGreaterThanOrEqual(rings[i - 1].r);
    }
  });

  it('is a pure function of time', () => {
    expect(tubeGeometry(7, 0.3, 195, 400)).toEqual(rings);
  });
});
