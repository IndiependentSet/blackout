import { describe, expect, it } from 'vitest';
import {
  CHAPTERS, campaignHeadline, campaignStars, chapterName, chapterOf, chapterProgress, chapterSet, mergeClear, unlockedUpTo,
  type CampaignClears,
} from './campaign';
import { scoreRun } from './scoring';
import { SITES, SITE_COUNT } from './sites';
import { CAMPAIGN_LEVELS, type CampaignClear, type CampaignStars } from './types';

const lv = { stars: 2 as const, k: 3 };
const clear = (levelNo: number, used = 3, stars: CampaignStars = 3): CampaignClear => ({ levelNo, run: scoreRun(lv, used), campaignStars: stars });
const clearsOf = (...nos: number[]): CampaignClears => new Map(nos.map(n => [n, clear(n)]));
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe('chapters', () => {
  it('has one chapter per site and 100 levels in all', () => {
    expect(CHAPTERS).toHaveLength(SITE_COUNT);
    expect(CHAPTERS[CHAPTERS.length - 1].to).toBe(CAMPAIGN_LEVELS);
  });

  it('covers levels 1..100 with no gap and no overlap', () => {
    expect(CHAPTERS[0].from).toBe(1);
    CHAPTERS.forEach((c, i) => {
      expect(c.index).toBe(i);
      expect(c.to).toBeGreaterThanOrEqual(c.from);
      if (i > 0) expect(c.from).toBe(CHAPTERS[i - 1].to + 1);
    });
  });

  it('finds the chapter of a level, edges included', () => {
    for (const c of CHAPTERS) {
      expect(chapterOf(c.from)).toBe(c);
      expect(chapterOf(c.to)).toBe(c);
    }
    expect(chapterOf(0)).toBeNull();
    expect(chapterOf(CAMPAIGN_LEVELS + 1)).toBeNull();
  });

  it('names a chapter after its site and describes it as a set of levels', () => {
    expect(chapterName(CHAPTERS[2])).toBe(SITES[2]);
    const set = chapterSet(CHAPTERS[0]);
    expect(set).toMatchObject({ count: 10, unitLabel: 'LEVEL', finishLabel: 'CHAPTER DONE' });
    expect(set.name(0)).toBe(SITES[0]);
  });
});

describe('campaignStars', () => {
  const run = (used: number) => scoreRun(lv, used);
  it('gives nothing without a clear', () => expect(campaignStars(null, 0)).toBe(0));
  it('gives three for a budget clear with no INSIDER', () => expect(campaignStars(run(3), 0)).toBe(3));
  it('keeps the third star through the first two hint tiers', () => {
    expect(campaignStars(run(3), 1)).toBe(3);
    expect(campaignStars(run(3), 2)).toBe(3);
  });
  it('takes the third star for INSIDER', () => expect(campaignStars(run(3), 3)).toBe(2));
  it('takes the budget star when over par', () => {
    expect(campaignStars(run(4), 0)).toBe(2);
    expect(campaignStars(run(4), 3)).toBe(1);
  });
});

describe('unlockedUpTo', () => {
  it('opens level 1 for a new player', () => expect(unlockedUpTo(new Map())).toBe(1));
  it('opens the level after the last clear', () => expect(unlockedUpTo(clearsOf(1, 2, 3))).toBe(4));
  it('stops at the first gap', () => expect(unlockedUpTo(clearsOf(1, 2, 4, 5))).toBe(3));
  it('does not open level 2 for a clear of level 2 alone', () => expect(unlockedUpTo(clearsOf(2))).toBe(1));
  it('is unchanged by replaying a cleared level', () => {
    const once = clearsOf(1, 2, 3);
    const replay = new Map(once).set(2, clear(2, 5, 1));
    expect(unlockedUpTo(replay)).toBe(unlockedUpTo(once));
  });
  it('never goes past the last level', () => expect(unlockedUpTo(clearsOf(...range(1, CAMPAIGN_LEVELS)))).toBe(CAMPAIGN_LEVELS));
});

describe('chapterProgress', () => {
  it('counts clears and stars inside the chapter only', () => {
    const [first, second] = CHAPTERS;
    const clears = clearsOf(...range(first.from, first.to), second.from);
    expect(chapterProgress(clears, first)).toEqual({ cleared: 10, total: 10, stars: 30, maxStars: 30, complete: true });
    expect(chapterProgress(clears, second)).toMatchObject({ cleared: 1, total: 12, stars: 3, complete: false });
  });
});

describe('mergeClear', () => {
  it('keeps the better run and the most stars', () => {
    const merged = mergeClear(clear(1, 3, 3), clear(1, 5, 1));
    expect(merged.run.used).toBe(3);
    expect(merged.campaignStars).toBe(3);
    const better = mergeClear(clear(1, 5, 1), clear(1, 3, 2));
    expect(better.run.used).toBe(3);
    expect(better.campaignStars).toBe(2);
  });
  it('takes the first clear as it is', () => {
    const first = clear(7);
    expect(mergeClear(undefined, first)).toBe(first);
  });
});

describe('campaignHeadline', () => {
  it('starts at chapter 1, level 1', () => expect(campaignHeadline(new Map())).toBe('CHAPTER 1 · LEVEL 1'));
  it('rolls into the next chapter', () => {
    const [first] = CHAPTERS;
    expect(campaignHeadline(clearsOf(...range(1, first.to - 1)))).toBe(`CHAPTER 1 · LEVEL ${first.to}`);
    expect(campaignHeadline(clearsOf(...range(1, first.to)))).toBe('CHAPTER 2 · LEVEL 1');
  });
  it('says so when everything is cleared', () => {
    expect(campaignHeadline(clearsOf(...range(1, CAMPAIGN_LEVELS)))).toBe('ALL 100 CLEARED');
  });
});
