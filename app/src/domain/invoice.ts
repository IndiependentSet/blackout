import { totalScore } from './scoring';
import type { SiteResult } from './types';

/** The shareable "daily invoice" text. */
export function shareText(day: number, results: (SiteResult | null)[]): string {
  const glyphs = results.map(r => (r && r.status === 'perfect' ? '🐾' : '⬜')).join('');
  const grades = results.map(r => (r ? r.grade : '–')).join('');
  return 'CATASTROPHE INC. #' + day + '\n' + glyphs + '\n' + grades + '  ' + totalScore(results).toLocaleString() + ' pts';
}
