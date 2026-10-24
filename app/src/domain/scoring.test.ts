import { describe, expect, it } from 'vitest';
import { keepBest, resultsFromClears, scoreRun, siteBest, siteGrade, siteScore, totalScore } from './scoring';

describe('siteScore', () => {
  it('pays stars x 10 on budget', () => expect(siteScore(3, 5, 5)).toBe(30));
  it('docks 5 per cat over par', () => expect(siteScore(3, 7, 5)).toBe(20));
  it('never goes below zero', () => expect(siteScore(1, 20, 2)).toBe(0));
  it('best is stars x 10', () => expect(siteBest(2)).toBe(20));
});

describe('siteGrade', () => {
  it.each([[30, 30, 'S'], [27, 30, 'A'], [21, 30, 'B'], [14, 30, 'C'], [5, 30, 'D'], [0, 0, 'D']] as const)(
    '%i/%i is %s', (score, best, grade) => expect(siteGrade(score, best)).toBe(grade));
});

describe('scoreRun', () => {
  it('is perfect on budget', () => {
    const r = scoreRun({ stars: 2, k: 4 }, 4);
    expect(r).toMatchObject({ status: 'perfect', score: 20, best: 20, grade: 'S', used: 4, par: 4 });
    expect(r.rows.map(x => x.label)).toEqual(['SITE DIFFICULTY', 'ON BUDGET']);
  });
  it('shows the penalty row when over budget', () => {
    const r = scoreRun({ stars: 2, k: 4 }, 5);
    expect(r.status).toBe('over');
    expect(r.score).toBe(15);
    expect(r.rows[1]).toEqual({ label: 'OVER BUDGET', note: '+1 CAT × 5', v: -5 });
  });
});

describe('keepBest / totalScore', () => {
  const lo = scoreRun({ stars: 2, k: 4 }, 5), hi = scoreRun({ stars: 2, k: 4 }, 4);
  it('keeps the better run', () => {
    expect(keepBest(hi, lo)).toBe(hi);
    expect(keepBest(lo, hi)).toBe(hi);
    expect(keepBest(null, lo)).toBe(lo);
  });
  it('sums scored sites only', () => expect(totalScore([hi, null, lo])).toBe(35));
});

describe('resultsFromClears', () => {
  it('puts each stored clear back in its site, scored as it was', () => {
    const out = resultsFromClears([{ site: 2, used: 4, par: 3, stars: 2 }, { site: 0, used: 3, par: 3, stars: 1 }], 7);
    expect(out).toHaveLength(7);
    expect(out[0]).toEqual(scoreRun({ stars: 1, k: 3 }, 3));
    expect(out[2]).toEqual(scoreRun({ stars: 2, k: 3 }, 4));
    expect(out[1]).toBeNull();
  });
  it('ignores sites outside the day and star counts the game never plays', () => {
    const out = resultsFromClears([{ site: 9, used: 3, par: 3, stars: 1 }, { site: 1, used: 3, par: 3, stars: 5 }], 7);
    expect(out.every(r => r === null)).toBe(true);
  });
});
