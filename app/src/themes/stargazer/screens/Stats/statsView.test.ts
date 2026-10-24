import { describe, expect, it } from 'vitest';
import { parseStats } from '../../../../domain/stats';
import { statsView } from './statsView';

const played = parseStats({
  nights: { played: 12, perfect: 3, skies: 80, at_par: 64, points: 1500, best_points: 110 },
  streak: { current: 4, best: 9 },
  voyage: { levels: 20, stars: 41, at_par: 15 },
  rush: { runs: 5, best_sites: 9, best_score: 210, total_sites: 31 },
  duel: { rating: 1042, games: 8, peak: 1070, season_gain: 31, season_games: 5, played: 11, won: 6, lost: 4, drawn: 1 },
});

describe('statsView', () => {
  it('reads the nights', () => {
    const v = statsView(played, 'nights');
    expect(v.hero).toBe('12');
    expect(v.heroSub).toBe('3 perfect nights · streak 4, best 9');
    expect(v.rows[1]).toEqual(['Skies at par', '80%']);
    expect(v.rows[3]).toEqual(['Best night', '110']);
    expect(v.kinds).toEqual(['week', 'night', 'alltime']);
  });

  it('reads the voyage and names the world they are on', () => {
    const v = statsView(played, 'voyage');
    expect(v.hero).toBe('20 / 100');
    expect(v.heroSub).toMatch(/^Now on \S/);
    expect(v.rows).toEqual([['Stars earned', '41 of 300'], ['Levels at par', '75%']]);
  });

  it('reads Meteor Rush, and says so before the first run', () => {
    const v = statsView(played, 'rush');
    expect(v.hero).toBe('9 skies');
    expect(v.rows[0]).toEqual(['Runs played', '5']);
    const none = statsView(parseStats({}), 'rush');
    expect(none.empty).toMatch(/No runs yet/);
    expect(none.rows).toEqual([]);
    expect(none.tone).toBe('mars');
  });

  it('reads the duels', () => {
    const v = statsView(played, 'duel');
    expect(v.hero).toBe('1042');
    expect(v.heroSub).toBe('Peak 1070 · +31 this month');
    expect(v.rows).toEqual([['Ranked duels', '8'], ['Won · lost · tied', '6 · 4 · 1'], ['Win rate', '55%']]);
    expect(v.kinds).toEqual(['duel', 'season']);
    expect(statsView(parseStats({}), 'duel').empty).toMatch(/No duels yet/);
  });
});
