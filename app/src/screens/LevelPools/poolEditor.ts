/* The pool page's draft: which mode, and the curve being edited. Pure. */
import type { PoolMode } from '../../domain/gameModes';
import { DEFAULT_CURVES, OPTION_LIMITS, type CurveTier, type LevelCurve } from '../../domain/generation';
import type { Stars } from '../../domain/types';

export interface PoolEditor {
  mode: PoolMode;
  curve: LevelCurve;
  /** what the draft started from, for the header */
  basis: string;
  dirty: boolean;
}

export type PoolEditorAction =
  | { type: 'mode'; mode: PoolMode }
  | { type: 'load'; curve: LevelCurve; basis: string }
  | { type: 'tier'; index: number; patch: { count?: number; size?: number; diff?: number } }
  | { type: 'addTier' }
  | { type: 'removeTier'; index: number }
  | { type: 'meta'; patch: Partial<Pick<LevelCurve, 'seed' | 'retries'>> };

export const MAX_TIER_COUNT = 400;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

export const initialPoolEditor = (mode: PoolMode = 'campaign'): PoolEditor =>
  ({ mode, curve: DEFAULT_CURVES[mode], basis: 'the default', dirty: false });

export function poolEditorReducer(s: PoolEditor, a: PoolEditorAction): PoolEditor {
  const edit = (curve: LevelCurve): PoolEditor => ({ ...s, curve, dirty: true });
  switch (a.type) {
    case 'mode': return initialPoolEditor(a.mode);
    case 'load': return { ...s, curve: a.curve, basis: a.basis, dirty: false };
    case 'tier': {
      const t = s.curve.tiers[a.index];
      if (!t) return s;
      const { count, size, diff } = a.patch;
      const next: CurveTier = {
        ...t,
        ...(count !== undefined && { count: clamp(count, 1, MAX_TIER_COUNT) }),
        ...(size !== undefined && { size: clamp(size, OPTION_LIMITS.size.min, OPTION_LIMITS.size.max) }),
        ...(diff !== undefined && { diff: clamp(diff, 1, 3) as Stars }),
      };
      return edit({ ...s.curve, tiers: s.curve.tiers.map((x, i) => (i === a.index ? next : x)) });
    }
    case 'addTier': {
      const last = s.curve.tiers[s.curve.tiers.length - 1];
      return edit({ ...s.curve, tiers: [...s.curve.tiers, { ...last, options: { ...last.options } }] });
    }
    case 'removeTier':
      return s.curve.tiers.length <= 1 ? s : edit({ ...s.curve, tiers: s.curve.tiers.filter((_, i) => i !== a.index) });
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
