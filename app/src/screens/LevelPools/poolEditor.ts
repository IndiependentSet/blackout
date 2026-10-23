/* The pool page's draft: which mode, the curve being edited, and the rule open in the settings panel (a tier, or the
   fallback). A tier is a schedule's site rule plus a count, so the panel edits it through the same params the
   playground and the Tonight page use, and every generator setting is in reach. Pure. */
import type { PoolMode } from '../../domain/gameModes';
import {
  DEFAULT_CURVES, withShape, type CurveTier, type LevelConstraints, type LevelCurve, type Shape,
} from '../../domain/generation';
import { applyConstraints, applyParams, type EditScope } from '../Playground/scope';
import {
  fallbackToParams, paramsReducer, paramsToFallback, siteToParams, type ParamsAction, type PlaygroundParams,
} from '../Playground/params';

/** a tier index, or the fallback rule */
export type PoolTab = number | 'fallback';

export interface PoolEditor {
  mode: PoolMode;
  curve: LevelCurve;
  tab: PoolTab;
  /** whether a settings-panel edit reaches the open tier only, or every tier */
  scope: EditScope;
  /** what the draft started from, for the header */
  basis: string;
  dirty: boolean;
}

export type PoolEditorAction =
  | { type: 'load'; curve: LevelCurve; basis: string }
  | { type: 'tab'; tab: PoolTab }
  | { type: 'scope'; scope: EditScope }
  | { type: 'params'; action: ParamsAction }
  | { type: 'constraints'; patch: Partial<Record<keyof LevelConstraints, number | null>> }
  | { type: 'count'; value: number }
  /** a recipe's shape onto tiers from..to (inclusive, clamped) */
  | { type: 'shape'; shape: Shape; from: number; to: number }
  /** a copy of the open tier, right after it */
  | { type: 'addTier' }
  | { type: 'removeTier' }
  | { type: 'meta'; patch: Partial<Pick<LevelCurve, 'seed' | 'retries'>> };

export const MAX_TIER_COUNT = 400;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

export const initialPoolEditor = (mode: PoolMode = 'campaign'): PoolEditor =>
  ({ mode, curve: DEFAULT_CURVES[mode], tab: 0, scope: 'one', basis: 'the default', dirty: false });

/** The params the panel shows for the open rule. The fallback runs at each tier's own size; it previews at the first. */
export function poolParams(s: PoolEditor): PlaygroundParams {
  const { curve, tab } = s;
  if (tab === 'fallback') return fallbackToParams(curve.fallback, curve.tiers[0]?.size ?? 10);
  return siteToParams(curve.tiers[tab] ?? curve.tiers[0], 0);
}

/** The open tier, or null on the fallback. */
export const openTier = (s: PoolEditor): CurveTier | null => (s.tab === 'fallback' ? null : s.curve.tiers[s.tab] ?? null);

/** The levels a tier makes, counted the way its mode numbers them (a campaign from level 1, the others from 0). */
export function tierLevels(s: Pick<PoolEditor, 'mode' | 'curve'>, index: number): { first: number; last: number } {
  const before = s.curve.tiers.slice(0, index).reduce((n, t) => n + t.count, 0);
  const first = before + (s.mode === 'campaign' ? 1 : 0);
  return { first, last: first + (s.curve.tiers[index]?.count ?? 1) - 1 };
}

export function poolEditorReducer(s: PoolEditor, a: PoolEditorAction): PoolEditor {
  const edit = (curve: LevelCurve, tab: PoolTab = s.tab): PoolEditor => ({ ...s, curve, tab, dirty: true });
  const withTier = (update: (t: CurveTier) => CurveTier) => {
    const i = s.tab;
    if (i === 'fallback' || !s.curve.tiers[i]) return s;
    return edit({ ...s.curve, tiers: s.curve.tiers.map((t, j) => (j === i ? update(t) : t)) });
  };
  switch (a.type) {
    case 'load': return { ...s, curve: a.curve, basis: a.basis, dirty: false, tab: typeof s.tab === 'number' ? Math.min(s.tab, a.curve.tiers.length - 1) : s.tab };
    case 'tab': return { ...s, tab: a.tab === 'fallback' ? a.tab : clamp(a.tab, 0, s.curve.tiers.length - 1) };
    case 'scope': return { ...s, scope: a.scope };
    case 'params': {
      if (s.tab === 'fallback') return edit({ ...s.curve, fallback: paramsToFallback(paramsReducer(poolParams(s), a.action)) });
      if (!s.curve.tiers[s.tab]) return s;
      return edit({ ...s.curve, tiers: applyParams(s.curve.tiers, s.tab, a.action, s.scope) });
    }
    case 'constraints':
      if (s.tab === 'fallback' || !s.curve.tiers[s.tab]) return s;
      return edit({ ...s.curve, tiers: applyConstraints(s.curve.tiers, s.tab, a.patch, s.scope) });
    case 'count': return withTier(t => ({ ...t, count: clamp(a.value, 1, MAX_TIER_COUNT) }));
    case 'shape': {
      const last = s.curve.tiers.length - 1;
      const from = clamp(Math.min(a.from, a.to), 0, last), to = clamp(Math.max(a.from, a.to), 0, last);
      return edit({ ...s.curve, tiers: s.curve.tiers.map((t, i) => (i >= from && i <= to ? { ...t, options: withShape(t.options, a.shape) } : t)) });
    }
    case 'addTier': {
      const i = s.tab === 'fallback' ? s.curve.tiers.length - 1 : s.tab;
      const t = s.curve.tiers[i];
      const copy: CurveTier = { ...t, options: { ...t.options }, ...(t.constraints && { constraints: { ...t.constraints } }) };
      return edit({ ...s.curve, tiers: [...s.curve.tiers.slice(0, i + 1), copy, ...s.curve.tiers.slice(i + 1)] }, i + 1);
    }
    case 'removeTier': {
      if (s.tab === 'fallback' || s.curve.tiers.length <= 1) return s;
      const i = s.tab;
      return edit({ ...s.curve, tiers: s.curve.tiers.filter((_, j) => j !== i) }, Math.min(i, s.curve.tiers.length - 2));
    }
    case 'meta': {
      const { seed, retries } = a.patch;
      return edit({
        ...s.curve,
        ...(seed !== undefined && { seed: clamp(seed, 0, 1_000_000) }),
        ...(retries !== undefined && { retries: clamp(retries, 1, 20) }),
      });
    }
  }
}
