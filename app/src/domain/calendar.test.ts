import { describe, expect, it } from 'vitest';
import { DAY_EPOCH, dayNumber, daySeed, dayStartUtc, seasonOf } from './calendar';

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

describe('seasonOf', () => {
  const dayOf = (y: number, m: number, d: number) => Math.round((Date.UTC(y, m, d) - DAY_EPOCH) / 86_400_000);
  it('is the calendar month the day starts in, and counts the days left including that day', () => {
    expect(seasonOf(dayOf(2026, 9, 23))).toEqual({ month: 9, year: 2026, daysLeft: 9 });
    expect(seasonOf(dayOf(2026, 9, 31))).toEqual({ month: 9, year: 2026, daysLeft: 1 });
    expect(seasonOf(dayOf(2026, 10, 1))).toEqual({ month: 10, year: 2026, daysLeft: 30 });
  });
  it('rolls over a year', () => {
    expect(seasonOf(dayOf(2026, 11, 31))).toEqual({ month: 11, year: 2026, daysLeft: 1 });
    expect(seasonOf(dayOf(2027, 0, 1))).toEqual({ month: 0, year: 2027, daysLeft: 31 });
  });
});
