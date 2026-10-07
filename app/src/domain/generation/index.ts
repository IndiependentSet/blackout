/* Level generation: the public API. Everything outside domain/generation/
   imports from here and nowhere deeper (lint-enforced). */

// settings
export type { GenOptions, GenReport, Strategy } from '../types';
export { DEFAULT_GEN, OPTION_LIMITS, STRATEGIES, resolveOptions, type Limit } from './options';
export { GADGET_NAMES, menuFor, type GadgetName } from './gadgets';
export type { LevelConstraints } from './constraints';

// the game's week, as data
export { DEFAULT_SCHEDULE, levelForSite, levelsForDay, type GenerationSchedule, type SiteRule } from './schedule';
export { parseOptions, parseSchedule, type ParseResult } from './parse';

// on demand
export { generate, type GenerateRequest, type GenerateResult } from './generate';
export { difficulty, solve, type SolveResult } from './solver';
export { greedyCover, matchingBound } from './hardness';
