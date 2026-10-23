import { describe, expect, it } from 'vitest';
import { draftValue, settleDraft, tidyDraft } from './numDraft';

describe('tidyDraft', () => {
  it('drops leading zeros but keeps a lone zero and decimals', () => {
    expect(tidyDraft('05')).toBe('5');
    expect(tidyDraft('007')).toBe('7');
    expect(tidyDraft('-03')).toBe('-3');
    expect(tidyDraft('0')).toBe('0');
    expect(tidyDraft('0.5')).toBe('0.5');
    expect(tidyDraft('')).toBe('');
  });
});

describe('draftValue', () => {
  it('is null while the box is empty or out of range', () => {
    expect(draftValue('', 0)).toBeNull();
    expect(draftValue('1', 5, 20)).toBeNull();
    expect(draftValue('25', 5, 20)).toBeNull();
  });
  it('reads a number in range', () => {
    expect(draftValue('12', 5, 20)).toBe(12);
    expect(draftValue('0', 0)).toBe(0);
    expect(draftValue('2.5', 1, 5)).toBe(2.5);
  });
});

describe('settleDraft', () => {
  it('clamps into range and falls back when empty', () => {
    expect(settleDraft('1', 9, 5, 20)).toBe(5);
    expect(settleDraft('99', 9, 5, 20)).toBe(20);
    expect(settleDraft('', 9, 5, 20)).toBe(9);
    expect(settleDraft('12', 9, 5, 20)).toBe(12);
  });
});
