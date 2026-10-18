import type { PlaySet, SiteResult } from './types';

/** One survival run lasts this long, from the moment the first site is on the board. */
export const SURVIVAL_LIMIT_MS = 180_000;

/** A survival run has no fixed length: the board always holds one site, and the plaque counts them. */
export const SURVIVAL_SET: PlaySet = {
  count: 1, open: true, unitLabel: 'SITE', finishLabel: 'NEXT SITE',
  name: () => 'SURVIVAL SHIFT',
};

/** Time left on the clock. The caller passes `now`: nothing in the domain reads the wall clock. */
export const remainingMs = (startedAt: number, now: number, limit: number = SURVIVAL_LIMIT_MS): number =>
  Math.max(0, limit - Math.max(0, now - startedAt));

export const isOver = (startedAt: number, now: number, limit: number = SURVIVAL_LIMIT_MS): boolean =>
  remainingMs(startedAt, now, limit) === 0;

/** "2:59" for the clock: a started second counts as a whole one, so 0:00 means time is truly up. */
export function formatClock(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export interface RunSummary {
  /** sites flattened */
  sites: number;
  /** of those, how many on budget */
  perfect: number;
  /** sum of each site's score, so a site cleared over budget is worth less */
  score: number;
}

export function runSummary(results: readonly SiteResult[]): RunSummary {
  return {
    sites: results.length,
    perfect: results.filter(r => r.status === 'perfect').length,
    score: results.reduce((sum, r) => sum + r.score, 0),
  };
}

/** The better of two runs: more sites first, then the higher score. */
export function betterRun(a: RunSummary | null, b: RunSummary): RunSummary {
  if (!a) return b;
  if (b.sites !== a.sites) return b.sites > a.sites ? b : a;
  return b.score > a.score ? b : a;
}

/** One line of the survival leaderboard: a player's best run (the `leaderboard_survival` view). */
export interface SurvivalBoardRow {
  user_id: string;
  username: string | null;
  sites: number;
  perfect: number;
  score: number;
}

/** The better of two runs when either may be missing: a record kept on the server and one from this session. */
export const mergeBest = (a: RunSummary | null, b: RunSummary | null): RunSummary | null =>
  b ? betterRun(a, b) : a;

/** The dashboard card's headline, null until a run has cleared a site. */
export function survivalHeadline(best: RunSummary | null): string | null {
  if (!best || best.sites === 0) return null;
  return `BEST: ${best.sites} ${best.sites === 1 ? 'SITE' : 'SITES'} · ${best.score.toLocaleString()} PTS`;
}
