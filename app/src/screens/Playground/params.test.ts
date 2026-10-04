import { describe, expect, it } from 'vitest';
import { menuFor } from '../../domain/engine';
import { DEFAULT_PARAMS, decodeParams, encodeParams, paramsReducer, toGenOptions, weightsFor } from './params';

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

  it('loads a site preset from the game ramp and keeps the seed', () => {
    const p = paramsReducer({ ...DEFAULT_PARAMS, seed: 9, crossings: true }, { type: 'site', idx: 6 });
    expect(p).toMatchObject({ seed: 9, size: 30, diff: 3, budgetMs: 700, crossings: false });
  });
});
