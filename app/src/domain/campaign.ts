import { SITES } from './sites';
import { CAMPAIGN_LEVELS, type CampaignClear, type CampaignStars, type HintTier, type PlaySet, type SiteResult } from './types';
import { keepBest } from './scoring';

export interface Chapter {
  /** 0-based position, which is also the position in `CHAPTERS` */
  index: number;
  /** the SITES entry that names the chapter */
  site: number;
  /** first and last level number, both inclusive */
  from: number;
  to: number;
}

/** Levels per chapter, one chapter per site; the later houses are bigger, so they get more levels. */
const CHAPTER_SIZES = [10, 12, 14, 14, 16, 16, 18] as const;

export const CHAPTERS: readonly Chapter[] = CHAPTER_SIZES.map((size, index) => {
  const from = CHAPTER_SIZES.slice(0, index).reduce((n, s) => n + s, 0) + 1;
  return { index, site: index, from, to: from + size - 1 };
});

/** What a campaign's clears look like in memory: best result per level number. */
export type CampaignClears = ReadonlyMap<number, CampaignClear>;

export const chapterOf = (levelNo: number): Chapter | null =>
  CHAPTERS.find(c => levelNo >= c.from && levelNo <= c.to) ?? null;

export const chapterSize = (ch: Chapter) => ch.to - ch.from + 1;
export const chapterName = (ch: Chapter) => SITES[ch.site];

/** A chapter as a run of levels the game screen can play through. */
export function chapterSet(ch: Chapter): PlaySet {
  return { count: chapterSize(ch), name: () => chapterName(ch), unitLabel: 'LEVEL', finishLabel: 'CHAPTER DONE' };
}

/** Stars for a cleared run: 1 for the clear, +1 on budget, +1 if INSIDER (tier 3) never tipped the player off. */
export function campaignStars(run: SiteResult | null, consulted: 0 | HintTier): CampaignStars {
  if (!run) return 0;
  return (1 + (run.used <= run.par ? 1 : 0) + (consulted < 3 ? 1 : 0)) as CampaignStars;
}

/** A replay only improves the record: better run, more stars. */
export function mergeClear(prev: CampaignClear | undefined, next: CampaignClear): CampaignClear {
  if (!prev) return next;
  return { levelNo: next.levelNo, run: keepBest(prev.run, next.run), campaignStars: Math.max(prev.campaignStars, next.campaignStars) as CampaignStars };
}

/** How many levels, counted from level 1 with no gap, have been cleared. */
function clearedPrefix(clears: CampaignClears): number {
  let n = 0;
  while (n < CAMPAIGN_LEVELS && clears.has(n + 1)) n++;
  return n;
}

/** The highest level number the player may open: the one after the last clear in an unbroken run from level 1. */
export const unlockedUpTo = (clears: CampaignClears) => Math.min(clearedPrefix(clears) + 1, CAMPAIGN_LEVELS);

export interface ChapterProgress { cleared: number; total: number; stars: number; maxStars: number; complete: boolean }

export function chapterProgress(clears: CampaignClears, ch: Chapter): ChapterProgress {
  let cleared = 0, stars = 0;
  for (let n = ch.from; n <= ch.to; n++) {
    const c = clears.get(n);
    if (c) { cleared++; stars += c.campaignStars; }
  }
  const total = chapterSize(ch);
  return { cleared, total, stars, maxStars: total * 3, complete: cleared === total };
}

/** Where the dashboard card sends the player: the first level they have not cleared yet. */
export function campaignHeadline(clears: CampaignClears): string {
  if (clearedPrefix(clears) >= CAMPAIGN_LEVELS) return `ALL ${CAMPAIGN_LEVELS} CLEARED`;
  const n = unlockedUpTo(clears);
  const ch = chapterOf(n) as Chapter;
  return `CHAPTER ${ch.index + 1} · LEVEL ${n - ch.from + 1}`;
}
