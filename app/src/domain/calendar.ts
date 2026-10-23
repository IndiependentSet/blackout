/** Day 1 of the weekly job sheet; everyone shares the same day number. */
export const DAY_EPOCH = Date.UTC(2026, 3, 15);
const MS_PER_DAY = 86_400_000;

/** When a puzzle day starts (UTC ms); the inverse of dayNumber() for days past 1. */
export function dayStartUtc(day: number): number {
  return DAY_EPOCH + day * MS_PER_DAY;
}

/** The puzzle day for a moment in time (never earlier than day 1). */
export function dayNumber(now: number = Date.now()): number {
  return Math.max(1, Math.floor((now - DAY_EPOCH) / MS_PER_DAY));
}

/** The seed every level of a given day is generated from. */
export function daySeed(day: number): number {
  return day + 11;
}

/** The duel season a puzzle day falls in: the calendar month (UTC) its start falls in. `season_start` in
    app/sql/2026-11-01-duel-ladder.sql is the same month; `daysLeft` counts the day itself. */
export function seasonOf(day: number): { month: number; year: number; daysLeft: number } {
  const start = new Date(dayStartUtc(day));
  const year = start.getUTCFullYear(), month = start.getUTCMonth();
  const next = Date.UTC(year, month + 1, 1);
  return { month, year, daysLeft: Math.max(1, Math.round((next - dayStartUtc(day)) / MS_PER_DAY)) };
}
