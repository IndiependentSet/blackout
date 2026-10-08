import type { SiteResult } from '../../domain/types';

/** Whether the cleared run was written to the leaderboard. */
export type SaveStatus =
  | { kind: 'saving' } | { kind: 'saved' } | { kind: 'anon' } | { kind: 'offSchedule' } | { kind: 'error'; message: string };

/** Why a clear isn't written to the leaderboard, or null when it should be.
    Off schedule (today's generation config couldn't be loaded, so the level
    may not be the one everyone else got) wins over signed out: signing in
    wouldn't help. */
export function skipSave(userId: string | null, onSchedule: boolean): SaveStatus | null {
  if (!onSchedule) return { kind: 'offSchedule' };
  if (!userId) return { kind: 'anon' };
  return null;
}

export const SAVE_FAILED = 'SCORE NOT SAVED — ';

export function saveNote(status: SaveStatus | null): string {
  if (!status) return '';
  switch (status.kind) {
    case 'saving': return 'SAVING…';
    case 'saved': return 'SAVED TO YOUR LEDGER';
    case 'anon': return 'SIGN IN TO SAVE YOUR SCORE';
    case 'offSchedule': return 'OFF-SCHEDULE: NOT ON THE BOARD';
    case 'error': return SAVE_FAILED + status.message;
  }
}

export const cardTitle = (run: SiteResult) => (run.status === 'perfect' ? 'SITE CLEARED' : 'CLEARED — OVER BUDGET');

/** The line under the total, shown once the count-up has landed. */
export function bestNote(run: SiteResult, prevScore: number, counted: boolean): string {
  if (!counted) return '';
  if (prevScore) {
    return run.score > prevScore
      ? 'NEW BEST — BEAT ' + prevScore.toLocaleString()
      : 'BEST STANDS AT ' + prevScore.toLocaleString();
  }
  return run.grade === 'S' ? 'FLAWLESS. THE CLIENT IS WEEPING.' : 'PERFECT RUN PAYS ' + run.best.toLocaleString();
}

export const signed = (v: number) => (v > 0 ? '+' : '') + v.toLocaleString();
