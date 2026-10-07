/* The generator: grow, densify, solve, repair until a level meets every rule,
   or give back the closest miss. Pure apart from the optional clock budget. */
import { rngFromSeed } from '../rng';
import type { Edge, GenOptions, GenReport, Level, LevelFilter, Rng } from '../types';
import { minDegreeOf } from './builder';
import { constraintFilter, type LevelConstraints } from './constraints';
import { isGadget, menuFor } from './gadgets';
import { densify, grow, liftDegrees, repair } from './growth';
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
  /** a second optimal cover, when the level has more than one */
  alt: number[] | null;
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
    rejected: { degenerate: 0, blowup: 0, unresolved: 0, filter: 0, minDegree: 0, stars: 0, size: 0 },
  };
  let fallback: Level | null = null;
  let fbAlt: number[] | null = null, fbOptima = 0, fbVisits = 0;
  const done = (level: Level | null, alt: number[] | null, optima: number, visits: number) => {
    Object.assign(report, { ms: Date.now() - started, optima, visits });
    return { level, report, alt };
  };
  if (!menu.length) return done(null, null, 0, 0);

  for (let att = 0; att < cfg.attempts; att++) {
    if (now() - t0 > cfg.budgetMs && fallback) break;
    report.attempts++;
    const seedSize = Math.max(4, diff === 3 ? target - 3 : target - 1);
    const g = grow(rng, seedSize, menu, cfg);
    if (g.edges.length < 2 || g.nodes.some((_, i) => g.adj[i].length === 0)) { report.rejected.degenerate++; continue; }
    if (extra > 0) densify(g, rng, Math.ceil(target * extra));
    if (cfg.minDegree > 1) liftDegrees(g, rng, cfg.minDegree);
    for (let fix = 0; fix < cfg.repairs; fix++) {
      let r: SolveResult;
      try { r = solve(g, cfg.solverCap); } catch { report.rejected.blowup++; break; }
      if (r.count === 1 || !cfg.unique) {
        const d = difficulty(g), n = g.nodes.length;
        const lv: Level = { nodes: g.nodes.map(p => ({ c: p.c, r: p.r })), edges: g.edges.map(e => [e[0], e[1]] as Edge),
                     adj: g.adj.map(a => a.slice()), k: r.k, sol: r.sol, stars: d };
        if (accept && !accept(lv)) { report.rejected.filter++; break; }
        const degOk = minDegreeOf(g) >= cfg.minDegree;
        const starsOk = !cfg.matchStars || d === diff;
        const sizeOk = n >= (target <= 8 ? target : target - 1) && n <= target + 2;
        if (degOk && starsOk && sizeOk) return done(lv, r.alt, r.count, r.visits);
        if (!degOk) report.rejected.minDegree++;
        else if (!starsOk) report.rejected.stars++;
        else report.rejected.size++;
        const score = (degOk ? 0 : 1000) + (starsOk ? 0 : Math.abs(d - diff) * 100) + Math.abs(n - target);
        if (!fallback || score < (fallback._score ?? Infinity)) {
          lv._score = score; fallback = lv; fbAlt = r.alt; fbOptima = r.count; fbVisits = r.visits;
        }
        break;
      }
      if (g.nodes.length > target + 2) { report.rejected.size++; break; }

      if (!repair(g, rng, r)) { report.rejected.unresolved++; break; }
      report.repairs++;
    }
  }
  report.fallback = !!fallback;
  return done(fallback, fbAlt, fbOptima, fbVisits);
}
