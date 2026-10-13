/* The 1vs1 rating: Elo, as the ladder keeps it. `elo_next` in app/sql/2026-10-22-ranked-matches.sql is the
   authority (the server applies the change when a ranked match ends); this mirrors it so the lobby can say what a
   win or a loss would be worth, and a test holds the two to the same numbers. Pure. */
import type { LadderRow, MatchPlayer } from './types';

export const RATING_START = 1000;
export const RATING_FLOOR = 100;
export const ELO_K = 32;

/** The share of a game the first player is expected to win, 0..1. */
export const expectedScore = (rating: number, opponent: number): number =>
  1 / (1 + 10 ** ((opponent - rating) / 400));

/** The rating after one game: `score` is 1 for a win, 0.5 for a draw, 0 for a loss. */
export const nextRating = (rating: number, opponent: number, score: 0 | 0.5 | 1): number =>
  Math.max(RATING_FLOOR, Math.round(rating + ELO_K * (score - expectedScore(rating, opponent))));

/** How a player's rating moved in a finished ranked match, or null for an unranked match or one still going. */
export function ratingChange(p: Pick<MatchPlayer, 'rating_before' | 'rating_after'> | undefined): { before: number; after: number; delta: number } | null {
  if (!p || p.rating_before === null || p.rating_after === null) return null;
  return { before: p.rating_before, after: p.rating_after, delta: p.rating_after - p.rating_before };
}

/** "+16", "-9" or "±0". */
export const signed = (n: number): string => (n > 0 ? '+' + n : n < 0 ? '\u2212' + Math.abs(n) : '\u00b10');

/** The ladder in order: rating, then more games (a rating earned over more matches), then name for a stable tie. */
export function sortLadder(rows: readonly LadderRow[]): LadderRow[] {
  return rows.slice().sort((a, b) => b.rating - a.rating || b.games - a.games || (a.username ?? '').localeCompare(b.username ?? ''));
}
