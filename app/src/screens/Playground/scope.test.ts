import { describe, expect, it } from 'vitest';
import { DEFAULT_CURVES, resolveOptions } from '../../domain/generation';
import { applyConstraints, applyParams } from './scope';

const tiers = DEFAULT_CURVES.campaign.tiers;

describe('editing one rule or all of them', () => {
  it('with one, only the open rule changes', () => {
    const next = applyParams(tiers, 3, { type: 'set', patch: { strategy: 'free' } }, 'one');
    expect(resolveOptions(next[3].options).strategy).toBe('free');
    next.forEach((t, i) => { if (i !== 3) expect(t).toBe(tiers[i]); });
  });

  it('with all, the changed setting reaches every rule, and each keeps the rest of its own', () => {
    const next = applyParams(tiers, 3, { type: 'set', patch: { strategy: 'free', maxDegree: 5 } }, 'all');
    next.forEach((t, i) => {
      const o = resolveOptions(t.options), was = resolveOptions(tiers[i].options);
      expect(o.strategy, `tier ${i}`).toBe('free');
      expect(o.maxDegree).toBe(5);
      /* the ramp survives: size, stars, count, constraints, budget and hardness are the tier's */
      expect({ count: t.count, size: t.size, diff: t.diff, constraints: t.constraints })
        .toEqual({ count: tiers[i].count, size: tiers[i].size, diff: tiers[i].diff, constraints: tiers[i].constraints });
      expect([o.budgetMs, o.greedyMustFail, o.minBoundGap]).toEqual([was.budgetMs, was.greedyMustFail, was.minBoundGap]);
    });
  });

  it('a recipe shape applied with all reaches every rule too', () => {
    const next = applyParams(tiers, 0, { type: 'shape', shape: { strategy: 'free', density: 2 } }, 'all');
    expect(next.every(t => resolveOptions(t.options).strategy === 'free' && resolveOptions(t.options).density === 2)).toBe(true);
  });

  it('constraints follow the scope', () => {
    const one = applyConstraints(tiers, 2, { maxK: 9 }, 'one');
    expect(one.filter(t => t.constraints?.maxK === 9)).toHaveLength(1);
    const all = applyConstraints(tiers, 2, { maxK: 9 }, 'all');
    expect(all.every(t => t.constraints?.maxK === 9 && t.constraints.minNodes === t.size)).toBe(true);
  });
});
