import { describe, expect, it } from 'vitest';
import { POOL_MODES } from '../gameModes';
import { CAMPAIGN_LEVELS } from '../types';
import { DEFAULT_CURVES, campaignRamp, curveRuleErrors, generateSlot, orderByHardness, poolKey, poolSlots, type LevelCurve } from './curve';
import { MAX_LEVEL_NODES } from './options';
import { generate } from './generate';
import { compareHardness } from './hardness';
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

describe('campaignRamp', () => {
  const ramp = campaignRamp();
  const climbs = (pick: (t: (typeof ramp)[number]) => number) => ramp.every((t, i) => i === 0 || pick(t) >= pick(ramp[i - 1]));

  it('is one level per tier, a hundred of them', () => {
    expect(ramp).toHaveLength(CAMPAIGN_LEVELS);
    expect(ramp.every(t => t.count === 1)).toBe(true);
  });
  it('runs from 5 junctions to 40 and never past the game\'s cap', () => {
    expect(ramp[0].size).toBe(5);
    expect(ramp[ramp.length - 1].size).toBe(MAX_LEVEL_NODES);
    expect(Math.max(...ramp.map(t => t.size))).toBe(MAX_LEVEL_NODES);
  });
  it('never asks for less than the level before', () => {
    expect(climbs(t => t.size)).toBe(true);
    expect(climbs(t => t.diff)).toBe(true);
    expect(climbs(t => t.constraints?.minK ?? 0)).toBe(true);
    expect(climbs(t => t.options.minBoundGap ?? 0)).toBe(true);
    expect(climbs(t => Number(t.options.greedyMustFail ?? false))).toBe(true);
  });
  it('reaches every size from 5 to 40', () => {
    expect(new Set(ramp.map(t => t.size)).size).toBe(MAX_LEVEL_NODES - 5 + 1);
  });
  it('asks for the hardest technique only where the generator can deliver it', () => {
    for (const t of ramp) if (t.diff === 3) expect(t.size).toBeGreaterThanOrEqual(25);
    expect(ramp.some(t => t.diff === 3)).toBe(true);
  });
  it('never relaxes the unique cover', () => {
    expect(curveRuleErrors('campaign', DEFAULT_CURVES.campaign)).toEqual([]);
  });
});

describe('orderByHardness', () => {
  const made = [14, 6, 10, 8, 12, 7].map((size, i) => {
    const { level } = generate({ seed: 50 + i, size, diff: 1, options: { clock: false } });
    if (!level) throw new Error('no level');
    return { slot: i + 1, tier: i, level, salt: 0 as number | null };
  });

  it('lays the levels out so none is easier than the one before', () => {
    const out = orderByHardness(made);
    for (let i = 1; i < out.length; i++) expect(compareHardness(out[i - 1].level, out[i].level)).toBeLessThanOrEqual(0);
  });
  it('keeps every slot number and tier where they were, and every level in the pool', () => {
    const out = orderByHardness(made);
    expect(out.map(r => [r.slot, r.tier])).toEqual(made.map(r => [r.slot, r.tier]));
    const keyed = (rs: typeof made) => rs.map(r => JSON.stringify(r.level)).sort();
    expect(keyed(out)).toEqual(keyed(made));
  });
  it('leaves a pool that is already in order alone', () => {
    const once = orderByHardness(made);
    expect(orderByHardness(once)).toEqual(once);
  });
  it('does not touch its input', () => {
    const before = made.map(r => r.slot + ':' + r.level.nodes.length);
    orderByHardness(made);
    expect(made.map(r => r.slot + ':' + r.level.nodes.length)).toEqual(before);
  });
});

describe('curveRuleErrors', () => {
  it('refuses a tier bigger than the game plays', () => {
    const big = { ...tiny, tiers: [{ ...tiny.tiers[0], size: MAX_LEVEL_NODES + 1 }] };
    expect(curveRuleErrors('survival', big)).toEqual([`curve.tiers[0].size: the game plays at most ${MAX_LEVEL_NODES} junctions`]);
  });
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
  it('never hands out more than the game\'s cap, even from the fallback', () => {
    const lv = generateSlot({ ...tiny, retries: 1, tiers: [{ count: 1, size: MAX_LEVEL_NODES, diff: 1, options: { clock: false, attempts: 3 } }] }, { slot: 1, tier: 0 }).level;
    expect(lv.nodes.length).toBeLessThanOrEqual(MAX_LEVEL_NODES);
  });
  it('passes over a sky the pool already holds', () => {
    const first = generateSlot(tiny, { slot: 1, tier: 0 });
    expect(first).toMatchObject({ key: poolKey(first.level), duplicate: false });
    const next = generateSlot(tiny, { slot: 1, tier: 0 }, new Set([first.key]));
    expect(next.duplicate).toBe(false);
    expect(next.key).not.toBe(first.key);
    const r = solve(next.level);
    expect(r.count).toBe(1);
  });
  it('flags a repeat when nothing new can be found, rather than failing', () => {
    const one: LevelCurve = { ...tiny, retries: 1 };
    const a = generateSlot(one, { slot: 1, tier: 0 });
    const fb = generateSlot({ ...one, retries: 0 }, { slot: 1, tier: 0 });
    const out = generateSlot(one, { slot: 1, tier: 0 }, new Set([a.key, fb.key]));
    expect(out.duplicate).toBe(true);
  });
  it('builds a pool with no sky in it twice', () => {
    const curve: LevelCurve = { ...tiny, retries: 8, tiers: [{ count: 8, size: 10, diff: 1, options: { clock: false } }] };
    const keys = new Set<string>();
    for (const s of poolSlots('survival', curve)) {
      const o = generateSlot(curve, s, keys);
      expect(o.duplicate).toBe(false);
      keys.add(o.key);
    }
    expect(keys.size).toBe(8);
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
