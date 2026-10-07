/* One playground run: what the generator gave back, measured. Pure. */
import { generate, greedyCover, matchingBound, type GenerateResult } from '../../domain/generation';
import { crossingPairs, graphStats, type GraphStats } from '../../domain/graphStats';
import type { GenReport, Level } from '../../domain/types';
import { toRequest, type PlaygroundParams } from './params';

export interface Outcome {
  level: Level | null;
  /** a second optimal cover, when the level has more than one */
  alt: number[] | null;
  report: GenReport;
  stats: GraphStats | null;
  /** edge index pairs that cross in the drawing */
  crossings: [number, number][];
  /** the always-take-the-busiest-junction cover's size (par when greedy solves it) */
  greedy: number | null;
  /** the matching lower bound on par (what the ESTIMATE consultant says) */
  bound: number | null;
}

/** Stats and crossings for a result (cheap next to generating it). */
export function toOutcome({ level, report, alt }: GenerateResult): Outcome {
  return {
    level, alt, report,
    stats: level && graphStats(level),
    crossings: level ? crossingPairs(level) : [],
    greedy: level && greedyCover(level),
    bound: level && matchingBound(level),
  };
}

/** Generate and measure in one go, on the calling thread. */
export function runGeneration(p: PlaygroundParams): Outcome {
  return toOutcome(generate(toRequest(p)));
}
