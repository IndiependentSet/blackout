import { describe, expect, it } from 'vitest';
import { alpha, animate, clamp, Easing, lerp } from './motion';
import { advance, CUES, isOver, skip, START_AT, TOTAL } from './timeline';

describe('motion', () => {
  it('clamps and lerps', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(lerp(10, 20, 0.5)).toBe(15);
  });

  it('eases from 0 to 1', () => {
    for (const ease of Object.values(Easing)) {
      expect(ease(0)).toBeCloseTo(0, 6);
      expect(ease(1)).toBeCloseTo(1, 6);
    }
  });

  it('animate holds either side of its window', () => {
    expect(animate(0, 3, 9, 1, 2)).toBe(3);
    expect(animate(5, 3, 9, 1, 2)).toBe(9);
    expect(animate(1.5, 0, 10, 1, 2, t => t)).toBeCloseTo(5);
  });

  it('alpha clamps its opacity', () => {
    expect(alpha('red', 2)).toBe('color-mix(in srgb, red 100%, transparent)');
    expect(alpha('red', 0.5)).toBe('color-mix(in srgb, red 50%, transparent)');
  });
});

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
