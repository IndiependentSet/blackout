/* The game's week as data: what each site asks the generator for, how often it
   retries, and what it settles for. The admin-editable part of generation.
   The seed mixing below is not a setting: it is the "same puzzles for
   everyone" contract, so it stays fixed whatever the schedule says. Pure. */
import type { GenOptions, Level, Stars } from '../types';
import type { LevelConstraints } from './constraints';
import { constraintFilter } from './constraints';
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

/** The week the game has always played: the difficulty ramp, a longer search
    budget for the big sites, and a gentle first site. */
export const DEFAULT_SCHEDULE: GenerationSchedule = {
  version: 1,
  sites: [
    { size: 4, diff: 1, options: { budgetMs: 400 }, constraints: { minNodes: 4, maxK: 2, hasDegree: 3 } },
    { size: 7, diff: 1, options: { budgetMs: 400 } },
    { size: 10, diff: 2, options: { budgetMs: 400 } },
    { size: 14, diff: 2, options: { budgetMs: 400 } },
    { size: 18, diff: 3, options: { budgetMs: 700 } },
    { size: 24, diff: 3, options: { budgetMs: 700 } },
    { size: 30, diff: 3, options: { budgetMs: 700 } },
  ],
  retries: 6,
  fallback: { diff: 1, options: { budgetMs: 900 } },
};

/** The level a site gets on a given day. */
export function levelForSite(schedule: GenerationSchedule, daySeed: number, idx: number): Level {
  const site = schedule.sites[idx];
  if (!site) throw new RangeError(`no site ${idx} in the schedule`);
  const accept = constraintFilter(site.constraints);
  for (let salt = 0; salt < schedule.retries; salt++) {
    const rng = rngFromSeed(daySeed * 7919 + idx * 104729 + salt * 31);
    const { level } = generateWith(rng, site.size, site.diff, site.options, accept);
    if (level) return level;
  }
  const { level } = generateWith(rngFromSeed(daySeed + idx), site.size, schedule.fallback.diff, schedule.fallback.options);
  if (!level) throw new Error(`site ${idx} produced no level, even with the fallback rules`);
  return level;
}

/** Every site's level for a day, in site order. */
export function levelsForDay(schedule: GenerationSchedule, daySeed: number): Level[] {
  return schedule.sites.map((_, i) => levelForSite(schedule, daySeed, i));
}
