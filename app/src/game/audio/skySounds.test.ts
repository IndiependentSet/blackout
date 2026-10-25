import { describe, expect, it } from 'vitest';
import { starNote } from './skySounds';

describe('starNote', () => {
  it('climbs a step for every star lit, on a major pentatonic from G4', () => {
    const notes = Array.from({ length: 12 }, (_, i) => starNote(i + 1));
    expect(notes[0]).toBeCloseTo(392);
    for (let i = 1; i < notes.length; i++) expect(notes[i]).toBeGreaterThan(notes[i - 1]);
    expect(notes[5]).toBeCloseTo(784);   // the sixth star is the octave
    const steps = notes.slice(0, 6).map(f => Math.round(12 * Math.log2(f / 392)));
    expect(steps).toEqual([0, 2, 4, 7, 9, 12]);
  });

  it('comes round again after two and a half octaves, and treats nonsense as the first star', () => {
    expect(starNote(13)).toBeCloseTo(starNote(1));
    expect(starNote(0)).toBeCloseTo(starNote(1));
  });
});
