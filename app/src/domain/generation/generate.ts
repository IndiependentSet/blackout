/* The generator: grow, densify, solve, repair until a level meets every rule,
   or give back the closest miss. Pure apart from the optional clock budget. */
import { rngFromSeed } from '../rng';
import type { Edge, GenOptions, GenReport, Level, LevelFilter, Rng } from '../types';
import { minDegreeOf, type Graph } from './builder';
import { constraintFilter, type LevelConstraints } from './constraints';
import { isGadget, menuFor } from './gadgets';
import { growFree, repairEdge } from './free';
import { densify, grow, liftDegrees, repair } from './growth';
import { greedyCover, matchingBound } from './hardness';
import { resolveOptions } from './options';
import { difficulty, solve, type SolveResult } from './solver';

/** One level to generate. Plain data: it can be stored or posted to a worker. */
export interface GenerateRequest {
  seed: number;
  /** target node count */
  size: number;
  /** 1-3: the default gadget menu, the extra-edge pass and the star target */
  diff: number;
  /** anything not given is DEFAULT_GEN's */
  options?: Partial<GenOptions>;
  constraints?: LevelConstraints;
}
export interface GenerateResult {
  /** null only when nothing could be built at all (e.g. an empty gadget menu) */
  level: Level | null;
  /** the level's other optimal covers (report.optima − 1 of them), up to KEPT_OPTIMA */
  alts: number[][];
  report: GenReport;
}

/** Generate one level. Same request (with the clock off) = same level. */
export function generate(req: GenerateRequest): GenerateResult {
  return generateWith(rngFromSeed(req.seed), req.size, req.diff, req.options, constraintFilter(req.constraints));
}

/** The generator itself, on a caller's rng. With DEFAULT_GEN it makes exactly
    the levels the game always has: same rng draws, in the same order. */
export function generateWith(rng: Rng, target: number, diff: number, opts: Partial<GenOptions> = {},
  accept?: LevelFilter | null): GenerateResult {
  const cfg = resolveOptions(opts);
  /* clock off: generation is purely attempt-limited, so a seed always gives the same level */
  const now = cfg.clock ? () => Date.now() : () => 0;
  const t0 = now(), started = Date.now();
  const menu = cfg.menu ? cfg.menu.filter(isGadget) : menuFor(diff);
  const extra = cfg.extraEdges ?? (diff === 3 ? 0.8 : 0);
  const report: GenReport = {
    attempts: 0, repairs: 0, ms: 0, fallback: false, optima: 0, visits: 0,
    rejected: { degenerate: 0, blowup: 0, unresolved: 0, filter: 0, minDegree: 0, stars: 0, size: 0, greedy: 0, bound: 0 },
  };
  let fallback: Level | null = null;
  let fbAlts: number[][] = [], fbOptima = 0, fbVisits = 0;
  const done = (level: Level | null, alts: number[][], optima: number, visits: number): GenerateResult => {
    Object.assign(report, { ms: Date.now() - started, optima, visits });
    return { level, report, alts };
  };
  const free = cfg.strategy === 'free';
  if (!free && !menu.length) return done(null, [], 0, 0);

  for (let att = 0; att < cfg.attempts; att++) {
    if (now() - t0 > cfg.budgetMs && fallback) break;
    report.attempts++;
    let g: Graph | null;
    if (free) g = growFree(rng, target, cfg);       // tie-breaks add no junctions, so no head start
    else {
      const seedSize = Math.max(4, diff === 3 ? target - 3 : target - 1);
      g = grow(rng, seedSize, menu, cfg);
    }
    if (!g || g.edges.length < 2 || g.nodes.some((_, i) => g.adj[i].length === 0)) { report.rejected.degenerate++; continue; }
    if (!free && extra > 0) densify(g, rng, Math.ceil(target * extra));
    if (cfg.minDegree > 1) liftDegrees(g, rng, cfg.minDegree);
    for (let fix = 0; fix < cfg.repairs; fix++) {
      let r: SolveResult;
      try { r = solve(g, cfg.solverCap); } catch { report.rejected.blowup++; break; }
      if (cfg.maxOptima === 0 || r.count <= cfg.maxOptima) {
        const d = difficulty(g), n = g.nodes.length;
        const lv: Level = { nodes: g.nodes.map(p => ({ c: p.c, r: p.r })), edges: g.edges.map(e => [e[0], e[1]] as Edge),
                     adj: g.adj.map(a => a.slice()), k: r.k, sol: r.sol, stars: d };
        if (accept && !accept(lv)) { report.rejected.filter++; break; }
        const degOk = minDegreeOf(g) >= cfg.minDegree;
        const starsOk = !cfg.matchStars || d === diff;
        const sizeOk = n >= (target <= 8 ? target : target - 1) && n <= target + 2;
        const greedyOk = !cfg.greedyMustFail || greedyCover(lv) > lv.k;
        const boundOk = cfg.minBoundGap <= 0 || lv.k - matchingBound(lv) >= cfg.minBoundGap;
        if (degOk && starsOk && sizeOk && greedyOk && boundOk) return done(lv, r.alts, r.count, r.visits);
        if (!degOk) report.rejected.minDegree++;
        else if (!starsOk) report.rejected.stars++;
        else if (!sizeOk) report.rejected.size++;
        else if (!greedyOk) report.rejected.greedy++;
        else report.rejected.bound++;
        const score = (degOk ? 0 : 1000) + (starsOk ? 0 : Math.abs(d - diff) * 100) + Math.abs(n - target)
          + (greedyOk ? 0 : 50) + (boundOk ? 0 : 50);
        if (!fallback || score < (fallback._score ?? Infinity)) {
          lv._score = score; fallback = lv; fbAlts = r.alts; fbOptima = r.count; fbVisits = r.visits;
        }
        break;
      }
      if (g.nodes.length > target + 2) { report.rejected.size++; break; }

      if (!(free ? repairEdge(g, rng, r) : repair(g, rng, r))) { report.rejected.unresolved++; break; }
      report.repairs++;
    }
  }
  report.fallback = !!fallback;
  return done(fallback, fbAlts, fbOptima, fbVisits);
}
