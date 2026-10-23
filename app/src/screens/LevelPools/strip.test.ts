import { describe, expect, it } from 'vitest';
import type { CurveTier, Recipe } from '../../domain/generation';
import { barHeights, recipeBands } from './strip';

const tier = (size: number, options: CurveTier['options'] = {}, count = 1): CurveTier => ({ count, size, diff: 1, options });
const open: Recipe = { name: 'Open field', shape: { strategy: 'free' }, note: '' };

describe('tier strip', () => {
  it('runs tiers that match the same recipe into one band, counting their levels', () => {
    const tiers = [tier(5), tier(6, { budgetMs: 800 }, 3), tier(10, { strategy: 'free' }), tier(12, { strategy: 'free', budgetMs: 2000 }), tier(14)];
    expect(recipeBands(tiers, [open])).toEqual([
      { name: null, from: 0, to: 1, levels: 4 },
      { name: 'Open field', from: 2, to: 3, levels: 2 },
      { name: null, from: 4, to: 4, levels: 1 },
    ]);
  });

  it('scales bars to the tallest tier, never to nothing', () => {
    expect(barHeights([tier(10), tier(40), tier(1)])).toEqual([0.25, 1, 0.08]);
  });
});
