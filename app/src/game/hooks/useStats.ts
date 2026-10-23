import type { PlayerStats } from '../../domain/stats';
import { useResource } from '../../hooks/useResource';
import { getPlayerStats } from '../../services/repositories/stats';

/** The signed-in player's numbers, read once when the page opens. Signed out there is nothing to read (`stats` stays undefined). */
export function useStats(userId: string | null): { stats: PlayerStats | undefined; loading: boolean; error: string | null } {
  const res = useResource(userId ? 'stats:' + userId : null, () => getPlayerStats());
  return { stats: res.data, loading: res.loading, error: res.error };
}
