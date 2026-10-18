/* The game's week as data: what each site asks the generator for, how often it
   retries, and what it settles for. The admin-editable part of generation.
   The seed mixing below is not a setting: it is the "same puzzles for
   everyone" contract, so it stays fixed whatever the schedule says. Pure. */
import type { GenOptions, Level, Stars } from '../types';
import type { LevelConstraints } from './constraints';
import { constraintFilter, gameConstraints } from './constraints';
import { generateWith } from './generate';
import { rngFromSeed } from '../rng';

export interface SiteRule {
  /** target node count */
  size: number;
  diff: Stars;
  /** on top of DEFAULT_GEN */
  options: Partial<GenOptions>;
  constraints?: LevelConstraints;
}

export interface GenerationSchedule {
  version: 1;
  /** one per site, in site order */
  sites: SiteRule[];
  /** fresh seeds a site tries before falling back */
  retries: number;
  /** what a site settles for when every retry came back empty (at the site's own size) */
  fallback: { diff: Stars; options: Partial<GenOptions> };
}

/** The week the game plays: seven sites that climb from a five-junction warm-up to a forty-junction
    finale. Each one asks for more than the last: more junctions, more stars (the technique that
    clears it), a level the greedy cover gets wrong, and a par that cannot be reached by counting
    disjoint paths alone. The big sites get a longer search budget. */
export const DEFAULT_SCHEDULE: GenerationSchedule = {
  version: 1,
  sites: [
    { size: 5, diff: 1, options: { budgetMs: 400 }, constraints: { minNodes: 5, maxK: 2, hasDegree: 3 } },
    { size: 10, diff: 1, options: { budgetMs: 400 }, constraints: { minNodes: 10 } },
    { size: 16, diff: 2, options: { budgetMs: 600, greedyMustFail: true }, constraints: { minNodes: 16 } },
    { size: 22, diff: 2, options: { budgetMs: 1000, greedyMustFail: true }, constraints: { minNodes: 22 } },
    { size: 28, diff: 3, options: { minBoundGap: 1, budgetMs: 2000, greedyMustFail: true }, constraints: { minNodes: 28 } },
    { size: 34, diff: 3, options: { minBoundGap: 2, budgetMs: 3000, greedyMustFail: true }, constraints: { minNodes: 34 } },
    { size: 40, diff: 3, options: { minBoundGap: 2, budgetMs: 3000, greedyMustFail: true }, constraints: { minNodes: 40 } },
  ],
  retries: 8,
  fallback: { diff: 1, options: { budgetMs: 900 } },
};

/** How a site's level came about: which retry it settled on, or the fallback. */
export interface SiteOutcome {
  level: Level;
  /** the retry (0-based) that produced the level; null when the fallback did */
  salt: number | null;
}

/** The level a site gets on a given day, and which rule produced it. */
export function levelForSiteReport(schedule: GenerationSchedule, daySeed: number, idx: number): SiteOutcome {
  const site = schedule.sites[idx];
  if (!site) throw new RangeError(`no site ${idx} in the schedule`);
  const accept = constraintFilter(gameConstraints(site.constraints));
  /* a retry only counts when it met every rule; the first near miss is kept in case no retry does */
  let miss: SiteOutcome | null = null;
  for (let salt = 0; salt < schedule.retries; salt++) {
    const rng = rngFromSeed(daySeed * 7919 + idx * 104729 + salt * 31);
    const { level, report } = generateWith(rng, site.size, site.diff, site.options, accept);
    if (level && !report.fallback) return { level, salt };
    if (level && !miss) miss = { level, salt };
  }
  if (miss) return miss;
  const { level } = generateWith(rngFromSeed(daySeed + idx), site.size, schedule.fallback.diff, schedule.fallback.options,
    constraintFilter(gameConstraints()));
  if (!level) throw new Error(`site ${idx} produced no level, even with the fallback rules`);
  return { level, salt: null };
}

/** The level a site gets on a given day. */
export function levelForSite(schedule: GenerationSchedule, daySeed: number, idx: number): Level {
  return levelForSiteReport(schedule, daySeed, idx).level;
}

/** Every site's level for a day, in site order. */
export function levelsForDay(schedule: GenerationSchedule, daySeed: number): Level[] {
  return schedule.sites.map((_, i) => levelForSite(schedule, daySeed, i));
}
