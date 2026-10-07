/* The badges a player can earn. The server awards them (app/sql/2026-10-16-badges.sql) and this is the
   client's one list of ids, names and descriptions: badges.test.ts holds it to the seed in that file. */

export type BadgeId =
  | 'purrfect-shift' | 'streak-7' | 'streak-30' | 'chapter-clear' | 'campaign-3-stars' | 'first-duel-win';

export interface BadgeInfo { id: BadgeId; name: string; description: string }

export const BADGES: readonly BadgeInfo[] = [
  { id: 'purrfect-shift', name: 'PURR-FECT SHIFT', description: 'Cleared all seven sites of one day on budget.' },
  { id: 'streak-7', name: 'WEEK ON THE JOB', description: 'Cleared at least one site seven days in a row.' },
  { id: 'streak-30', name: 'LIFER', description: 'Cleared at least one site thirty days in a row.' },
  { id: 'chapter-clear', name: 'SITE FOREMAN', description: 'Cleared every level of a campaign chapter.' },
  { id: 'campaign-3-stars', name: 'CLEAN SWEEP', description: 'Finished a campaign level with all three stars.' },
  { id: 'first-duel-win', name: 'FIRST BLOOD', description: 'Won a 1vs1 match.' },
];

/** A badge a player holds, as the server records it. */
export interface EarnedBadge { id: string; earnedAt: string }

/** The held badges as catalogue entries, in catalogue order. An id the catalogue doesn't know (the server is newer than this build) is left out. */
export function heldBadges(earned: readonly EarnedBadge[]): BadgeInfo[] {
  const held = new Set(earned.map(b => b.id));
  return BADGES.filter(b => held.has(b.id));
}
