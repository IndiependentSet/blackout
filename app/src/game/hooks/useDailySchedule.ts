import { useCallback } from 'react';
import type { GenerationSchedule } from '../../domain/generation';
import { resolveSchedule } from '../../domain/generationConfig';
import { useResource } from '../../hooks/useResource';
import { configInForce } from '../../services/repositories/generationConfigs';
import { withTimeout } from '../../services/result';

/** How long the work order waits for today's config before playing the default. */
export const SCHEDULE_TIMEOUT_MS = 5000;

export interface DailySchedule {
  /** null while today's config is loading */
  schedule: GenerationSchedule | null;
  /** false when the config couldn't be loaded (or didn't parse) and the
      default is being played instead: those levels may not be everyone's,
      so their clears stay off the leaderboard */
  onSchedule: boolean;
}

/* The schedule today's week is generated from: the admin-saved config in
   force on `day`, or the default when there is none. */
export function useDailySchedule(day: number): DailySchedule {
  const load = useCallback(() => withTimeout(configInForce('daily', day), SCHEDULE_TIMEOUT_MS), [day]);
  const res = useResource('daily:' + day, load);
  if (res.loading) return { schedule: null, onSchedule: true };
  if (res.error !== null) return { schedule: resolveSchedule(null).schedule, onSchedule: false };
  const resolved = resolveSchedule(res.data ?? null);
  return { schedule: resolved.schedule, onSchedule: resolved.source !== 'invalid' };
}
