/* What the playground can turn, how it maps onto the generator's options, and
   how it round-trips through the URL hash (the only place it is kept). Pure. */
import {
  DEFAULT_GEN, DEFAULT_SCHEDULE, GADGET_NAMES, menuFor, resolveOptions,
  type GadgetName, type GenerateRequest, type GenOptions,
} from '../../domain/generation';

export type Weights = Record<GadgetName, number>;

export interface PlaygroundParams {
  seed: number;
  /** target node count */
  size: number;
  /** 1-3: picks the default gadget menu, the extra-edge pass and the star target */
  diff: number;
  maxDegree: number;
  minDegree: number;
  reach: number;
  clearance: number;
  crossings: boolean;
  unique: boolean;
  matchStars: boolean;
  /** null = the difficulty's own (0.8 at 3, else 0) */
  extraEdges: number | null;
  /** null = the difficulty's own gadget menu */
  weights: Weights | null;
  attempts: number;
  repairs: number;
  budgetMs: number;
  solverCap: number;
  clock: boolean;
}

export const DEFAULT_PARAMS: PlaygroundParams = {
  seed: 1, size: 14, diff: 2,
  maxDegree: DEFAULT_GEN.maxDegree, minDegree: DEFAULT_GEN.minDegree, reach: DEFAULT_GEN.reach,
  clearance: DEFAULT_GEN.clearance, crossings: DEFAULT_GEN.crossings, unique: DEFAULT_GEN.unique,
  matchStars: DEFAULT_GEN.matchStars, extraEdges: null, weights: null,
  attempts: DEFAULT_GEN.attempts, repairs: DEFAULT_GEN.repairs, budgetMs: DEFAULT_GEN.budgetMs,
  solverCap: DEFAULT_GEN.solverCap,
  /* off by default here, so a seed always shows the same graph */
  clock: false,
};

/** A gadget menu (duplicates as weights) as per-gadget weights. */
function weightsOf(menu: readonly string[]): Weights {
  const w = Object.fromEntries(GADGET_NAMES.map(n => [n, 0])) as Weights;
  for (const n of menu) if (Object.hasOwn(w, n)) w[n as GadgetName]++;
  return w;
}

/** The menu a difficulty uses, as per-gadget weights. */
export const weightsFor = (diff: number): Weights => weightsOf(menuFor(diff));

export function toGenOptions(p: PlaygroundParams): Partial<GenOptions> {
  const { maxDegree, minDegree, reach, clearance, crossings, unique, matchStars, extraEdges,
    attempts, repairs, budgetMs, solverCap, clock } = p;
  const menu = p.weights ? GADGET_NAMES.flatMap(n => Array<string>(Math.max(0, p.weights?.[n] ?? 0)).fill(n)) : null;
  return { maxDegree, minDegree, reach, clearance, crossings, unique, matchStars, extraEdges, menu,
    attempts, repairs, budgetMs, solverCap, clock };
}

/** The generator request these params describe. */
export function toRequest(p: PlaygroundParams): GenerateRequest {
  return { seed: p.seed, size: p.size, diff: p.diff, options: toGenOptions(p) };
}

export type ParamsAction =
  | { type: 'set'; patch: Partial<PlaygroundParams> }
  | { type: 'weight'; gadget: GadgetName; value: number }
  | { type: 'site'; idx: number }
  | { type: 'reset' };

export function paramsReducer(p: PlaygroundParams, a: ParamsAction): PlaygroundParams {
  switch (a.type) {
    case 'set': return { ...p, ...a.patch };
    case 'weight': return { ...p, weights: { ...(p.weights ?? weightsFor(p.diff)), [a.gadget]: Math.max(0, a.value) } };
    /* the game's own settings for a site: what the default schedule asks for
       (a site's level constraints, e.g. site 1's, have no knob here) */
    case 'site': {
      const site = DEFAULT_SCHEDULE.sites[a.idx];
      if (!site) return p;
      const o = resolveOptions(site.options);
      return {
        ...DEFAULT_PARAMS, seed: p.seed, size: site.size, diff: site.diff,
        maxDegree: o.maxDegree, minDegree: o.minDegree, reach: o.reach, clearance: o.clearance,
        crossings: o.crossings, unique: o.unique, matchStars: o.matchStars, extraEdges: o.extraEdges,
        weights: o.menu ? weightsOf(o.menu) : null,
        attempts: o.attempts, repairs: o.repairs, budgetMs: o.budgetMs, solverCap: o.solverCap,
      };
    }
    case 'reset': return { ...DEFAULT_PARAMS, seed: p.seed };
  }
}

/* ---------- URL hash: only what differs from the defaults ---------- */
const KEYS = Object.keys(DEFAULT_PARAMS) as (keyof PlaygroundParams)[];

export function encodeParams(p: PlaygroundParams): string {
  const q = new URLSearchParams();
  for (const k of KEYS) {
    const v = p[k], d = DEFAULT_PARAMS[k];
    if (k === 'weights') {
      if (p.weights) q.set(k, GADGET_NAMES.map(n => n + ':' + (p.weights?.[n] ?? 0)).join(','));
    } else if (v !== d) q.set(k, v === null ? 'auto' : String(v));
  }
  return q.toString();
}

export function decodeParams(hash: string): PlaygroundParams {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  const out: PlaygroundParams = { ...DEFAULT_PARAMS };
  const rec = out as unknown as Record<string, unknown>;   // keys checked against KEYS below
  for (const k of KEYS) {
    const raw = q.get(k);
    if (raw === null) continue;
    if (k === 'weights') {
      const w = weightsFor(out.diff);
      for (const part of raw.split(',')) {
        const [n, v] = part.split(':');
        if ((GADGET_NAMES as string[]).includes(n) && Number.isFinite(Number(v))) w[n as GadgetName] = Math.max(0, Number(v));
      }
      out.weights = w;
    } else if (typeof DEFAULT_PARAMS[k] === 'boolean') rec[k] = raw === 'true';
    else if (raw === 'auto' && k === 'extraEdges') out.extraEdges = null;
    else if (Number.isFinite(Number(raw)) && raw !== '') rec[k] = Number(raw);
  }
  return out;
}
