import type { Level, SiteResult } from '../../../../domain/types';

/** Where tonight stands: how many skies are charted, which one to open next, and whether the night is done. */
export interface TonightState {
  charted: number;
  atPar: number;
  total: number;
  /** the sky "Continue" opens: the open one if it isn't charted yet, else the first one that isn't */
  next: number;
  done: boolean;
}

export function tonightState(results: (SiteResult | null)[], idx: number): TonightState {
  const charted = results.filter(Boolean).length;
  const atPar = results.filter(r => r && r.status === 'perfect').length;
  const firstOpen = results.findIndex(r => !r);
  const next = !results[idx] ? idx : firstOpen >= 0 ? firstOpen : idx;
  return { charted, atPar, total: results.length, next, done: charted === results.length };
}

/** The sky to show on the night's card: the next one to chart, or the last one once the night is done. */
export const previewLevel = (levels: (Level | null)[], t: TonightState): Level | null =>
  levels[t.done ? levels.length - 1 : t.next] ?? null;
