import { describe, expect, it } from 'vitest';
import { COSMETIC_SLOTS, COSMETICS, EMPTY_LOADOUT, cosmeticById, cosmeticsInSlot, isOwned, resolveLoadout, sameLoadout } from './cosmetics';

describe('the catalogue', () => {
  it('has unique ids', () => expect(new Set(COSMETICS.map(c => c.id)).size).toBe(COSMETICS.length));
  it('only uses known slots, and fills each of them', () => {
    for (const c of COSMETICS) expect(COSMETIC_SLOTS).toContain(c.slot);
    for (const slot of COSMETIC_SLOTS) expect(cosmeticsInSlot(slot).length).toBeGreaterThan(0);
  });
  it('is unlocked by badges the SQL seed knows (one badge each)', () => {
    const badges = ['purrfect-shift', 'streak-7', 'streak-30', 'chapter-clear', 'campaign-3-stars', 'first-duel-win'];
    for (const c of COSMETICS) expect(badges).toContain(c.unlockBadge);
    expect(new Set(COSMETICS.map(c => c.unlockBadge)).size).toBe(COSMETICS.length);
  });
  it('looks up by id', () => {
    expect(cosmeticById('hard-hat')?.slot).toBe('head');
    expect(cosmeticById('crown')).toBeUndefined();
  });
});

describe('isOwned', () => {
  it('is a plain membership test', () => {
    expect(isOwned('scarf', ['scarf'])).toBe(true);
    expect(isOwned('scarf', [])).toBe(false);
  });
});

describe('resolveLoadout', () => {
  it('keeps owned accessories in the slot they belong to', () => {
    expect(resolveLoadout({ head: 'hard-hat', neck: 'scarf' }, ['hard-hat', 'scarf'])).toEqual({ head: 'hard-hat', neck: 'scarf' });
  });
  it('drops an accessory the player does not own', () => {
    expect(resolveLoadout({ head: 'hard-hat', neck: null }, [])).toEqual(EMPTY_LOADOUT);
  });
  it('drops an unknown id and one filed under the wrong slot', () => {
    expect(resolveLoadout({ head: 'crown', neck: 'hard-hat' }, ['hard-hat'])).toEqual(EMPTY_LOADOUT);
  });
  it('reads nothing as bare', () => {
    expect(resolveLoadout(null, ['hard-hat'])).toEqual(EMPTY_LOADOUT);
    expect(resolveLoadout(undefined, [])).toEqual(EMPTY_LOADOUT);
  });
  it('does not hand back the shared empty object to be mutated', () => {
    expect(resolveLoadout(null, [])).not.toBe(EMPTY_LOADOUT);
  });
});

describe('sameLoadout', () => {
  it('compares slot by slot', () => {
    expect(sameLoadout({ head: 'hard-hat', neck: null }, { head: 'hard-hat', neck: null })).toBe(true);
    expect(sameLoadout({ head: 'hard-hat', neck: null }, { head: null, neck: null })).toBe(false);
  });
});
