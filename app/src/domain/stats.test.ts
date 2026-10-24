import { describe, expect, it } from 'vitest';
import { hasPlayed, parseStats, percent, sparkPoints } from './stats';

const full = {
  nights: { played: 12, perfect: 3, skies: 80, at_par: 64, points: 1500, best_points: 110, first_day: 150 },
  streak: { current: 4, best: 9 },
  voyage: { levels: 20, stars: 41, at_par: 15, points: 600 },
  rush: { runs: 5, best_sites: 9, best_score: 210, total_sites: 31 },
  duel: { rating: 1042, games: 8, peak: 1070, season_gain: 31, season_games: 5, played: 11, won: 6, lost: 4, drawn: 1, form: ['won', 'lost', 'won'], history: [1000, 1016, 1042] },
};

describe('parseStats', () => {
  it('reads every field the server sends', () => {
    const s = parseStats(full);
    expect(s.nights).toEqual({ played: 12, perfect: 3, skies: 80, atPar: 64, points: 1500, bestPoints: 110, firstDay: 150 });
    expect(s.streak).toEqual({ current: 4, best: 9 });
    expect(s.voyage).toEqual({ levels: 20, stars: 41, atPar: 15, points: 600 });
    expect(s.rush).toEqual({ runs: 5, bestSites: 9, bestScore: 210, totalSites: 31 });
    expect(s.duel).toMatchObject({ rating: 1042, games: 8, peak: 1070, seasonGain: 31, seasonGames: 5, played: 11, won: 6, lost: 4, drawn: 1, form: ['won', 'lost', 'won'], history: [1000, 1016, 1042] });
  });
  it('reads anything missing or malformed as zero, never throwing', () => {
    for (const raw of [null, undefined, 'x', [], {}, { nights: 3, duel: { form: 'won', history: [1, 'a', null] } }]) {
      const s = parseStats(raw);
      expect(s.nights.skies).toBe(0);
      expect(s.duel.rating).toBeNull();
      expect(s.duel.form).toEqual([]);
    }
    expect(parseStats({ duel: { history: [1, 'a', null, 2] } }).duel.history).toEqual([1, 2]);
  });
  it('drops a result it does not know', () => {
    expect(parseStats({ duel: { form: ['won', 'void', 'lost'] } }).duel.form).toEqual(['won', 'lost']);
  });
});

describe('percent', () => {
  it('rounds, and has no answer without a whole', () => {
    expect(percent(64, 80)).toBe(80);
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBeNull();
  });
});

describe('hasPlayed', () => {
  it('is false for a new player and true after any mode', () => {
    expect(hasPlayed(parseStats({}))).toBe(false);
    expect(hasPlayed(parseStats({ rush: { runs: 1 } }))).toBe(true);
    expect(hasPlayed(parseStats({ duel: { played: 1 } }))).toBe(true);
  });
});

describe('sparkPoints', () => {
  it('puts the lowest value at the bottom and the highest at the top, first to last across the width', () => {
    expect(sparkPoints([10, 30, 20], 100, 40)).toEqual([[0, 40], [50, 0], [100, 20]]);
  });
  it('is a flat middle line for equal values, a dot for one, nothing for none', () => {
    expect(sparkPoints([5, 5], 10, 10)).toEqual([[0, 5], [10, 5]]);
    expect(sparkPoints([7], 10, 10)).toEqual([[5, 5]]);
    expect(sparkPoints([], 10, 10)).toEqual([]);
  });
});
