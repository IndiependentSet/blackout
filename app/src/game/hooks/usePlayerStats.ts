import type { BoardScope } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import { getLeaderboard } from '../../services/repositories/leaderboards';
import { getMatchRecord } from '../../services/repositories/matches';
import { getAllTimeCount } from '../../services/repositories/siteClears';

/* What a player's own page shows about them: sites cleared at par ever, their duel record, and the board for a scope
   (their place on it included). Each read is a bonus line: a failure shows as nothing, never as a blocked page. */
export function usePlayerStats(userId: string | null, scope: BoardScope = 'week') {
  const atPar = useResource(userId ? 'alltime:' + userId : null, () => getAllTimeCount(userId));
  const duels = useResource(userId ? 'record:' + userId : null, () => getMatchRecord(userId));
  const board = useResource('board:' + scope, () => getLeaderboard(scope));
  const rows = board.data ?? [];
  const rank = userId ? rows.findIndex(r => r.user_id === userId) : -1;
  return {
    atPar: atPar.data ?? 0,
    duels: duels.data ?? null,
    board: rows,
    boardError: board.error,
    rank: rank >= 0 ? rank + 1 : null,
  };
}
