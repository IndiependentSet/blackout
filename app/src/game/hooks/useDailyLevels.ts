import { useCallback } from 'react';
import type { Level } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import { getDailyLevels } from '../../services/repositories/dailyLevels';
import { withTimeout } from '../../services/result';

/** How long the work order waits for the published week before generating it on the device. */
export const DAILY_LEVELS_TIMEOUT_MS = 5000;

export interface DailyLevels {
  /** 'loading' until the server answers; 'published' when the day's seven levels came from it;
      'missing' when they didn't (not generated yet, or the read failed) and the device has to build them */
  status: 'loading' | 'published' | 'missing';
  levels: Level[] | null;
}

/* The week every player shares: the levels the scheduled job stored for `day`. */
export function useDailyLevels(day: number): DailyLevels {
  const load = useCallback(() => withTimeout(getDailyLevels(day), DAILY_LEVELS_TIMEOUT_MS), [day]);
  const res = useResource('daily-levels:' + day, load);
  if (res.loading) return { status: 'loading', levels: null };
  if (res.error !== null || !res.data) return { status: 'missing', levels: null };
  return { status: 'published', levels: res.data };
}
