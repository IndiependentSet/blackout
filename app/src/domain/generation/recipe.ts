/* A recipe: the shape of a sky, saved under a name so every admin page can use it. A shape is what kind of graph
   the generator grows (strategy, degree, geometry, the gadget mix or the free-graph knobs); it is not how big a level
   is, how many stars it rates, how hard it must be or how long the search runs — those stay with the sky or the tier,
   because a curve ramps them level by level.

   Applying a recipe copies its shape into a rule (a Tonight sky, a pool tier); nothing links back. A published pool or
   a saved schedule therefore stays exactly what it was when it was made, whatever happens to the recipe later. Which
   recipe a rule "uses" is worked out by comparison (recipeFor), so a rule edited after the fact reads as custom. Pure. */
import type { GenOptions } from '../types';
import { DEFAULT_GEN, resolveOptions } from './options';
import { parseOptions, type ParseResult } from './parse';

/** The options a recipe carries. */
export const SHAPE_KEYS = [
  'strategy', 'minDegree', 'maxDegree', 'reach', 'clearance', 'crossings', 'girth',
  'menu', 'extraEdges', 'density', 'spread', 'lengthBias',
] as const satisfies readonly (keyof GenOptions)[];

export type ShapeKey = (typeof SHAPE_KEYS)[number];
/** A shape, written like every stored option set: only what differs from DEFAULT_GEN. */
export type Shape = Partial<Pick<GenOptions, ShapeKey>>;

export interface Recipe {
  name: string;
  shape: Shape;
  /** what it is for, in a line */
  note: string;
}

export const RECIPE_NAME_MAX = 40;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const isShapeKey = (k: string): k is ShapeKey => (SHAPE_KEYS as readonly string[]).includes(k);

/** The shape of an option set: its shape keys that differ from the defaults. */
export function shapeOf(options: Partial<GenOptions>): Shape {
  const full = resolveOptions(options);
  const out: Record<string, unknown> = {};
  for (const k of SHAPE_KEYS) if (!same(full[k], DEFAULT_GEN[k])) out[k] = full[k];
  return out as Shape;
}

/** An option set with its shape replaced: every shape key comes from `shape` (or the default), the rest is kept. */
export function withShape(options: Partial<GenOptions>, shape: Shape): Partial<GenOptions> {
  const rest = Object.fromEntries(Object.entries(options).filter(([k]) => !isShapeKey(k)));
  return { ...rest, ...shapeOf(shape) };
}

/** Whether two option sets grow the same kind of graph. */
export const sameShape = (a: Partial<GenOptions>, b: Partial<GenOptions>) => same(shapeOf(a), shapeOf(b));

/** The first recipe whose shape this option set has, or null (custom). */
export const recipeFor = (options: Partial<GenOptions>, recipes: readonly Recipe[]): Recipe | null =>
  recipes.find(r => sameShape(options, r.shape)) ?? null;

/** Why a name can't be a recipe's, or null when it can. */
export function recipeNameError(name: string): string | null {
  const n = name.trim();
  if (!n) return 'give the recipe a name';
  if (n.length > RECIPE_NAME_MAX) return `a name has at most ${RECIPE_NAME_MAX} characters`;
  return null;
}

/** Untrusted JSON (a stored recipe's shape) in, a shape out — or every reason it isn't one. */
export function parseShape(raw: unknown): ParseResult<Shape> {
  const r = parseOptions(raw);
  if (!r.ok) return r;
  const other = Object.keys(r.value).filter(k => !isShapeKey(k));
  if (other.length) return { ok: false, errors: other.map(k => `shape.${k}: not part of a shape (it belongs to the sky or tier)`) };
  return { ok: true, value: shapeOf(r.value) };
}

/** A short line for a shape: the strategy, then what else it changes. */
export function describeShape(shape: Shape): string {
  const s = shapeOf(shape);
  const parts: string[] = [s.strategy ?? DEFAULT_GEN.strategy];
  for (const k of SHAPE_KEYS) {
    if (k === 'strategy' || !(k in s)) continue;
    const v = s[k];
    parts.push(k === 'menu' ? 'custom mix' : `${k} ${v === null ? 'auto' : String(v)}`);
  }
  return parts.join(' · ');
}
