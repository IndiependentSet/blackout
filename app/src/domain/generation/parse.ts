/* Untrusted JSON (a stored or admin-edited schedule) in, a schedule the
   generator can run out — or every reason it can't. Pure. */
import { SITE_COUNT } from '../sites';
import type { GenOptions, Stars } from '../types';
import type { LevelConstraints } from './constraints';
import { isGadget } from './gadgets';
import { OPTION_LIMITS, resolveOptions, type Limit } from './options';
import type { GenerationSchedule, SiteRule } from './schedule';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const MAX_RETRIES = 20;
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Collects errors under a path prefix while reading fields. */
class Reader {
  readonly errors: string[] = [];
  num(path: string, v: unknown, lim: Limit, int: boolean): number | undefined {
    if (typeof v !== 'number' || !Number.isFinite(v)) { this.errors.push(`${path}: expected a number`); return undefined; }
    if (int && !Number.isInteger(v)) { this.errors.push(`${path}: expected a whole number`); return undefined; }
    if (v < lim.min || v > lim.max) { this.errors.push(`${path}: ${v} is outside ${lim.min}–${lim.max}`); return undefined; }
    return v;
  }
  bool(path: string, v: unknown): boolean | undefined {
    if (typeof v !== 'boolean') { this.errors.push(`${path}: expected true or false`); return undefined; }
    return v;
  }
  stars(path: string, v: unknown): Stars | undefined {
    return this.num(path, v, OPTION_LIMITS.diff, true) as Stars | undefined;
  }
  unknownKeys(path: string, o: Obj, known: readonly string[]) {
    for (const k of Object.keys(o)) if (!known.includes(k)) this.errors.push(`${path}.${k}: unknown setting`);
  }
}

const INT_OPTIONS = ['maxDegree', 'minDegree', 'attempts', 'repairs', 'budgetMs', 'solverCap'] as const;
const REAL_OPTIONS = ['reach', 'clearance'] as const;
const BOOL_OPTIONS = ['crossings', 'unique', 'matchStars', 'clock'] as const;
const OPTION_KEYS = [...INT_OPTIONS, ...REAL_OPTIONS, ...BOOL_OPTIONS, 'menu', 'extraEdges'] as const;

