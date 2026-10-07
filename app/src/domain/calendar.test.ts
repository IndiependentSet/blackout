import { describe, expect, it } from 'vitest';
import { DAY_EPOCH, dayNumber, daySeed, dayStartUtc } from './calendar';

describe('calendar', () => {
  it('never goes below day 1', () => expect(dayNumber(DAY_EPOCH - 5 * 86_400_000)).toBe(1));
  it('counts whole days from the epoch', () => {
    expect(dayNumber(DAY_EPOCH + 3 * 86_400_000 + 1000)).toBe(3);
  });
  it('knows when a day starts', () => {
    expect(dayNumber(dayStartUtc(176))).toBe(176);
    expect(dayNumber(dayStartUtc(176) - 1)).toBe(175);
  });
  it('seeds off the day', () => expect(daySeed(5)).toBe(16));
});
