import { describe, expect, it } from 'vitest';
import { progressNote, STEPS } from './skySounds';

const semis = (f: number) => Math.round(12 * Math.log2(f / 392));

describe('progressNote', () => {
  it('climbs two octaves of G major pentatonic, from G4 with nothing lit to G6 for the whole figure', () => {
    expect(STEPS).toBe(10);
    const steps = Array.from({ length: STEPS + 1 }, (_, i) => semis(progressNote(i / STEPS)));
    expect(steps).toEqual([0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]);
  });

  it('never wraps round: more of the figure lit is never a lower note, however big the sky', () => {
    for (const lines of [3, 17, 60]) {
      for (let k = 1; k <= lines; k++) expect(progressNote(k / lines)).toBeGreaterThanOrEqual(progressNote((k - 1) / lines));
      expect(semis(progressNote(lines / lines))).toBe(24);
    }
  });

  it('holds nonsense to the ends of the range', () => {
    expect(progressNote(-1)).toBeCloseTo(392);
    expect(progressNote(2)).toBeCloseTo(1568);
    expect(progressNote(Number.NaN)).toBeCloseTo(392);
  });
});
