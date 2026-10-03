import { coveredEdges, isCleared } from '../../domain/cover';
import { LAST_SITE, SITE_COUNT } from '../../domain/sites';
import type { Level, SiteResult } from '../../domain/types';

/** Colour of the "cats hired" count: green on budget, pink over, plain under. */
export type BudgetTone = 'under' | 'at' | 'over';
export const budgetTone = (used: number, par: number): BudgetTone => (used > par ? 'over' : used === par ? 'at' : 'under');

export interface Hud {
  used: number;
  par: number;
  lit: number;
  edgeCount: number;
  tone: BudgetTone;
}
export function hud(lv: Level | null, placed: number[]): Hud {
  if (!lv) return { used: placed.length, par: 0, lit: 0, edgeCount: 0, tone: 'under' };
  return {
    used: placed.length, par: lv.k, edgeCount: lv.edges.length,
    lit: coveredEdges(lv, placed).size, tone: budgetTone(placed.length, lv.k),
  };
}

export interface Banner {
  text: string;
  /** cleared on budget / cleared over budget / still working */
  tone: 'perfect' | 'over' | 'working';
  /** can NEXT be pressed? */
  canAdvance: boolean;
  nextLabel: string;
}
export function banner(lv: Level | null, placed: number[], idx: number): Banner {
  const nextLabel = idx < LAST_SITE ? 'NEXT SITE' : 'WEEK DONE';
  if (lv && isCleared(lv, placed)) {
    const perfect = placed.length <= lv.k;
    return {
      text: perfect ? 'SITE CLEARED — ON BUDGET ' + lv.k + '/' + lv.k : 'CLEARED — BUT ' + placed.length + '/' + lv.k + ' CATS',
      tone: perfect ? 'perfect' : 'over', canAdvance: idx < LAST_SITE, nextLabel,
    };
  }
  return { text: 'SITE ' + (idx + 1) + '/' + SITE_COUNT + ' · BUDGET ' + (lv ? lv.k : 0) + ' CATS', tone: 'working', canAdvance: false, nextLabel: 'NEXT' };
}

/** Message under the board: whatever was last said, or a nudge once the budget is spent. */
export function statusMessage(lv: Level | null, placed: number[], msg: string): string {
  if (!msg && lv && placed.length && placed.length >= lv.k && !isCleared(lv, placed)) return 'SOMETHING IS STILL STANDING…';
  return msg;
}
export const isWarning = (msg: string) => msg.startsWith('PAYROLL') || msg.startsWith('SCORE NOT SAVED');

export type PipState = 'current' | 'perfect' | 'over' | 'ready' | 'pending';
export interface Pip { i: number; n: number; grade: string; state: PipState }
/** The row of site buttons: which are done, which is open, which are still being generated. */
export function pips(results: (SiteResult | null)[], levels: (Level | null)[], idx: number): Pip[] {
  return Array.from({ length: SITE_COUNT }, (_, i) => {
    const r = results[i];
    const state: PipState = i === idx ? 'current' : r ? (r.status === 'perfect' ? 'perfect' : 'over') : levels[i] ? 'ready' : 'pending';
    return { i, n: i + 1, grade: r ? r.grade : '', state };
  });
}

export const perfectCount = (results: (SiteResult | null)[]) => results.filter(r => r && r.status === 'perfect').length;
export const scoredCount = (results: (SiteResult | null)[]) => results.filter(Boolean).length;
