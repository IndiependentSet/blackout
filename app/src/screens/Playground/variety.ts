/* The variety sweep: generate one seed after another under the same settings
   and count how many genuinely different levels come out. Pure; the worker
   only drives it. */
import { generate, rngFromSeed } from '../../domain/engine';
import { drawingKey, shapeKey } from '../../domain/graphIdentity';
import type { Level, Stars } from '../../domain/types';
import { toGenOptions, type PlaygroundParams } from './params';

/** One distinct abstract graph, and the first seed that produced it. */
export interface ShapeSeen {
  key: string;
  count: number;
  seed: number;
  nodes: number;
  edges: number;
  par: number;
  stars: Stars;
  /** distinct drawings of this graph seen so far */
  drawings: number;
}

export interface CurvePoint { tried: number; shapes: number; drawings: number }

export interface VarietySummary {
  tried: number;
  found: number;
  shapes: number;
  drawings: number;
  /** Chao1 estimates of the totals, seen and unseen */
  estShapes: number;
  estDrawings: number;
  /** chance the next level is a graph already seen (Good–Turing) */
  repeatShapes: number;
  repeatDrawings: number;
  /** graphs whose identity fell back to the approximate key */
  approx: number;
  curve: CurvePoint[];
  top: ShapeSeen[];
}

interface Acc {
  tried: number;
  found: number;
  approx: number;
  shapes: Map<string, ShapeSeen & { drawingKeys: Set<string> }>;
  drawings: Map<string, number>;
  curve: CurvePoint[];
  every: number;
}

/** `every`: record a curve point after this many seeds (keeps the curve ~100 points). */
export function newAcc(every = 1): Acc {
  return { tried: 0, found: 0, approx: 0, shapes: new Map(), drawings: new Map(), curve: [], every: Math.max(1, every) };
}

export function addLevel(acc: Acc, seed: number, lv: Level | null): void {
  acc.tried++;
  if (lv) {
    acc.found++;
    const { key, exact } = shapeKey(lv);
    if (!exact) acc.approx++;
    const draw = drawingKey(lv);
    acc.drawings.set(draw, (acc.drawings.get(draw) ?? 0) + 1);
    const s = acc.shapes.get(key);
    if (s) { s.count++; s.drawingKeys.add(draw); s.drawings = s.drawingKeys.size; }
    else acc.shapes.set(key, {
      key, count: 1, seed, nodes: lv.nodes.length, edges: lv.edges.length, par: lv.k, stars: lv.stars,
      drawings: 1, drawingKeys: new Set([draw]),
    });
  }
  if (acc.tried % acc.every === 0 || acc.tried === 1) acc.curve.push(point(acc));
}

const point = (acc: Acc): CurvePoint => ({ tried: acc.tried, shapes: acc.shapes.size, drawings: acc.drawings.size });

/** Bias-corrected Chao1: seen + f1(f1 − 1) / 2(f2 + 1), from how many were seen once (f1) and twice (f2). */
export function chao1(counts: Iterable<number>): number {
  let seen = 0, f1 = 0, f2 = 0;
  for (const c of counts) { seen++; if (c === 1) f1++; else if (c === 2) f2++; }
  return Math.round(seen + (f1 * (f1 - 1)) / (2 * (f2 + 1)));
}

/** Good–Turing: share of the sample made of things seen more than once. */
export function repeatChance(counts: Iterable<number>, total: number): number {
  if (!total) return 0;
  let f1 = 0;
  for (const c of counts) if (c === 1) f1++;
  return 1 - f1 / total;
}

export function summarize(acc: Acc, top = 12): VarietySummary {
  const shapeCounts = [...acc.shapes.values()].map(s => s.count);
  const curve = acc.curve.at(-1)?.tried === acc.tried ? acc.curve : [...acc.curve, point(acc)];
  return {
    tried: acc.tried, found: acc.found, shapes: acc.shapes.size, drawings: acc.drawings.size,
    estShapes: chao1(shapeCounts), estDrawings: chao1(acc.drawings.values()),
    repeatShapes: repeatChance(shapeCounts, acc.found), repeatDrawings: repeatChance(acc.drawings.values(), acc.found),
    approx: acc.approx, curve,
    top: [...acc.shapes.values()].sort((a, b) => b.count - a.count || a.seed - b.seed).slice(0, top)
      .map(s => ({ key: s.key, count: s.count, seed: s.seed, nodes: s.nodes, edges: s.edges, par: s.par, stars: s.stars, drawings: s.drawings })),
  };
}

/** Generate `samples` levels from consecutive seeds starting at the params' own.
    The clock is always off here, so every seed listed can be reloaded exactly. */
export function* sweep(p: PlaygroundParams, samples: number): Generator<Acc, Acc> {
  const acc = newAcc(Math.ceil(samples / 100));
  const opts = { ...toGenOptions(p), clock: false };
  for (let i = 0; i < samples; i++) {
    const seed = p.seed + i;
    addLevel(acc, seed, generate(rngFromSeed(seed), p.size, p.diff, opts).level);
    yield acc;
  }
  return acc;
}
