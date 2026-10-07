/** The generator's settings: what the game plays by default, how far each one
    may be turned, and how a partial set is filled in. Pure. */
import type { GenOptions } from '../types';

/** The rules the game's levels are generated under. Every field here is a
    constant the generator used to hard-code; the playground overrides them. */
export const DEFAULT_GEN: GenOptions = {
  maxDegree: 3, minDegree: 0, reach: 1.5, clearance: 0.4, crossings: false,
  menu: null, extraEdges: null, unique: true, matchStars: true,
  attempts: 400, repairs: 18, budgetMs: 500, solverCap: 600000, clock: true,
};

export interface Limit { min: number; max: number; step?: number }

/** How far each number may be turned: shared by the playground's controls and
    by parseSchedule(), so an edited setting is never one the UI couldn't make. */
export const OPTION_LIMITS = {
  /** target node count */
  size: { min: 4, max: 80 },
  diff: { min: 1, max: 3 },
  maxDegree: { min: 1, max: 8 },
  minDegree: { min: 0, max: 6 },
  reach: { min: 1, max: 3.2 },
  clearance: { min: 0, max: 0.7, step: 0.05 },
  extraEdges: { min: 0, max: 3, step: 0.1 },
  /** copies of one gadget in a menu */
  gadgetWeight: { min: 0, max: 9 },
  attempts: { min: 1, max: 10000 },
  repairs: { min: 0, max: 200 },
  budgetMs: { min: 10, max: 60000, step: 100 },
  solverCap: { min: 1000, max: 50_000_000, step: 50000 },
} as const satisfies Record<string, Limit>;

/** A full option set: the defaults with whatever was given on top
    (an explicit `undefined` keeps the default rather than erasing it). */
export function resolveOptions(opts: Partial<GenOptions> = {}): GenOptions {
  const set = Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined));
  return { ...DEFAULT_GEN, ...set };
}
