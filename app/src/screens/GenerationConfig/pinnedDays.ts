/* The Tonight page's hand-drawn days: a drawing being pinned to one site of one future day, and the skies already
   pinned. Pure. */
import { EMPTY_FIGURE } from '../../domain/generation';
import type { SkyFigure } from '../../domain/types';
import type { PinnedSky } from '../../services/repositories/dailyManualLevels';

export interface ManualDraft {
  day: number;
  idx: number;
  figure: SkyFigure;
  /** drawn on since it was opened or pinned */
  dirty: boolean;
}

export const newDraft = (day: number, idx = 0): ManualDraft => ({ day, idx, figure: EMPTY_FIGURE, dirty: false });

/** The sky pinned to a day's site, if any. */
export const pinnedAt = (list: readonly PinnedSky[], day: number, idx: number): PinnedSky | undefined =>
  list.find(p => p.day === day && p.idx === idx);

/** The sites of a day that have a hand-drawn sky, in order. */
export const pinnedSites = (list: readonly PinnedSky[], day: number): number[] =>
  list.filter(p => p.day === day).map(p => p.idx).sort((a, b) => a - b);

/** Open a day's site: what is pinned there, else a blank drawing. */
export function openSlot(list: readonly PinnedSky[], day: number, idx: number): ManualDraft {
  const p = pinnedAt(list, day, idx);
  return p ? { day, idx, figure: p.figure, dirty: false } : newDraft(day, idx);
}
