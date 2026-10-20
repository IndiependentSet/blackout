import type { PlayerScore } from '../../domain/types';

const BAR_MAX = 46;

/** How much of the bar each side fills, as a percentage; the larger score gets the full 46. */
export function bar(a: number, b: number): [number, number] {
  const m = Math.max(a, b, 1);
  return [Math.round((a / m) * BAR_MAX), Math.round((b / m) * BAR_MAX)];
}

export type Scores = Pick<PlayerScore, 'score' | 'week_score'>;
export const NO_SCORES: Scores = { score: 0, week_score: 0 };

export function verdict(mine: number, theirs: number): string {
  if (mine === theirs) return 'DEAD HEAT — SOMEBODY HIRE MORE CATS';
  return mine > theirs ? 'YOU’RE AHEAD BY ' + (mine - theirs) + ' SITES' : 'BEHIND BY ' + (theirs - mine) + ' SITES';
}