function readOptions(r: Reader, path: string, raw: unknown): Partial<GenOptions> {
  if (!isObj(raw)) { r.errors.push(`${path}: expected an object`); return {}; }
  r.unknownKeys(path, raw, OPTION_KEYS);
  const out: Partial<GenOptions> = {};
  for (const k of INT_OPTIONS) if (k in raw) out[k] = r.num(`${path}.${k}`, raw[k], OPTION_LIMITS[k], true);
  for (const k of REAL_OPTIONS) if (k in raw) out[k] = r.num(`${path}.${k}`, raw[k], OPTION_LIMITS[k], false);
  for (const k of BOOL_OPTIONS) if (k in raw) out[k] = r.bool(`${path}.${k}`, raw[k]);
  if ('extraEdges' in raw) {
    out.extraEdges = raw.extraEdges === null ? null : r.num(`${path}.extraEdges`, raw.extraEdges, OPTION_LIMITS.extraEdges, false);
  }
  if ('menu' in raw) out.menu = readMenu(r, `${path}.menu`, raw.menu);
  const full = resolveOptions(out);
  if (full.minDegree > full.maxDegree) r.errors.push(`${path}: minDegree ${full.minDegree} is above maxDegree ${full.maxDegree}`);
  /* drop the fields that failed, so a partial result never smuggles an undefined through */
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

function readMenu(r: Reader, path: string, raw: unknown): string[] | null | undefined {
  if (raw === null) return null;
  if (!Array.isArray(raw) || raw.some(n => typeof n !== 'string')) { r.errors.push(`${path}: expected a list of gadget names`); return undefined; }
  const names = raw as string[];
  const unknown = names.filter(n => !isGadget(n));
  if (unknown.length) r.errors.push(`${path}: unknown gadget ${[...new Set(unknown)].join(', ')}`);
  if (!names.length) r.errors.push(`${path}: the menu is empty, so nothing can be grown`);
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  for (const [n, c] of counts) {
    if (c > OPTION_LIMITS.gadgetWeight.max) r.errors.push(`${path}: ${n} appears ${c} times (at most ${OPTION_LIMITS.gadgetWeight.max})`);
  }
  return names.slice();
}

function readConstraints(r: Reader, path: string, raw: unknown): LevelConstraints | undefined {
  if (!isObj(raw)) { r.errors.push(`${path}: expected an object`); return undefined; }
  r.unknownKeys(path, raw, ['minNodes', 'maxK', 'hasDegree']);
  const out: LevelConstraints = {};
  if ('minNodes' in raw) out.minNodes = r.num(`${path}.minNodes`, raw.minNodes, OPTION_LIMITS.size, true);
  if ('maxK' in raw) out.maxK = r.num(`${path}.maxK`, raw.maxK, { min: 0, max: OPTION_LIMITS.size.max }, true);
  if ('hasDegree' in raw) out.hasDegree = r.num(`${path}.hasDegree`, raw.hasDegree, { min: 1, max: OPTION_LIMITS.maxDegree.max }, true);
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

function readSite(r: Reader, path: string, raw: unknown): SiteRule {
  const site: SiteRule = { size: 0, diff: 1, options: {} };
  if (!isObj(raw)) { r.errors.push(`${path}: expected an object`); return site; }
  r.unknownKeys(path, raw, ['size', 'diff', 'options', 'constraints']);
  site.size = r.num(`${path}.size`, raw.size, OPTION_LIMITS.size, true) ?? 0;
  site.diff = r.stars(`${path}.diff`, raw.diff) ?? 1;
  site.options = 'options' in raw ? readOptions(r, `${path}.options`, raw.options) : {};
  if ('constraints' in raw && raw.constraints !== undefined) site.constraints = readConstraints(r, `${path}.constraints`, raw.constraints);
  return site;
}

/** Check one option set (e.g. a playground preset) against the limits. */
export function parseOptions(raw: unknown): ParseResult<Partial<GenOptions>> {
  const r = new Reader();
  const value = readOptions(r, 'options', raw);
  return r.errors.length ? { ok: false, errors: r.errors } : { ok: true, value };
}

/** Check a whole schedule. On success the value is a clean copy holding only known fields. */
export function parseSchedule(raw: unknown): ParseResult<GenerationSchedule> {
  const r = new Reader();
  if (!isObj(raw)) return { ok: false, errors: ['schedule: expected an object'] };
  r.unknownKeys('schedule', raw, ['version', 'sites', 'retries', 'fallback']);
  if (raw.version !== 1) r.errors.push(`schedule.version: expected 1, got ${JSON.stringify(raw.version)}`);
  let sites: SiteRule[] = [];
  if (!Array.isArray(raw.sites)) r.errors.push('schedule.sites: expected a list');
  else {
    if (raw.sites.length !== SITE_COUNT) r.errors.push(`schedule.sites: expected ${SITE_COUNT} sites, got ${raw.sites.length}`);
    sites = raw.sites.map((s: unknown, i: number) => readSite(r, `schedule.sites[${i}]`, s));
  }
  const retries = r.num('schedule.retries', raw.retries, { min: 1, max: MAX_RETRIES }, true) ?? 1;
  let fallback: GenerationSchedule['fallback'] = { diff: 1, options: {} };
  if (!isObj(raw.fallback)) r.errors.push('schedule.fallback: expected an object');
  else {
    r.unknownKeys('schedule.fallback', raw.fallback, ['diff', 'options']);
    fallback = {
      diff: r.stars('schedule.fallback.diff', raw.fallback.diff) ?? 1,
      options: 'options' in raw.fallback ? readOptions(r, 'schedule.fallback.options', raw.fallback.options) : {},
    };
  }
  if (r.errors.length) return { ok: false, errors: r.errors };
  return { ok: true, value: { version: 1, sites, retries, fallback } };
}
