/* How the preview's week strip words each site. Pure. */
import { dayStartUtc } from '../../domain/calendar';
import type { SitePreview } from '../../services/generation/scheduleClient';

/** past this, a site is a noticeably frozen screen on a phone, which generates it on the main thread */
export const SLOW_MS = 1000;

/** One cell of the week strip: what a site came out as. */
export function siteSummary(s: SitePreview): { line: string; made: string; slow: boolean } {
  return {
    line: `${s.level.nodes.length} nodes · par ${s.level.k} · ${'★'.repeat(s.level.stars)}`,
    made: s.salt === null ? 'fallback' : s.salt === 0 ? 'first try' : `try ${s.salt + 1}`,
    slow: s.ms > SLOW_MS,
  };
}

/** "Thu, 8 Oct 2026": the calendar date a puzzle day starts on (UTC, like the day itself). */
export const dayLabel = (day: number): string =>
  new Date(dayStartUtc(day)).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
