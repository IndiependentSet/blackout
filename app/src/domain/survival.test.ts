import { describe, expect, it } from 'vitest';
import { scoreRun } from './scoring';
import { betterRun, formatClock, isOver, mergeBest, remainingMs, runSummary, SURVIVAL_LIMIT_MS, survivalHeadline, type RunSummary } from './survival';

const run = (used: number, k = 3, stars = 2) => scoreRun({ stars: stars as 1 | 2 | 3, k }, used);

describe('remainingMs / isOver', () => {
  it('counts down from the limit and stops at zero', () => {
    expect(remainingMs(1000, 1000)).toBe(SURVIVAL_LIMIT_MS);
    expect(remainingMs(1000, 1000 + 60_000)).toBe(SURVIVAL_LIMIT_MS - 60_000);
    expect(remainingMs(1000, 1000 + SURVIVAL_LIMIT_MS)).toBe(0);
    expect(remainingMs(1000, 1000 + SURVIVAL_LIMIT_MS + 5_000)).toBe(0);
  });

  it('never runs past the full limit if the clock reads earlier than the start', () => {
    expect(remainingMs(5000, 1000)).toBe(SURVIVAL_LIMIT_MS);
  });

  it('is over exactly when nothing is left', () => {
    expect(isOver(0, SURVIVAL_LIMIT_MS - 1)).toBe(false);
    expect(isOver(0, SURVIVAL_LIMIT_MS)).toBe(true);
  });

  it('takes its limit as an argument', () => {
    expect(remainingMs(0, 4_000, 10_000)).toBe(6_000);
    expect(isOver(0, 10_000, 10_000)).toBe(true);
  });
});

describe('formatClock', () => {
  it.each([
    [180_000, '3:00'], [179_001, '3:00'], [179_000, '2:59'], [61_000, '1:01'], [9_500, '0:10'], [1, '0:01'], [0, '0:00'], [-5, '0:00'],
  ])('%i ms reads %s', (ms, text) => expect(formatClock(ms)).toBe(text));
});

describe('runSummary', () => {
  it('counts sites and on-budget sites, and adds up the scores', () => {
    const results = [run(3), run(4), run(3)];
    expect(runSummary(results)).toEqual({ sites: 3, perfect: 2, score: results[0].score + results[1].score + results[2].score });
  });

  it('values a site cleared over budget below one on budget', () => {
    expect(runSummary([run(4)]).score).toBeLessThan(runSummary([run(3)]).score);
  });

  it('is empty for a run that cleared nothing', () => {
    expect(runSummary([])).toEqual({ sites: 0, perfect: 0, score: 0 });
  });
});

describe('betterRun', () => {
  const a: RunSummary = { sites: 3, perfect: 2, score: 40 };

  it('takes the first run it sees', () => expect(betterRun(null, a)).toBe(a));
  it('prefers more sites', () => {
    const more: RunSummary = { sites: 4, perfect: 0, score: 10 };
    expect(betterRun(a, more)).toBe(more);
    expect(betterRun(more, a)).toBe(more);
  });
  it('breaks a tie on score, and keeps the earlier run on a full tie', () => {
    const richer: RunSummary = { sites: 3, perfect: 1, score: 55 };
    expect(betterRun(a, richer)).toBe(richer);
    expect(betterRun(a, { ...a })).toBe(a);
  });
});

describe('survivalHeadline', () => {
  it('is empty until a site has been flattened', () => {
    expect(survivalHeadline(null)).toBeNull();
    expect(survivalHeadline({ sites: 0, perfect: 0, score: 0 })).toBeNull();
  });

  it('names the best run', () => {
    expect(survivalHeadline({ sites: 1, perfect: 1, score: 20 })).toBe('BEST: 1 SITE · 20 PTS');
    expect(survivalHeadline({ sites: 5, perfect: 3, score: 1200 })).toBe(`BEST: 5 SITES · ${(1200).toLocaleString()} PTS`);
  });
});

describe('mergeBest', () => {
  const small: RunSummary = { sites: 2, perfect: 2, score: 40 };
  const big: RunSummary = { sites: 5, perfect: 3, score: 90 };

  it('is whichever record exists when the other is missing', () => {
    expect(mergeBest(null, null)).toBeNull();
    expect(mergeBest(small, null)).toBe(small);
    expect(mergeBest(null, big)).toBe(big);
  });

  it('takes the server record over a smaller session run, and the session run over a smaller record', () => {
    expect(mergeBest(small, big)).toBe(big);
    expect(mergeBest(big, small)).toBe(big);
  });
});
