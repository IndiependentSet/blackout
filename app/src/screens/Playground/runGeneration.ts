/* One playground run, start to finish: generate under the given params and
   measure what came out. Pure, so the worker is just a postMessage shim. */
import { generate, rngFromSeed } from '../../domain/engine';
import { crossingPairs, graphStats, type GraphStats } from '../../domain/graphStats';
import type { GenReport, Level } from '../../domain/types';
import { toGenOptions, type PlaygroundParams } from './params';

export interface Outcome {
  level: Level | null;
  /** a second optimal cover, when the level has more than one */
  alt: number[] | null;
  report: GenReport;
  stats: GraphStats | null;
  /** edge index pairs that cross in the drawing */
  crossings: [number, number][];
}

export function runGeneration(p: PlaygroundParams): Outcome {
  const { level, report, alt } = generate(rngFromSeed(p.seed), p.size, p.diff, toGenOptions(p));
  return {
    level, alt, report,
    stats: level && graphStats(level),
    crossings: level ? crossingPairs(level) : [],
  };
}
