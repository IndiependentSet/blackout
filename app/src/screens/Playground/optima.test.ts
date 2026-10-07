import { describe, expect, it } from 'vitest';
import { optimumCaption, stepOptimum } from './optima';

describe('other optima', () => {
  it('steps round in both directions', () => {
    expect(stepOptimum(0, 1, 3)).toBe(1);
    expect(stepOptimum(2, 1, 3)).toBe(0);
    expect(stepOptimum(0, -1, 3)).toBe(2);
    expect(stepOptimum(0, 1, 0)).toBe(0);
  });

  it('says when only some were kept', () => {
    expect(optimumCaption(1, 3, 3)).toBe('2 of 3');
    expect(optimumCaption(0, 20, 56)).toBe('1 of 20 kept · 56 in all');
  });
});
