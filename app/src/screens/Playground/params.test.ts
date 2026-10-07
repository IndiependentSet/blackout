import { describe, expect, it } from 'vitest';
import { DEFAULT_SCHEDULE, menuFor } from '../../domain/generation';
import {
  DEFAULT_PARAMS, decodeParams, describeParams, encodeParams, fallbackToParams, paramsReducer, paramsToFallback, paramsToSite,
  siteToParams, toGenOptions, weightsFor,
} from './params';

describe('playground params', () => {
  it('encodes defaults as an empty hash', () => {
    expect(encodeParams(DEFAULT_PARAMS)).toBe('');
    expect(decodeParams('')).toEqual(DEFAULT_PARAMS);
  });

  it('round-trips through the hash', () => {
    let p = paramsReducer(DEFAULT_PARAMS, { type: 'set', patch: { seed: 42, crossings: true, reach: 2.3, extraEdges: 1.2 } });
    p = paramsReducer(p, { type: 'weight', gadget: 'crown', value: 4 });
    expect(decodeParams('#' + encodeParams(p))).toEqual(p);
  });

  it('ignores junk in a hand-edited hash', () => {
    const p = decodeParams('#size=abc&weights=bogus:3,spur:2&crossings=true');
    expect(p.size).toBe(DEFAULT_PARAMS.size);
    expect(p.crossings).toBe(true);
    expect(p.weights?.spur).toBe(2);
  });

  it('turns weights into a menu with the same multiset as the difficulty menu', () => {
    const menu = toGenOptions({ ...DEFAULT_PARAMS, weights: weightsFor(3) }).menu ?? [];
    expect([...menu].sort()).toEqual([...menuFor(3)].sort());
    expect(toGenOptions(DEFAULT_PARAMS).menu).toBeNull();
  });

  it('keeps the strategy in the hash and ignores an unknown one', () => {
    const p = paramsReducer(DEFAULT_PARAMS, { type: 'set', patch: { strategy: 'free', density: 3.2, girth: 4, maxOptima: 2, greedyMustFail: true } });
    expect(encodeParams(p)).toContain('strategy=free');
    expect(decodeParams('#' + encodeParams(p))).toEqual(p);
    expect(decodeParams('#strategy=fractal').strategy).toBe('gadgets');
    expect(toGenOptions(p)).toMatchObject({ strategy: 'free', density: 3.2, girth: 4, maxOptima: 2, greedyMustFail: true });
  });

  it('names a set of settings by strategy and what differs, seed aside', () => {
    expect(describeParams({ ...DEFAULT_PARAMS, seed: 77 })).toBe('gadgets');
    expect(describeParams({ ...DEFAULT_PARAMS, strategy: 'free', size: 18, density: 3 })).toBe('free · size 18 · density 3');
    expect(describeParams({ ...DEFAULT_PARAMS, weights: weightsFor(3) })).toBe('gadgets · custom mix');
  });

  it('loads a site preset from the game ramp and keeps the seed', () => {
    const p = paramsReducer({ ...DEFAULT_PARAMS, seed: 9, crossings: true }, { type: 'site', idx: 6 });
    expect(p).toMatchObject({ seed: 9, size: 30, diff: 3, budgetMs: 700, crossings: false });
  });
});

describe('schedule sites as params', () => {
  it('round-trips every site of the default schedule', () => {
    for (const site of DEFAULT_SCHEDULE.sites) expect(paramsToSite(siteToParams(site, 5), site.constraints)).toEqual(site);
  });
  it('round-trips the fallback', () => {
    expect(paramsToFallback(fallbackToParams(DEFAULT_SCHEDULE.fallback, 10))).toEqual(DEFAULT_SCHEDULE.fallback);
  });
  it('stores only what differs from the defaults', () => {
    const p = { ...siteToParams(DEFAULT_SCHEDULE.sites[1], 0), crossings: true, weights: weightsFor(2) };
    const site = paramsToSite(p);
    expect(site.options.crossings).toBe(true);
    expect(site.options.budgetMs).toBe(400);
    expect(site.options.menu).toEqual(toGenOptions(p).menu);
    expect(Object.keys(site.options).sort()).toEqual(['budgetMs', 'crossings', 'menu']);
    expect(site.constraints).toBeUndefined();
  });
  it('keeps a site\'s clock setting (the playground preset turns it off)', () => {
    expect(siteToParams(DEFAULT_SCHEDULE.sites[0], 0).clock).toBe(true);
    expect(paramsReducer(DEFAULT_PARAMS, { type: 'site', idx: 0 }).clock).toBe(false);
  });
});
