import { describe, expect, it } from 'vitest';
import { DEFAULT_CURVES, resolveOptions, sameShape } from '../../domain/generation';
import { initialPoolEditor, poolEditorReducer, poolParams, tierLevels, type PoolEditor, type PoolEditorAction } from './poolEditor';

const run = (s: PoolEditor, ...actions: PoolEditorAction[]) => actions.reduce(poolEditorReducer, s);

describe('poolEditorReducer', () => {
  const start = initialPoolEditor('survival');

  it('starts clean on the mode default, on the first tier', () => {
    expect(start.curve).toBe(DEFAULT_CURVES.survival);
    expect(start).toMatchObject({ dirty: false, tab: 0 });
  });

  it('edits the open tier through the settings panel, every option included, and keeps its count', () => {
    const s = run(start, { type: 'tab', tab: 1 },
      { type: 'params', action: { type: 'set', patch: { size: 12, diff: 3, strategy: 'free', density: 1.6, greedyMustFail: true } } });
    expect(s.curve.tiers[1]).toMatchObject({ count: start.curve.tiers[1].count, size: 12, diff: 3 });
    expect(s.curve.tiers[1].options).toMatchObject({ strategy: 'free', density: 1.6, greedyMustFail: true });
    expect(s.curve.tiers[0]).toEqual(start.curve.tiers[0]);
    expect(s.dirty).toBe(true);
    /* the panel reads back what it wrote */
    expect(poolParams(s)).toMatchObject({ size: 12, diff: 3, strategy: 'free', density: 1.6 });
  });

  it('edits the fallback the same way', () => {
    const s = run(start, { type: 'tab', tab: 'fallback' }, { type: 'params', action: { type: 'set', patch: { strategy: 'free' } } });
    expect(s.curve.fallback.options.strategy).toBe('free');
    expect(s.curve.tiers).toEqual(start.curve.tiers);
  });

  it('sets the count and constraints of the open tier, inside their limits', () => {
    let s = run(start, { type: 'tab', tab: 2 }, { type: 'count', value: 9999 }, { type: 'constraints', patch: { minK: 3 } });
    expect(s.curve.tiers[2]).toMatchObject({ count: 400, constraints: { minK: 3 } });
    s = run(s, { type: 'constraints', patch: { minK: null } });
    expect(s.curve.tiers[2].constraints).toEqual(start.curve.tiers[2].constraints);
    expect(run(start, { type: 'meta', patch: { retries: 0 } }).curve.retries).toBe(1);
  });

  it('applies a recipe shape to a run of tiers and leaves the rest of each tier alone', () => {
    const voyage = initialPoolEditor('campaign');
    const s = run(voyage, { type: 'shape', shape: { strategy: 'free', density: 1.6 }, from: 60, to: 40 });
    for (let i = 0; i < voyage.curve.tiers.length; i++) {
      const before = voyage.curve.tiers[i], after = s.curve.tiers[i];
      const inRun = i >= 40 && i <= 60;
      expect(sameShape(after.options, { strategy: 'free', density: 1.6 }), `tier ${i}`).toBe(inRun);
      /* size, stars, constraints and the ramped hardness and budget stay the tier's */
      expect({ ...after, options: undefined }).toEqual({ ...before, options: undefined });
      expect(resolveOptions(after.options).budgetMs).toBe(resolveOptions(before.options).budgetMs);
      expect(resolveOptions(after.options).minBoundGap).toBe(resolveOptions(before.options).minBoundGap);
    }
  });

  it('duplicates the open tier right after it, and removes it, but never the last', () => {
    const one = initialPoolEditor('match');
    const dup = run(one, { type: 'addTier' });
    expect(dup.curve.tiers).toHaveLength(3);
    expect(dup.curve.tiers[1]).toEqual(one.curve.tiers[0]);
    expect(dup.tab).toBe(1);
    let s = run(one, { type: 'tab', tab: 1 }, { type: 'removeTier' });
    expect(s.curve.tiers).toHaveLength(1);
    expect(s.tab).toBe(0);
    s = run(s, { type: 'removeTier' });
    expect(s.curve.tiers).toHaveLength(1);
  });

  it('numbers a tier’s levels the way its mode does', () => {
    const voyage = initialPoolEditor('campaign');
    expect(tierLevels(voyage, 0)).toEqual({ first: 1, last: 1 });
    expect(tierLevels(voyage, 99)).toEqual({ first: 100, last: 100 });
    expect(tierLevels(start, 1)).toEqual({ first: 6, last: 11 });
  });

  it('keeps the open tab on the curve when a shorter one is loaded', () => {
    const voyage = run(initialPoolEditor('campaign'), { type: 'tab', tab: 80 });
    expect(run(voyage, { type: 'load', curve: DEFAULT_CURVES.match, basis: 'x' }).tab).toBe(1);
    expect(run(voyage, { type: 'tab', tab: 500 }).tab).toBe(99);
  });
});
