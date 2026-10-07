/* The generation config page's draft: a whole schedule being edited one rule
   at a time (a site, or the fallback) through the playground's params. Pure. */
import { DEFAULT_SCHEDULE, type GenerationSchedule, type LevelConstraints } from '../../domain/generation';
import {
  fallbackToParams, paramsReducer, paramsToFallback, paramsToSite, siteToParams, type ParamsAction, type PlaygroundParams,
} from '../Playground/params';

/** a site index, or the fallback rule */
export type Tab = number | 'fallback';

export interface EditorState {
  schedule: GenerationSchedule;
  tab: Tab;
  /** where the draft came from, e.g. "the default" or "day 182's config" */
  basis: string;
  /** edited since it was loaded or saved */
  dirty: boolean;
}

export type EditorAction =
  | { type: 'params'; action: ParamsAction }
  | { type: 'constraints'; patch: Partial<Record<keyof LevelConstraints, number | null>> }
  | { type: 'retries'; value: number }
  | { type: 'tab'; tab: Tab }
  | { type: 'load'; schedule: GenerationSchedule; basis: string }
  | { type: 'saved'; basis: string };

export const initialEditor = (schedule: GenerationSchedule = DEFAULT_SCHEDULE, basis = 'the default'): EditorState =>
  ({ schedule, tab: 0, basis, dirty: false });

/** The params the panel shows for the open tab. */
export function tabParams(s: EditorState): PlaygroundParams {
  if (s.tab === 'fallback') return fallbackToParams(s.schedule.fallback, s.schedule.sites[0]?.size ?? 10);
  return siteToParams(s.schedule.sites[s.tab], 0);
}

/** The open site's constraints (none for the fallback, which ignores them). */
export const tabConstraints = (s: EditorState): LevelConstraints =>
  (s.tab === 'fallback' ? {} : s.schedule.sites[s.tab].constraints ?? {});

const edited = (s: EditorState, schedule: GenerationSchedule): EditorState => ({ ...s, schedule, dirty: true });

function withSite(s: EditorState, idx: number, update: (site: GenerationSchedule['sites'][number]) => GenerationSchedule['sites'][number]) {
  return edited(s, { ...s.schedule, sites: s.schedule.sites.map((site, i) => (i === idx ? update(site) : site)) });
}

export function editorReducer(s: EditorState, a: EditorAction): EditorState {
  switch (a.type) {
    case 'params': {
      const next = paramsReducer(tabParams(s), a.action);
      if (s.tab === 'fallback') return edited(s, { ...s.schedule, fallback: paramsToFallback(next) });
      return withSite(s, s.tab, site => paramsToSite(next, site.constraints));
    }
    case 'constraints': {
      if (s.tab === 'fallback') return s;
      return withSite(s, s.tab, site => {
        const merged: Record<string, number | null | undefined> = { ...site.constraints, ...a.patch };
        const constraints = Object.fromEntries(Object.entries(merged).filter(([, v]) => typeof v === 'number')) as LevelConstraints;
        const { constraints: _old, ...rest } = site;
        return Object.keys(constraints).length ? { ...rest, constraints } : rest;
      });
    }
    case 'retries': return edited(s, { ...s.schedule, retries: a.value });
    case 'tab': return { ...s, tab: a.tab };
    case 'load': return { ...initialEditor(a.schedule, a.basis), tab: s.tab };
    case 'saved': return { ...s, basis: a.basis, dirty: false };
  }
}
