import { tallyNights } from '../../domain/nights';
import type { Night, SiteResult } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import { getClearsBetween } from '../../services/repositories/siteClears';

/* How each night from `fromDay` to `toDay` went, for the moon calendars. Tonight also counts what is on the board
   right now, so a signed-out player (or a clear still being saved) sees tonight's moon fill as they play. A failed
   read shows tonight only: moons are a bonus, never a reason to block a screen. */
export function useNights(userId: string | null, fromDay: number, toDay: number, today: number, tonight: (SiteResult | null)[]): Night[] {
  const res = useResource(userId ? `nights:${userId}:${fromDay}:${toDay}` : null, () => getClearsBetween(userId, fromDay, toDay));
  const rows = [...(res.data ?? [])];
  if (today >= fromDay && today <= toDay) {
    tonight.forEach((r, site) => { if (r) rows.push({ day: today, site, perfect: r.status === 'perfect' }); });
  }
  return tallyNights(rows);
}
