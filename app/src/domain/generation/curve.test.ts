import { describe, expect, it } from 'vitest';
import { POOL_MODES } from '../gameModes';
import { CAMPAIGN_LEVELS } from '../types';
import { DEFAULT_CURVES, curveRuleErrors, generateSlot, poolSlots, type LevelCurve } from './curve';
import { parseCurve } from './parse';
import { solve } from './solver';

const tiny: LevelCurve = {
  version: 1, seed: 3, retries: 4, fallback: { diff: 1, options: { clock: false } },
  tiers: [{ count: 2, size: 4, diff: 1, options: { clock: false } }, { count: 1, size: 7, diff: 1, options: { clock: false } }],
};

describe('poolSlots', () => {
  it('numbers a campaign from level 1 and the others from 0', () => {
    expect(poolSlots('campaign', tiny).map(s => s.slot)).toEqual([1, 2, 3]);
    expect(poolSlots('survival', tiny).map(s => s.slot)).toEqual([0, 1, 2]);
    expect(poolSlots('match', tiny).map(s => s.tier)).toEqual([0, 0, 1]);
  });
});

describe('DEFAULT_CURVES', () => {
  for (const mode of POOL_MODES) {
    it(`${mode} parses and meets the game's rules`, () => {
      const curve = DEFAULT_CURVES[mode];
      const parsed = parseCurve(JSON.parse(JSON.stringify(curve)));
      expect(parsed.ok).toBe(true);
      expect(curveRuleErrors(mode, curve)).toEqual([]);
    });
  }
  it('makes exactly the campaign levels', () => {
    const slots = poolSlots('campaign', DEFAULT_CURVES.campaign);
    expect(slots).toHaveLength(CAMPAIGN_LEVELS);
    expect(slots[0].slot).toBe(1);
    expect(slots[CAMPAIGN_LEVELS - 1].slot).toBe(CAMPAIGN_LEVELS);
  });
});

describe('curveRuleErrors', () => {
  it('wants a campaign curve to add up to 100', () => {
    expect(curveRuleErrors('campaign', tiny)[0]).toMatch(/100 levels/);
  });
  it('refuses a pool that relaxes the unique cover', () => {
    const loose = { ...tiny, tiers: [{ ...tiny.tiers[0], options: { maxOptima: 3 } }] };
    expect(curveRuleErrors('survival', loose)).toEqual(['curve.tiers[0].options.maxOptima: the game needs a unique optimal cover (1)']);
  });
});

describe('generateSlot', () => {
  it('makes the same level for the same slot, and a unique-cover level', () => {
    const a = generateSlot(tiny, { slot: 1, tier: 0 }).level;
    const b = generateSlot(tiny, { slot: 1, tier: 0 }).level;
    expect(a).toEqual(b);
    const r = solve(a);
    expect(r.count).toBe(1);
    expect(r.k).toBe(a.k);
  });
  it('gives different slots different seeds', () => {
    expect(generateSlot(tiny, { slot: 1, tier: 0 }).level).not.toEqual(generateSlot(tiny, { slot: 2, tier: 0 }).level);
  });
  it('rejects a tier the curve does not have', () => {
    expect(() => generateSlot(tiny, { slot: 1, tier: 9 })).toThrow(RangeError);
  });
});

describe('parseCurve', () => {
  it('reports what is wrong', () => {
    const r = parseCurve({ version: 2, seed: 1.5, tiers: [], retries: 0, fallback: {} });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(4);
  });
  it('flags unknown tier settings', () => {
    const r = parseCurve({ ...tiny, tiers: [{ ...tiny.tiers[0], bogus: 1 }] });
    expect(r.ok).toBe(false);
  });
});
