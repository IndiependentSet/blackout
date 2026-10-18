import { useCallback } from 'react';
import type { PoolMode } from '../../domain/gameModes';
import { useResource } from '../../hooks/useResource';
import { listPools } from '../../services/repositories/levelPools';

/** loading · published: a pool is live · empty: an admin has not published one yet · unknown: the server could not say (play on, the levels will report their own failure) */
export type PoolState = 'loading' | 'published' | 'empty' | 'unknown';

/* Whether a mode has any levels to play yet, so its screen can say so instead of waiting for levels that will never come. */
export function usePoolPublished(mode: PoolMode): PoolState {
  const load = useCallback(() => listPools(mode), [mode]);
  const pools = useResource('published:' + mode, load);
  if (pools.loading) return 'loading';
  if (pools.error !== null || !pools.data) return 'unknown';
  return pools.data.length ? 'published' : 'empty';
}
