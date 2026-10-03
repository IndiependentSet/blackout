import { describe, expect, it } from 'vitest';
import { DAY_EPOCH, dayNumber, daySeed } from './calendar';

describe('calendar', () => {
  it('never goes below day 1', () => expect(dayNumber(DAY_EPOCH - 5 * 86_400_000)).toBe(1));
  it('counts whole days from the epoch', () => {
    expect(dayNumber(DAY_EPOCH + 3 * 86_400_000 + 1000)).toBe(3);
  });
  it('seeds off the day', () => expect(daySeed(5)).toBe(16));
});
