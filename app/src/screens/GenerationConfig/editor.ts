/* The generation config page's draft: a whole schedule being edited one rule
   at a time (a site, or the fallback) through the playground's params. Pure. */
import { DEFAULT_SCHEDULE, withShape, type GenerationSchedule, type LevelConstraints, type Shape } from '../../domain/generation';
import { applyConstraints, applyParams, type EditScope } from '../Playground/scope';
import {
  fallbackToParams, paramsReducer, paramsToFallback, siteToParams, type ParamsAction, type PlaygroundParams,
} from '../Playground/params';

/** a site index, or the fallback rule */
export type Tab = number | 'fallback';

export interface EditorState {
  schedule: GenerationSchedule;
  tab: Tab;
  /** whether a settings-panel edit reaches the open sky only, or every sky */
  scope: EditScope;
  /** where the draft came from, e.g. "the default" or "day 182's config" */
  basis: string;
  /** edited since it was loaded or saved */
  dirty: boolean;
}

export type EditorAction =
  | { type: 'params'; action: ParamsAction }
  | { type: 'constraints'; patch: Partial<Record<keyof LevelConstraints, number | null>> }
  | { type: 'retries'; value: number }
  /** a recipe's shape onto skies from..to (inclusive, clamped) */
  | { type: 'shape'; shape: Shape; from: number; to: number }
  | { type: 'tab'; tab: Tab }
  | { type: 'scope'; scope: EditScope }
  | { type: 'load'; schedule: GenerationSchedule; basis: string }
  | { type: 'saved'; basis: string };

export const initialEditor = (schedule: GenerationSchedule = DEFAULT_SCHEDULE, basis = 'the default'): EditorState =>
  ({ schedule, tab: 0, scope: 'one', basis, dirty: false });

/** The params the panel shows for the open tab. */
export function tabParams(s: EditorState): PlaygroundParams {
  if (s.tab === 'fallback') return fallbackToParams(s.schedule.fallback, s.schedule.sites[0]?.size ?? 10);
  return siteToParams(s.schedule.sites[s.tab], 0);
}

/** The open site's constraints (none for the fallback, which ignores them). */
export const tabConstraints = (s: EditorState): LevelConstraints =>
  (s.tab === 'fallback' ? {} : s.schedule.sites[s.tab].constraints ?? {});

const edited = (s: EditorState, schedule: GenerationSchedule): EditorState => ({ ...s, schedule, dirty: true });

export function editorReducer(s: EditorState, a: EditorAction): EditorState {
  switch (a.type) {
    case 'params': {
      if (s.tab === 'fallback') return edited(s, { ...s.schedule, fallback: paramsToFallback(paramsReducer(tabParams(s), a.action)) });
      return edited(s, { ...s.schedule, sites: applyParams(s.schedule.sites, s.tab, a.action, s.scope) });
    }
    case 'constraints': {
      if (s.tab === 'fallback') return s;
      return edited(s, { ...s.schedule, sites: applyConstraints(s.schedule.sites, s.tab, a.patch, s.scope) });
    }
    case 'retries': return edited(s, { ...s.schedule, retries: a.value });
    case 'shape': {
      const last = s.schedule.sites.length - 1;
      const lo = Math.max(0, Math.min(a.from, a.to, last)), hi = Math.min(last, Math.max(a.from, a.to, 0));
      return edited(s, { ...s.schedule, sites: s.schedule.sites.map((site, i) => (i >= lo && i <= hi ? { ...site, options: withShape(site.options, a.shape) } : site)) });
    }
    case 'tab': return { ...s, tab: a.tab };
    case 'scope': return { ...s, scope: a.scope };
    case 'load': return { ...initialEditor(a.schedule, a.basis), tab: s.tab, scope: s.scope };
    case 'saved': return { ...s, basis: a.basis, dirty: false };
  }
}
