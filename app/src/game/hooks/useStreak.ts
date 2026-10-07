import type { Streak } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import { getStreak, NO_STREAK } from '../../services/repositories/streaks';

/* The player's daily streak. `active: false` holds the request off, so a screen can ask again each time it comes back into view; a failed
   or missing answer reads as no streak, because a streak is a bonus line, not something to block a screen on. */
export function useStreak(userId: string | null, active = true): Streak {
  const res = useResource<Streak>(userId && active ? 'streak:' + userId : null, () => getStreak(userId));
  return res.data ?? NO_STREAK;
}
