/* What a schedule makes on a given day, site by site, timed. Runs inside the
   preview worker; kept apart from it so it can be tested on the main thread. */
import { levelForSiteReport, type GenerationSchedule } from '../../domain/generation';
import type { Level } from '../../domain/types';

export interface PreviewRequest { schedule: GenerationSchedule; daySeed: number }

export interface SitePreview {
  level: Level;
  /** the retry that produced the level; null when the schedule's fallback did */
  salt: number | null;
  /** generation wall time, as a player's device would spend it (on this machine) */
  ms: number;
}

export function previewDay({ schedule, daySeed }: PreviewRequest, now: () => number = () => performance.now()): SitePreview[] {
  return schedule.sites.map((_, i) => {
    const t0 = now();
    const { level, salt } = levelForSiteReport(schedule, daySeed, i);
    return { level, salt, ms: Math.round(now() - t0) };
  });
}
