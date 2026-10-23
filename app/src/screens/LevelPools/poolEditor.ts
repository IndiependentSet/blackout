/* The pool page's draft: which mode, the curve being edited, and the rule open in the settings panel (a tier, or the
   fallback). A tier is a schedule's site rule plus a count, so the panel edits it through the same params the
   playground and the Tonight page use, and every generator setting is in reach. Pure. */
import type { PoolMode } from '../../domain/gameModes';
import {
  DEFAULT_CURVES, EMPTY_FIGURE, withShape, type CurveTier, type LevelConstraints, type LevelCurve, type Shape,
} from '../../domain/generation';
import type { SkyFigure } from '../../domain/types';
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
  /** a hand-drawn tier: the drawing open in the editor */
  drawing: number;
}

/** How a tier's levels come about: generated from its settings, or drawn by hand. */
export type TierSource = 'generate' | 'draw';

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
  | { type: 'meta'; patch: Partial<Pick<LevelCurve, 'seed' | 'retries'>> }
  /** the open tier generated, or drawn by hand: starting from `figures` (e.g. the levels it was last built with),
      else from one empty drawing. Back to generated drops the drawings and keeps the settings. */
  | { type: 'tierSource'; source: TierSource; figures?: SkyFigure[] }
  | { type: 'openDrawing'; index: number }
  | { type: 'setDrawing'; index: number; figure: SkyFigure }
  /** an empty drawing after the open one */
  | { type: 'addDrawing' }
  | { type: 'removeDrawing'; index: number };

export const MAX_TIER_COUNT = 400;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

export const initialPoolEditor = (mode: PoolMode = 'campaign'): PoolEditor =>
  ({ mode, curve: DEFAULT_CURVES[mode], tab: 0, scope: 'one', basis: 'the default', dirty: false, drawing: 0 });

/** The params the panel shows for the open rule. The fallback runs at each tier's own size; it previews at the first. */
export function poolParams(s: PoolEditor): PlaygroundParams {
  const { curve, tab } = s;
  if (tab === 'fallback') return fallbackToParams(curve.fallback, curve.tiers[0]?.size ?? 10);
  return siteToParams(curve.tiers[tab] ?? curve.tiers[0], 0);
}

/** How the open tier's levels come about (the fallback is always generated). */
export const tierSource = (s: PoolEditor): TierSource => (openTier(s)?.manual ? 'draw' : 'generate');

/** The open tier, or null on the fallback. */
export const openTier = (s: PoolEditor): CurveTier | null => (s.tab === 'fallback' ? null : s.curve.tiers[s.tab] ?? null);

/** The levels a tier makes, counted the way its mode numbers them (a campaign from level 1, the others from 0). */
export function tierLevels(s: Pick<PoolEditor, 'mode' | 'curve'>, index: number): { first: number; last: number } {
  const before = s.curve.tiers.slice(0, index).reduce((n, t) => n + t.count, 0);
  const first = before + (s.mode === 'campaign' ? 1 : 0);
  return { first, last: first + (s.curve.tiers[index]?.count ?? 1) - 1 };
}

export function poolEditorReducer(s: PoolEditor, a: PoolEditorAction): PoolEditor {
  const edit = (curve: LevelCurve, tab: PoolTab = s.tab, drawing = tab === s.tab ? s.drawing : 0): PoolEditor =>
    ({ ...s, curve, tab, dirty: true, drawing });
  const tier = typeof s.tab === 'number' ? s.curve.tiers[s.tab] : undefined;
  /* a hand-drawn tier makes one level per drawing */
  const withDrawings = (manual: SkyFigure[], drawing: number): PoolEditor => {
    const i = s.tab as number;
    const tiers = s.curve.tiers.map((t, j) => (j === i ? { ...t, manual, count: manual.length } : t));
    return edit({ ...s.curve, tiers }, i, clamp(drawing, 0, manual.length - 1));
  };
  const withTier = (update: (t: CurveTier) => CurveTier) => {
    const i = s.tab;
    if (i === 'fallback' || !s.curve.tiers[i]) return s;
    return edit({ ...s.curve, tiers: s.curve.tiers.map((t, j) => (j === i ? update(t) : t)) });
  };
  switch (a.type) {
    case 'load': return { ...s, curve: a.curve, basis: a.basis, dirty: false, drawing: 0, tab: typeof s.tab === 'number' ? Math.min(s.tab, a.curve.tiers.length - 1) : s.tab };
    case 'tab': return { ...s, drawing: 0, tab: a.tab === 'fallback' ? a.tab : clamp(a.tab, 0, s.curve.tiers.length - 1) };
    case 'scope': return { ...s, scope: a.scope };
    case 'params': {
      if (s.tab === 'fallback') return edit({ ...s.curve, fallback: paramsToFallback(paramsReducer(poolParams(s), a.action)) });
      if (!s.curve.tiers[s.tab]) return s;
      return edit({ ...s.curve, tiers: applyParams(s.curve.tiers, s.tab, a.action, s.scope) });
    }
    case 'constraints':
      if (s.tab === 'fallback' || !s.curve.tiers[s.tab]) return s;
      return edit({ ...s.curve, tiers: applyConstraints(s.curve.tiers, s.tab, a.patch, s.scope) });
    case 'count': return tier?.manual ? s : withTier(t => ({ ...t, count: clamp(a.value, 1, MAX_TIER_COUNT) }));
    case 'tierSource': {
      if (!tier) return s;
      if (a.source === 'draw') {
        if (tier.manual) return s;
        const figures = a.figures?.length ? a.figures.slice(0, MAX_TIER_COUNT) : [EMPTY_FIGURE];
        return withDrawings(figures, 0);
      }
      if (!tier.manual) return s;
      const { manual: _drawn, ...generated } = tier;
      return withTier(() => generated);
    }
    case 'openDrawing': return tier?.manual ? { ...s, drawing: clamp(a.index, 0, tier.manual.length - 1) } : s;
    case 'setDrawing':
      if (!tier?.manual?.[a.index]) return s;
      return withDrawings(tier.manual.map((f, j) => (j === a.index ? a.figure : f)), a.index);
    case 'addDrawing':
      if (!tier?.manual || tier.manual.length >= MAX_TIER_COUNT) return s;
      return withDrawings([...tier.manual.slice(0, s.drawing + 1), EMPTY_FIGURE, ...tier.manual.slice(s.drawing + 1)], s.drawing + 1);
    case 'removeDrawing':
      if (!tier?.manual || tier.manual.length <= 1 || !tier.manual[a.index]) return s;
      return withDrawings(tier.manual.filter((_, j) => j !== a.index), a.index > s.drawing ? s.drawing : s.drawing - 1);
    case 'shape': {
      const last = s.curve.tiers.length - 1;
      const from = clamp(Math.min(a.from, a.to), 0, last), to = clamp(Math.max(a.from, a.to), 0, last);
      return edit({ ...s.curve, tiers: s.curve.tiers.map((t, i) => (i >= from && i <= to ? { ...t, options: withShape(t.options, a.shape) } : t)) });
    }
    case 'addTier': {
      const i = s.tab === 'fallback' ? s.curve.tiers.length - 1 : s.tab;
      const t = s.curve.tiers[i];
      const copy: CurveTier = { ...t, options: { ...t.options }, ...(t.constraints && { constraints: { ...t.constraints } }), ...(t.manual && { manual: [...t.manual] }) };
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
