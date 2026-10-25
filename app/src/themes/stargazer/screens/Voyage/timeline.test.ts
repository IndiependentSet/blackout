import { describe, expect, it } from 'vitest';
import { advance, CUES, isOver, skip, START_AT, TOTAL } from './timeline';

describe('timeline', () => {
  it('joins after the charted beat and stops at the end', () => {
    expect(START_AT).toBeLessThan(CUES.Liftoff);
    expect(advance(8.8, 1)).toBe(TOTAL);
    expect(isOver(TOTAL)).toBe(true);
    expect(isOver(TOTAL - 0.01)).toBe(false);
  });

  it('a tap during liftoff, cruise or the start of the approach jumps to the arrival', () => {
    expect(skip(CUES.Liftoff)).toBe(CUES.Arrival);
    expect(skip(4)).toBe(CUES.Arrival);
    expect(skip(CUES.Approach - 0.01)).toBe(CUES.Arrival);
  });

  it('a tap elsewhere does nothing', () => {
    expect(skip(1.2)).toBe(1.2);
    expect(skip(CUES.Approach)).toBe(CUES.Approach);
    expect(skip(7.5)).toBe(7.5);
  });
});
