import type { Grade, Level, RunStatus, ScoreRow, SiteResult } from './types';

/* Client-side mirror of site_clears.score, the generated column in
   app/sql/2026-09-07-weighted-score.sql. The score card and the leaderboard
   must never drift apart: change this, change the SQL. */
export const POINTS_PER_STAR = 10;
export const OVER_PAR_PENALTY = 5;

export function siteScore(stars: number, catsUsed: number, par: number): number {
  return Math.max(0, stars * POINTS_PER_STAR - (catsUsed - par) * OVER_PAR_PENALTY);
}
export function siteBest(stars: number): number {
  return stars * POINTS_PER_STAR;
}

/** Grade thresholds against score/best (the design's own cutoffs). */
export function siteGrade(score: number, best: number): Grade {
  const g = best ? score / best : 0;
  return g >= 0.999 ? 'S' : g >= 0.86 ? 'A' : g >= 0.68 ? 'B' : g >= 0.45 ? 'C' : 'D';
}

/** Score a finished run: the breakdown rows the score card counts through. */
export function scoreRun(lv: Pick<Level, 'stars' | 'k'>, used: number): SiteResult {
  const score = siteScore(lv.stars, used, lv.k);
  const best = siteBest(lv.stars);
  const rows: ScoreRow[] = [
    { label: 'SITE DIFFICULTY', note: '✦'.repeat(lv.stars) + ' × ' + POINTS_PER_STAR, v: lv.stars * POINTS_PER_STAR },
  ];
  if (used <= lv.k) rows.push({ label: 'ON BUDGET', note: used + '/' + lv.k + ' CATS', v: 0 });
  else rows.push({ label: 'OVER BUDGET', note: '+' + (used - lv.k) + ' CAT × ' + OVER_PAR_PENALTY, v: -OVER_PAR_PENALTY * (used - lv.k) });
  const status: RunStatus = used <= lv.k ? 'perfect' : 'over';
  return { status, score, best, grade: siteGrade(score, best), used, par: lv.k, stars: lv.stars, rows };
}

/** Keep-best: a replay only replaces the stored result when it scores better
    (mirrors the DB's site_clears_keep_best trigger). */
export function keepBest(prev: SiteResult | null | undefined, run: SiteResult): SiteResult {
  return prev && prev.score >= run.score ? prev : run;
}

export const totalScore = (results: (SiteResult | null)[]) =>
  results.reduce((sum, r) => sum + (r ? r.score : 0), 0);

/** Rebuild a day's results from what was stored (used, par, stars), one slot per site; rows outside the day's sites,
    or with a star count the game never plays, are left out. */
export function resultsFromClears(
  rows: readonly { site: number; used: number; par: number; stars: number }[], count: number,
): (SiteResult | null)[] {
  const out: (SiteResult | null)[] = Array(count).fill(null);
  for (const r of rows) {
    if (!Number.isInteger(r.site) || r.site < 0 || r.site >= count) continue;
    if (r.stars !== 1 && r.stars !== 2 && r.stars !== 3) continue;
    out[r.site] = scoreRun({ stars: r.stars, k: r.par }, r.used);
  }
  return out;
}
