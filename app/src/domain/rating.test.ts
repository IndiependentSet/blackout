import { describe, expect, it } from 'vitest';
import type { LadderRow } from './types';
import { ELO_K, RATING_FLOOR, RATING_START, expectedScore, nextRating, ratingChange, signed, sortLadder } from './rating';

describe('Elo', () => {
  it('expects an even game between equals', () => {
    expect(expectedScore(1000, 1000)).toBe(0.5);
  });
  it('moves equals by half of K, as elo_next does in SQL', () => {
    expect(nextRating(RATING_START, RATING_START, 1)).toBe(RATING_START + ELO_K / 2);
    expect(nextRating(RATING_START, RATING_START, 0)).toBe(RATING_START - ELO_K / 2);
    expect(nextRating(RATING_START, RATING_START, 0.5)).toBe(RATING_START);
  });
  it('pays more for beating a stronger player than a weaker one', () => {
    const up = nextRating(1000, 1400, 1) - 1000;
    const down = nextRating(1400, 1000, 1) - 1400;
    expect(up).toBeGreaterThan(down);
    expect(up).toBe(29);   // 32 * (1 - 1 / (1 + 10^1)) rounded
  });
  it('is zero-sum between two players', () => {
    const a = nextRating(1200, 1000, 1), b = nextRating(1000, 1200, 0);
    expect(a - 1200 + (b - 1000)).toBe(0);
  });
  it('never drops below the floor', () => {
    expect(nextRating(RATING_FLOOR, 2000, 0)).toBe(RATING_FLOOR);
  });
});

describe('ratingChange', () => {
  it('reads a finished ranked match', () => {
    expect(ratingChange({ rating_before: 1000, rating_after: 1016 })).toEqual({ before: 1000, after: 1016, delta: 16 });
  });
  it('is null for an unranked or unfinished one', () => {
    expect(ratingChange({ rating_before: null, rating_after: null })).toBeNull();
    expect(ratingChange(undefined)).toBeNull();
  });
});

describe('signed', () => {
  it('shows the sign, with a real minus', () => {
    expect(signed(16)).toBe('+16');
    expect(signed(-9)).toBe('−9');
    expect(signed(0)).toBe('±0');
  });
});

describe('sortLadder', () => {
  const row = (username: string, rating: number, games: number): LadderRow => ({ user_id: username, username, rating, games, won: 0, lost: 0, drawn: 0 });
  it('puts the highest rating first, then more games, then name', () => {
    const out = sortLadder([row('b', 1000, 3), row('a', 1000, 3), row('c', 1100, 1), row('d', 1000, 9)]);
    expect(out.map(r => r.username)).toEqual(['c', 'd', 'a', 'b']);
  });
  it('does not touch its input', () => {
    const rows = [row('b', 1, 1), row('a', 2, 1)];
    sortLadder(rows);
    expect(rows.map(r => r.username)).toEqual(['b', 'a']);
  });
});
