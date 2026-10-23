/* Editing one rule of many (a Tonight sky, a pool tier) through the settings panel: either the open rule alone, or
   every rule at once. "Every rule" copies only the settings the edit changed, so each rule keeps everything else of
   its own (a ramp's sizes, stars and budgets survive turning one knob for all). Pure. */
import type { LevelConstraints, SiteRule } from '../../domain/generation';
import { mergeConstraints } from './constraints';
import { paramsReducer, paramsToSite, siteToParams, type ParamsAction, type PlaygroundParams } from './params';

/** which rules an edit in the settings panel reaches */
export type EditScope = 'one' | 'all';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A rule rewritten from params, keeping whatever else it carries (a tier's count) and its constraints. */
const fromParams = <R extends SiteRule>(rule: R, p: PlaygroundParams): R => {
  const { constraints: _old, ...rest } = rule;
  return { ...rest, ...paramsToSite(p, rule.constraints) } as R;
};

/** The rules after a settings-panel edit of rule `open`; with scope 'all', the settings it changed go to every rule. */
export function applyParams<R extends SiteRule>(rules: readonly R[], open: number, action: ParamsAction, scope: EditScope): R[] {
  const before = siteToParams(rules[open], 0);
  const after = paramsReducer(before, action);
  const changed = (Object.keys(after) as (keyof PlaygroundParams)[]).filter(k => k !== 'seed' && !same(after[k], before[k]));
  const patch = Object.fromEntries(changed.map(k => [k, after[k]])) as Partial<PlaygroundParams>;
  return rules.map((r, i) => {
    if (i === open) return fromParams(r, after);
    if (scope === 'one' || !changed.length) return r;
    return fromParams(r, { ...siteToParams(r, 0), ...patch });
  });
}

/** The rules after a constraints edit of rule `open` (scope 'all': the same change on every rule). */
export function applyConstraints<R extends SiteRule>(rules: readonly R[], open: number,
  patch: Partial<Record<keyof LevelConstraints, number | null>>, scope: EditScope): R[] {
  return rules.map((r, i) => (i === open || scope === 'all' ? mergeConstraints(r, patch) : r));
}
