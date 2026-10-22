import { useResource } from '../../hooks/useResource';
import type { LadderRow } from '../../domain/types';
import { getLadder, getMyLadderRow } from '../../services/repositories/matches';
import type { Result } from '../../services/result';

/** What the ladder talks to, so a test can hand in fakes. */
export interface LadderDeps {
  ladder: () => Promise<Result<LadderRow[]>>;
  mine: (userId: string) => Promise<Result<LadderRow | null>>;
}

export const defaultLadderDeps: LadderDeps = { ladder: () => getLadder(), mine: getMyLadderRow };

/** The ranked ladder and the player's own row (which may be below the cut, or not exist yet). */
export function useLadder(userId: string, deps: LadderDeps = defaultLadderDeps) {
  const board = useResource('ladder', () => deps.ladder());
  const mine = useResource('ladder-mine:' + userId, () => deps.mine(userId));
  return { rows: board.data ?? [], mine: mine.data ?? null, loading: board.loading, error: board.error, reload: () => { board.reload(); mine.reload(); } };
}
