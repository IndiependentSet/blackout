import { describe, expect, it } from 'vitest';
import { clamp, Easing, mix, mix3, tween, within } from './motion';

describe('easings', () => {
  it.each(Object.entries(Easing))('%s runs from 0 to 1', (_name, ease) => {
    expect(ease(0)).toBeCloseTo(0, 6);
    expect(ease(1)).toBeCloseTo(1, 6);
  });

  it('easeOutBack overshoots, easeInBack dips below zero', () => {
    expect(Easing.easeOutBack(0.7)).toBeGreaterThan(1);
    expect(Easing.easeInBack(0.2)).toBeLessThan(0);
  });
});

describe('clamp', () => {
  it('holds a value inside its range', () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });
});

describe('tween', () => {
  it('holds the start before the window and the end after it', () => {
    expect(tween(0, 10, 20, 1, 2)).toBe(10);
    expect(tween(3, 10, 20, 1, 2)).toBe(20);
  });
  it('is halfway at the middle of a symmetric ease', () => {
    expect(tween(1.5, 0, 10, 1, 2)).toBeCloseTo(5, 6);
  });
  it('can run backwards', () => expect(tween(2, 1, 0, 1, 2)).toBe(0));
});

describe('within', () => {
  it('includes the start and excludes the end', () => {
    expect(within(1, 1, 2)).toBe(true);
    expect(within(2, 1, 2)).toBe(false);
  });
});

describe('colour mixing', () => {
  it('asks the browser for the share of the second colour', () => {
    expect(mix('var(--a)', 'var(--b)', 0.25)).toBe('color-mix(in srgb, var(--b) 25%, var(--a))');
    expect(mix('x', 'y', 4)).toBe('color-mix(in srgb, y 100%, x)');
  });
  it('mix3 passes through the middle colour at 0.5', () => {
    expect(mix3('a', 'b', 'c', 0.5)).toBe(mix('b', 'c', 0));
    expect(mix3('a', 'b', 'c', 0.25)).toBe(mix('a', 'b', 0.5));
  });
});
