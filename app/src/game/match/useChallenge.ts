import { useState } from 'react';
import { createMatch } from '../../services/repositories/matches';

export interface Challenger {
  /** challenge a fellow stargazer to a friendly duel: the new match's id, or null when the server said no (see `error`) */
  challenge: (friendId: string) => Promise<string | null>;
  busy: boolean;
  error: string | null;
}

/* Starting a challenge from somewhere other than the duel lobby (a friend's row on the ladder). The lobby has its
   own, which also knows who you already have an open match with; the server refuses a duplicate either way. */
export function useChallenge(): Challenger {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const challenge = async (friendId: string) => {
    if (busy) return null;
    setBusy(true);
    setError(null);
    const res = await createMatch(friendId);
    setBusy(false);
    if (!res.ok) { setError(res.error); return null; }
    return res.data;
  };
  return { challenge, busy, error };
}
