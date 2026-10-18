import { groupMatches } from '../../domain/match';
import { useResource } from '../../hooks/useResource';
import { closeExpiredMatches, listMyMatches } from '../../services/repositories/matches';
import { ok } from '../../services/result';

/* How many 1vs1 challenges are waiting for the player's answer, for the dashboard card. `active: false` holds the
   request off, so the dashboard can ask again each time it comes back into view. Expired invitations are settled
   first, so a lapsed one is not counted. A failed or missing answer reads as none: the card is only a nudge. */
export function useIncomingChallenges(userId: string | null, active = true): number {
  const res = useResource<number>(userId && active ? 'challenges:' + userId : null, async () => {
    await closeExpiredMatches();
    const r = await listMyMatches(userId as string);
    return r.ok ? ok(groupMatches(r.data, userId as string).incoming.length) : r;
  });
  return res.data ?? 0;
}
