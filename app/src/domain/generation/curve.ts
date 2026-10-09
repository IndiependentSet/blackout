/* What a level pool is made from: a curve of tiers, each asking the generator
   for some number of levels of a size and difficulty. Campaign, survival and
   1vs1 pools are all curves; they differ in how the tiers are read (a
   campaign tier is a stretch of levels, a survival tier is how deep into a
   run you are, a 1vs1 tier is a difficulty). Plain JSON, like a schedule, so
   it is stored beside the pool it made. Pure. */
import { CHAPTERS, chapterSize } from '../campaign';
import type { PoolMode } from '../gameModes';
import { rngFromSeed } from '../rng';
import { CAMPAIGN_LEVELS, type GenOptions, type Stars } from '../types';
import { constraintFilter, type LevelConstraints } from './constraints';
import { generateWith } from './generate';
import { resolveOptions } from './options';
import { DEFAULT_SCHEDULE, type SiteOutcome } from './schedule';

export interface CurveTier {
  /** how many levels this tier contributes to the pool */
  count: number;
  /** target node count */
  size: number;
  diff: Stars;
  /** on top of DEFAULT_GEN */
  options: Partial<GenOptions>;
  constraints?: LevelConstraints;
}

export interface LevelCurve {
  version: 1;
  /** mixed into every level's seed: change it for a fresh set of the same shape */
  seed: number;
  /** fresh seeds a level tries before falling back */
  retries: number;
  tiers: CurveTier[];
  /** what a level settles for when every retry came back empty (at the tier's own size) */
  fallback: { diff: Stars; options: Partial<GenOptions> };
}

/** One level of a pool: its slot (campaign: the level number) and the tier that makes it. */
export interface PoolSlot { slot: number; tier: number }

const MAX_POOL = 400;

/** The slots a curve makes, in order. A campaign counts from level 1, the others from 0. */
export function poolSlots(mode: PoolMode, curve: LevelCurve): PoolSlot[] {
  const first = mode === 'campaign' ? 1 : 0;
  const out: PoolSlot[] = [];
  curve.tiers.forEach((t, tier) => {
    for (let i = 0; i < t.count; i++) out.push({ slot: first + out.length, tier });
  });
  return out;
}

/** The level for a slot, and which retry (or the fallback) produced it. Same curve and slot, same level
    (with the clock off): a pool is made once and frozen, so the clock budget does no harm here. */
export function generateSlot(curve: LevelCurve, { slot, tier }: PoolSlot): SiteOutcome {
  const rule = curve.tiers[tier];
  if (!rule) throw new RangeError(`no tier ${tier} in the curve`);
  const accept = constraintFilter(rule.constraints);
  for (let salt = 0; salt < curve.retries; salt++) {
    const rng = rngFromSeed(curve.seed * 7919 + slot * 104729 + salt * 31);
    const { level } = generateWith(rng, rule.size, rule.diff, rule.options, accept);
    if (level) return { level, salt };
  }
  const { level } = generateWith(rngFromSeed(curve.seed + slot), rule.size, curve.fallback.diff, curve.fallback.options);
  if (!level) throw new Error(`slot ${slot} produced no level, even with the fallback rules`);
  return { level, salt: null };
}

/** What a pool asks of a curve beyond what the generator accepts: its size for the mode, and, as for the
    daily week, a unique optimal cover on every level (the puzzle is deduced, and INSIDER assumes one answer). */
export function curveRuleErrors(mode: PoolMode, curve: LevelCurve): string[] {
  const errors: string[] = [];
  const total = curve.tiers.reduce((n, t) => n + t.count, 0);
  if (mode === 'campaign' && total !== CAMPAIGN_LEVELS) {
    errors.push(`curve.tiers: a campaign has ${CAMPAIGN_LEVELS} levels, the tiers add up to ${total}`);
  }
  if (total > MAX_POOL) errors.push(`curve.tiers: a pool holds at most ${MAX_POOL} levels, the tiers add up to ${total}`);
  const rules = [
    ...curve.tiers.map((t, i) => ({ path: `curve.tiers[${i}].options`, options: t.options })),
    { path: 'curve.fallback.options', options: curve.fallback.options },
  ];
  for (const r of rules) {
    if (resolveOptions(r.options).maxOptima !== 1) errors.push(`${r.path}.maxOptima: the game needs a unique optimal cover (1)`);
  }
  return errors;
}

const tierFrom = (i: number, count: number): CurveTier => ({ count, ...DEFAULT_SCHEDULE.sites[i] });
const FALLBACK = DEFAULT_SCHEDULE.fallback;

/** Where each pool starts from, until an admin publishes another. */
export const DEFAULT_CURVES: Record<PoolMode, LevelCurve> = {
  /* the seven chapters, with the daily week's difficulty ramp */
  campaign: { version: 1, seed: 1, retries: DEFAULT_SCHEDULE.retries, fallback: FALLBACK,
    tiers: CHAPTERS.map(c => tierFrom(c.site, chapterSize(c))) },
  /* a run starts small and deepens: step n plays tier n, the last tier once they run out */
  survival: { version: 1, seed: 1, retries: DEFAULT_SCHEDULE.retries, fallback: FALLBACK,
    tiers: [0, 1, 2, 3, 4].map(i => tierFrom(i, 6)) },
  /* a challenge picks a tier: a middling puzzle, or a hard one */
  match: { version: 1, seed: 1, retries: DEFAULT_SCHEDULE.retries, fallback: FALLBACK,
    tiers: [tierFrom(3, 10), tierFrom(5, 10)] },
};
