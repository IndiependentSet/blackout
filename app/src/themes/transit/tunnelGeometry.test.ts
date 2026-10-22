import { describe, expect, it } from 'vitest';
import { NR, REACH, SIDES, reachFor, tubeGeometry } from './tunnelGeometry';

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

  it('reaches past the corners of a wide stage, and no less than the column', () => {
    expect(reachFor(390, 844)).toBeGreaterThanOrEqual(REACH);
    expect(reachFor(390, 844)).toBeLessThan(REACH * 1.01);
    const r = reachFor(1470, 920);
    expect(r * Math.cos(Math.PI / SIDES)).toBeGreaterThan(Math.hypot(1470, 920) / 2);
  });

  it('is a pure function of time', () => {
    expect(tubeGeometry(7, 0.3, 195, 400)).toEqual(rings);
  });
});
