import { describe, expect, it } from 'vitest';
import { alpha, animate, clamp, Easing, lerp } from './motion';

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
