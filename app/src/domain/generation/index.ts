/* Level generation: the public API. Everything outside domain/generation/
   imports from here and nowhere deeper (lint-enforced). */

// settings
export type { GenOptions, GenReport, Strategy } from '../types';
export { DEFAULT_GEN, MAX_LEVEL_NODES, OPTION_LIMITS, STRATEGIES, resolveOptions, type Limit } from './options';
export { GADGET_NAMES, menuFor, type GadgetName } from './gadgets';
export type { LevelConstraints } from './constraints';

// the game's week, as data
export {
  DEFAULT_SCHEDULE, levelForSite, levelForSiteReport, levelsForDay, type GenerationSchedule, type SiteOutcome, type SiteRule,
} from './schedule';
export { parseCurve, parseFigure, parseOptions, parseSchedule, type ParseResult } from './parse';

// hand-drawn skies: the generator's other way in
export {
  EMPTY_FIGURE, addStar, adjacency, checkFigure, decodeFigure, encodeFigure, figureErrors, figureWarnings, levelFromFigure,
  moveStar, normalizeFigure, removeLine, removeStar, starAt, toggleLine, type FigureCheck,
} from './manual';

// level pools: a curve of tiers, made ahead of time
export {
  DEFAULT_CURVES, campaignRamp, curveRuleErrors, generateSlot, orderByHardness, poolKey, poolSlots, type CurveTier, type LevelCurve, type PoolSlot,
  type SlotOutcome,
} from './curve';

// recipes: a sky's shape, saved under a name and copied into skies and tiers
export {
  RECIPE_NAME_MAX, SHAPE_KEYS, describeShape, parseShape, recipeFor, recipeNameError, sameShape, shapeOf, withShape,
  type Recipe, type Shape, type ShapeKey,
} from './recipe';

// on demand
export { generate, type GenerateRequest, type GenerateResult } from './generate';
export { KEPT_OPTIMA, difficulty, solve, type SolveResult } from './solver';
export { compareHardness, greedyCover, levelHardness, matchingBound } from './hardness';
