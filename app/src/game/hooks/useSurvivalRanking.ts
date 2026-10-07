import { useResource } from '../../hooks/useResource';
import { mergeBest, type RunSummary, type SurvivalBoardRow } from '../../domain/survival';
import { getBestRun, getSurvivalLeaderboard } from '../../services/repositories/survival';

/** The survival leaderboard, held off (`undefined` data) until `ready`, so it is read after the last site was banked. */
export function useSurvivalBoard(ready: boolean): { rows: SurvivalBoardRow[] | undefined; loading: boolean } {
  const board = useResource(ready ? 'survival-board' : null, () => getSurvivalLeaderboard());
  return { rows: board.data, loading: board.loading };
}

/** The player's best run on the server, null when signed out or before a first site. Read once, so it never includes the run in progress. */
export function useServerBest(userId: string | null): RunSummary | null {
  const best = useResource(userId ? 'survival-best:' + userId : null, () => getBestRun(userId));
  return best.data ?? null;
}

/** The best run to show for a player: the server's record or this session's, whichever is better. */
export function useSurvivalBest(userId: string | null, sessionBest: RunSummary | null): RunSummary | null {
  return mergeBest(sessionBest, useServerBest(userId));
}
