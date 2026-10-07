/* What the playground can turn, how it maps onto the generator's options, and
   how it round-trips through the URL hash (the only place it is kept). Pure. */
import {
  DEFAULT_GEN, DEFAULT_SCHEDULE, GADGET_NAMES, STRATEGIES, menuFor, resolveOptions,
  type GadgetName, type GenerateRequest, type GenOptions, type Strategy,
} from '../../domain/generation';

export type Weights = Record<GadgetName, number>;

/** The settings that go straight through to the generator (everything but the gadget mix). */
const PASSED = [
  'strategy', 'maxDegree', 'minDegree', 'reach', 'clearance', 'crossings',
  'density', 'spread', 'lengthBias', 'girth', 'maxOptima', 'greedyMustFail', 'minBoundGap', 'matchStars',
  'extraEdges', 'attempts', 'repairs', 'budgetMs', 'solverCap', 'clock',
] as const satisfies readonly (keyof GenOptions)[];
type Passed = Pick<GenOptions, (typeof PASSED)[number]>;

const passed = (o: Passed): Passed => Object.fromEntries(PASSED.map(k => [k, o[k]])) as unknown as Passed;  // keys from PASSED

/** Every knob; see GenOptions for what the passed-through ones mean. */
export interface PlaygroundParams extends Passed {
  seed: number;
  /** target node count */
  size: number;
  /** 1-3: the star target; for gadgets also the default menu and extra-edge pass */
  diff: number;
  /** null = the difficulty's own gadget menu */
  weights: Weights | null;
}

export const DEFAULT_PARAMS: PlaygroundParams = {
  seed: 1, size: 14, diff: 2, ...passed(DEFAULT_GEN), weights: null,
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
  const menu = p.weights ? GADGET_NAMES.flatMap(n => Array<string>(Math.max(0, p.weights?.[n] ?? 0)).fill(n)) : null;
  return { ...passed(p), menu };
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
        ...DEFAULT_PARAMS, seed: p.seed, size: site.size, diff: site.diff, ...passed(o),
        weights: o.menu ? weightsOf(o.menu) : null, clock: DEFAULT_PARAMS.clock,
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
    } else if (k === 'strategy') {
      if ((STRATEGIES as readonly string[]).includes(raw)) out.strategy = raw as Strategy;
    } else if (typeof DEFAULT_PARAMS[k] === 'boolean') rec[k] = raw === 'true';
    else if (raw === 'auto' && k === 'extraEdges') out.extraEdges = null;
    else if (Number.isFinite(Number(raw)) && raw !== '') rec[k] = Number(raw);
  }
  return out;
}

/** A short name for a set of settings: the strategy, then whatever else differs from the defaults (the seed aside). */
export function describeParams(p: PlaygroundParams): string {
  const diff = new URLSearchParams(encodeParams({ ...p, seed: DEFAULT_PARAMS.seed }));
  diff.delete('strategy');
  const rest = [...diff].map(([k, v]) => (k === 'weights' ? 'custom mix' : `${k} ${v}`));
  return [p.strategy, ...rest].join(' · ');
}
