import { describe, expect, it } from 'vitest';
import type { Level } from '../types';
import { constraintFilter, gameConstraints } from './constraints';
import { generate } from './generate';
import { MAX_LEVEL_NODES } from './options';

const level = (seed: number, size: number): Level => {
  const { level: lv } = generate({ seed, size, diff: 1, options: { clock: false } });
  if (!lv) throw new Error('no level');
  return lv;
};

describe('constraintFilter', () => {
  it('has nothing to check when nothing is asked', () => {
    expect(constraintFilter(undefined)).toBeNull();
    expect(constraintFilter({})).toBeNull();
  });
  it('bounds the junction count from both sides', () => {
    const lv = level(1, 12);
    const n = lv.nodes.length;
    expect(constraintFilter({ minNodes: n })?.(lv)).toBe(true);
    expect(constraintFilter({ minNodes: n + 1 })?.(lv)).toBe(false);
    expect(constraintFilter({ maxNodes: n })?.(lv)).toBe(true);
    expect(constraintFilter({ maxNodes: n - 1 })?.(lv)).toBe(false);
  });
  it('bounds par from both sides', () => {
    const lv = level(2, 12);
    expect(constraintFilter({ minK: lv.k })?.(lv)).toBe(true);
    expect(constraintFilter({ minK: lv.k + 1 })?.(lv)).toBe(false);
    expect(constraintFilter({ maxK: lv.k })?.(lv)).toBe(true);
    expect(constraintFilter({ maxK: lv.k - 1 })?.(lv)).toBe(false);
  });
});

describe('gameConstraints', () => {
  it('caps the junction count at what the game plays', () => {
    expect(gameConstraints().maxNodes).toBe(MAX_LEVEL_NODES);
    expect(gameConstraints({ maxNodes: 99 }).maxNodes).toBe(MAX_LEVEL_NODES);
  });
  it('keeps a tighter cap and everything else it was given', () => {
    expect(gameConstraints({ maxNodes: 12, minK: 3 })).toEqual({ maxNodes: 12, minK: 3 });
  });
});
