/* What a level pool is made from: a curve of tiers, each asking the generator
   for some number of levels of a size and difficulty. Campaign, survival and
   1vs1 pools are all curves; they differ in how the tiers are read (a
   campaign tier is one level of the ramp, a survival tier is how deep into a
   run you are, a 1vs1 tier is a difficulty). Plain JSON, like a schedule, so
   it is stored beside the pool it made. Pure. */
import type { PoolMode } from '../gameModes';
import { shapeKey } from '../graphIdentity';
import { rngFromSeed } from '../rng';
import { CAMPAIGN_LEVELS, type GenOptions, type Level, type SkyFigure, type Stars } from '../types';
import { constraintFilter, gameConstraints, type LevelConstraints } from './constraints';
import { generateWith } from './generate';
import { compareHardness } from './hardness';
import { checkFigure, levelFromFigure } from './manual';
import { MAX_LEVEL_NODES, resolveOptions } from './options';
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
  /** hand-drawn skies: when present the tier generates nothing and plays these, one per level, in order
      (`count` is their number); size, diff, options and constraints are kept for switching back */
  manual?: SkyFigure[];
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
export interface PoolSlot {
  slot: number;
  tier: number;
  /** the level's place within its tier (poolSlots fills it in; a hand-drawn tier needs it to pick its drawing) */
  index?: number;
}

const MAX_POOL = 400;

/** The slots a curve makes, in order. A campaign counts from level 1, the others from 0. */
export function poolSlots(mode: PoolMode, curve: LevelCurve): PoolSlot[] {
  const first = mode === 'campaign' ? 1 : 0;
  const out: PoolSlot[] = [];
  curve.tiers.forEach((t, tier) => {
    for (let i = 0; i < t.count; i++) out.push({ slot: first + out.length, tier, index: i });
  });
  return out;
}

/** What two levels of a pool are compared by: the abstract graph (graphIdentity's shapeKey), so the same sky
    drawn somewhere else on the lattice still counts as the same. */
export const poolKey = (level: Level): string => shapeKey(level).key;

/** A slot's level, with its pool key, and whether it repeats a level already in the pool (only when nothing
    else could be found: every retry and the fallback came out as graphs the pool already has). */
export interface SlotOutcome extends SiteOutcome { key: string; duplicate: boolean; manual?: boolean }

const NONE: ReadonlySet<string> = new Set();

/** The level for a slot, and which retry (or the fallback) produced it. Same curve, slot and `avoid`, same level
    (with the clock off): a pool is made once and frozen, so the clock budget does no harm here.
    `avoid` holds the keys (poolKey) of the levels already in the pool: a retry that comes out as one of them is
    passed over like a near miss, so a pool never holds the same sky twice. Built slot by slot, in order. */
export function generateSlot(curve: LevelCurve, { slot, tier, index }: PoolSlot, avoid: ReadonlySet<string> = NONE): SlotOutcome {
  const rule = curve.tiers[tier];
  if (!rule) throw new RangeError(`no tier ${tier} in the curve`);
  if (rule.manual) return manualSlot(rule.manual, { slot, tier, index }, avoid);
  const accept = constraintFilter(gameConstraints(rule.constraints));
  /* a retry only counts when it met every rule and is new to the pool; the first near miss is kept in case no
     retry is, and the first repeat in case nothing else turns up at all */
  let miss: SlotOutcome | null = null;
  let repeat: SlotOutcome | null = null;
  for (let salt = 0; salt < curve.retries; salt++) {
    const rng = rngFromSeed(curve.seed * 7919 + slot * 104729 + salt * 31);
    const { level, report } = generateWith(rng, rule.size, rule.diff, rule.options, accept);
    if (!level) continue;
    const key = poolKey(level);
    if (avoid.has(key)) { repeat ??= { level, salt, key, duplicate: true }; continue; }
    if (!report.fallback) return { level, salt, key, duplicate: false };
    miss ??= { level, salt, key, duplicate: false };
  }
  if (miss) return miss;
  const { level } = generateWith(rngFromSeed(curve.seed + slot), rule.size, curve.fallback.diff, curve.fallback.options,
    constraintFilter(gameConstraints()));
  if (level) {
    const key = poolKey(level);
    if (!avoid.has(key)) return { level, salt: null, key, duplicate: false };
    repeat ??= { level, salt: null, key, duplicate: true };
  }
  if (repeat) return repeat;
  throw new Error(`slot ${slot} produced no level, even with the fallback rules`);
}

/* A hand-drawn tier's level: the slot's place in its tier picks the drawing. No RNG, no retries. */
function manualSlot(figures: readonly SkyFigure[], { slot, tier, index }: PoolSlot, avoid: ReadonlySet<string>): SlotOutcome {
  const fig = index === undefined ? undefined : figures[index];
  if (!fig) throw new RangeError(`tier ${tier + 1} has no hand-drawn sky for slot ${slot}`);
  const level = levelFromFigure(fig);
  const key = poolKey(level);
  return { level, salt: null, key, duplicate: avoid.has(key), manual: true };
}

/** A campaign's levels laid out easiest first. The ramp aims each slot a little above the one before, but every
    level is generated on its own seed, so neighbours can land the wrong way round. This hands the generated levels
    back to the slots in order of measured hardness (domain/generation/hardness.ts), which is what makes every level
    harder than the last. A slot keeps its number and tier; the level moves, with whatever was learned about it
    (retry, uniqueness check, time). A hand-drawn level (`manual`) stays where the admin put it: only the generated
    ones are re-ranked, among the slots generated levels hold. */
