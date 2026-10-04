/** Day 1 of the weekly job sheet; everyone shares the same day number. */
export const DAY_EPOCH = Date.UTC(2026, 3, 15);
const MS_PER_DAY = 86_400_000;

/** The puzzle day for a moment in time (never earlier than day 1). */
export function dayNumber(now: number = Date.now()): number {
  return Math.max(1, Math.floor((now - DAY_EPOCH) / MS_PER_DAY));
}

/** The seed every level of a given day is generated from. */
export function daySeed(day: number): number {
  return day + 11;
}
