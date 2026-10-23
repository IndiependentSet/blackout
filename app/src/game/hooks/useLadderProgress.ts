import { useResource } from '../../hooks/useResource';
import { getLadderProgress, type LadderProgress } from '../../services/repositories/leaderboards';

/** How many ranked duels the player has played, ever and this month, so a ladder can say how far they are from standing on it.
    Null while it loads, signed out, or when `enabled` is false; a failed read says nothing (it is a hint, never a reason to block). */
export function useLadderProgress(userId: string | null, enabled = true): LadderProgress | null {
  const res = useResource(enabled && userId ? 'ladder-progress:' + userId : null, () => getLadderProgress());
  return res.data ?? null;
}