export function orderByHardness<T extends { slot: number; tier: number; level: Level; manual?: boolean }>(results: readonly T[]): T[] {
  const ranked = results.filter(r => !r.manual).sort((a, b) => compareHardness(a.level, b.level) || a.slot - b.slot);
  let next = 0;
  return results.map(r => (r.manual ? r : { ...ranked[next++], slot: r.slot, tier: r.tier }));
}

/** What a pool asks of a curve beyond what the generator accepts: its size for the mode, and, as for the
    daily week, a unique optimal cover on every level (the puzzle is deduced, and INSIDER assumes one answer). */
export function curveRuleErrors(mode: PoolMode, curve: LevelCurve): string[] {
  const errors: string[] = [];
  const total = curve.tiers.reduce((n, t) => n + t.count, 0);
  if (mode === 'campaign' && total !== CAMPAIGN_LEVELS) {
    errors.push(`curve.tiers: a campaign has ${CAMPAIGN_LEVELS} levels, the tiers add up to ${total}`);
  }
  curve.tiers.forEach((t, i) => {
    if (t.size > MAX_LEVEL_NODES) errors.push(`curve.tiers[${i}].size: the game plays at most ${MAX_LEVEL_NODES} junctions`);
    if (!t.manual) return;
    if (t.manual.length !== t.count) errors.push(`curve.tiers[${i}].manual: ${t.manual.length} hand-drawn skies for ${t.count} levels`);
    t.manual.forEach((fig, j) => {
      const c = checkFigure(fig);
      if (c.errors.length) errors.push(`curve.tiers[${i}].manual[${j}]: ${c.errors.join(' ')}`);
      else if (!c.playable) errors.push(`curve.tiers[${i}].manual[${j}]: ${c.optima} best answers, the game needs exactly one`);
    });
  });
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

/* a run plays one level of each tier, then walks the last one without repeats (pool_pick): its size is how deep a
   run goes before a sky comes round again */
const SURVIVAL_LAST_TIER = 40;
/* the five-junction opener (par 2 at most, a junction of degree 3) only ever comes out as two different skies, so
   asking for more puts the same one in the pool twice (curve.test.ts builds the tier to keep this honest) */
const SURVIVAL_OPENERS = 2;

const tierFrom = (i: number, count: number): CurveTier => ({ count, ...DEFAULT_SCHEDULE.sites[i] });
const FALLBACK = DEFAULT_SCHEDULE.fallback;

/** Where the campaign's difficulty starts and ends: its first level and its last. */
const RAMP_FROM = 5;
const RAMP_TO = MAX_LEVEL_NODES;

/* The campaign as one level per tier, each asking for a little more than the one before. Four things climb
   together so no stretch of levels plays alike:
     - junctions: 5 up to 40, quickly at first (a tiny graph has little else to grow), slowly later;
     - stars: the technique that clears it (1 up to 11 junctions, 2 up to 24, then 3: a smaller graph
       rarely needs the hardest technique, so asking for it there would only produce near misses);
     - hardness: from the first 2-star level the greedy cover must fail; from the first 3-star level
       par must also beat the pairwise-disjoint-paths bound by 1, then by 2;
     - par floor: par must be at least a share of the junctions, and that share grows from 30% to 50%.
   None of them ever goes down from one level to the next. */
export function campaignRamp(levels: number = CAMPAIGN_LEVELS): CurveTier[] {
  const last = Math.max(1, levels - 1);
  const sizes = Array.from({ length: levels }, (_, i) => Math.round(RAMP_FROM + (RAMP_TO - RAMP_FROM) * (i / last) ** 0.8));
  const firstThree = sizes.findIndex(n => n >= 25);
  return sizes.map((size, i): CurveTier => {
    const t = i / last;
    const diff: Stars = size <= 11 ? 1 : size <= 24 ? 2 : 3;
    const options: Partial<GenOptions> = { budgetMs: size <= 12 ? 400 : size <= 20 ? 800 : size <= 30 ? 2000 : 3000 };
    if (diff >= 2) options.greedyMustFail = true;
    if (diff === 3) options.minBoundGap = 1 + Math.min(1, Math.floor((2 * (i - firstThree)) / Math.max(1, levels - firstThree)));
    return { count: 1, size, diff, options, constraints: { minNodes: size, minK: Math.ceil(size * (0.3 + 0.2 * t)) } };
  });
}

/** Where each pool starts from, until an admin publishes another. */
export const DEFAULT_CURVES: Record<PoolMode, LevelCurve> = {
  /* a hundred levels, each a step harder than the last; the seven chapters only name stretches of it. Made once and
     frozen, so it can afford more fresh seeds than the daily week to land every level on its target */
  campaign: { version: 1, seed: 1, retries: 14, fallback: FALLBACK, tiers: campaignRamp() },
  /* a run starts small and deepens: step n plays tier n, the last tier once they run out */
  survival: { version: 1, seed: 1, retries: DEFAULT_SCHEDULE.retries, fallback: FALLBACK,
    tiers: [0, 1, 2, 3, 4].map(i => tierFrom(i, i === 0 ? SURVIVAL_OPENERS : i === 4 ? SURVIVAL_LAST_TIER : 6)) },
  /* a challenge picks a tier: a middling puzzle, or a hard one. A job publishes a fresh pool every night, with the
     day as the seed (tools/publish-match-pool.ts), so the maps do not repeat for long */
  match: { version: 1, seed: 1, retries: DEFAULT_SCHEDULE.retries, fallback: FALLBACK,
    tiers: [tierFrom(3, 20), tierFrom(5, 20)] },
};
