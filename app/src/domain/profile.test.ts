import { describe, expect, it } from 'vitest';
import { cleanUsername, defaultUsername, displayName, initial } from './profile';

describe('profile helpers', () => {
  it('formats handles', () => {
    expect(displayName({ username: 'ann' })).toBe('@ann');
    expect(displayName(null)).toBe('');
  });
  it('cleans typed handles', () => expect(cleanUsername('Ab C-d_E9!!')).toBe('abcd_e9'));
  it('caps handle length', () => expect(cleanUsername('a'.repeat(30))).toHaveLength(16));
  it('derives a starting handle from an email', () => {
    expect(defaultUsername('Jane.Doe+x@mail.com')).toBe('jane_doe_x');
    expect(defaultUsername('a@b.c')).toBe('a00');
    expect(defaultUsername(null)).toBe('staff');
  });
  it('picks an avatar initial', () => {
    expect(initial({ username: 'zed' })).toBe('Z');
    expect(initial(null)).toBe('S');
  });
});
