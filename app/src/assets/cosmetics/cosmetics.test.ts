import { describe, expect, it } from 'vitest';
import { EMPTY_LOADOUT } from '../../domain/cosmetics';
import { accessoryFor, hasArt } from '.';

describe('accessoryFor', () => {
  it('has nothing for a player with no loadout, or nothing on', () => {
    expect(accessoryFor(undefined, 'whiskers')).toBeUndefined();
    expect(accessoryFor(EMPTY_LOADOUT, 'whiskers')).toBeUndefined();
  });
  it('has nothing for an accessory or breed that has no art', () => {
    expect(accessoryFor({ head: 'no-such-item', neck: null }, 'whiskers')).toBeUndefined();
    expect(accessoryFor({ head: 'hard-hat', neck: null }, 'no-such-breed')).toBeUndefined();
  });
});

describe('hasArt', () => {
  it('is false for an item with no files', () => expect(hasArt('no-such-item')).toBe(false));
});
