import { useCallback, useEffect, useRef, useState } from 'react';
import { UNPUBLISHED_COPY, isUnpublished } from '../../services/repositories/levelPools';
import { findMatch, leaveQueue } from '../../services/repositories/matches';
import type { Result } from '../../services/result';

/** How often a searching player asks the server again. It is also what keeps their place in the queue. */
export const SEARCH_POLL_MS = 3000;
/** How long to look before saying nobody is around. */
export const SEARCH_GIVE_UP_MS = 60_000;

/** What the search talks to, so a test can hand in fakes. */
export interface SearchDeps {
  find: (tier: number) => Promise<Result<string | null>>;
  leave: () => Promise<Result<null>>;
  now: () => number;
}

export const defaultSearchDeps: SearchDeps = { find: findMatch, leave: leaveQueue, now: () => Date.now() };

export type Search =
  | { status: 'idle' }
  | { status: 'searching'; tier: number; startedAt: number }
  | { status: 'timeout' }
  | { status: 'error'; message: string };

export interface Matchmaking {
  search: Search;
  start: (tier: number) => void;
  cancel: () => void;
}

/* Looking for an opponent. `start` asks the server straight away and then every SEARCH_POLL_MS: the first player
   in simply waits, and finds out they were paired by asking again. Stops when a match turns up (`onFound`), when
   the player cancels, when the page closes or after SEARCH_GIVE_UP_MS. Whatever ends it, the player leaves the
   queue, so nobody is left waiting for a client that is gone. Answers that arrive after a search ended are ignored. */
export function useMatchmaking(onFound: (matchId: string) => void, deps: SearchDeps = defaultSearchDeps): Matchmaking {
  const [search, setSearch] = useState<Search>({ status: 'idle' });
  const run = useRef(0);                         // which search is current; a stale answer carries an older number
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searching = useRef(false);
  const found = useRef(onFound);
  useEffect(() => { found.current = onFound; });

  const stop = useCallback(() => {
    run.current++;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (searching.current) { searching.current = false; void deps.leave(); }
  }, [deps]);

  const start = useCallback((tier: number) => {
    stop();
    const me = ++run.current;
    const startedAt = deps.now();
    searching.current = true;
    setSearch({ status: 'searching', tier, startedAt });
    const ask = async () => {
      const r = await deps.find(tier);
      if (run.current !== me) return;
      if (!r.ok) { searching.current = false; setSearch({ status: 'error', message: isUnpublished(r.error) ? UNPUBLISHED_COPY : r.error }); return; }
      if (r.data) { searching.current = false; setSearch({ status: 'idle' }); found.current(r.data); return; }
      if (deps.now() - startedAt >= SEARCH_GIVE_UP_MS) { stop(); setSearch({ status: 'timeout' }); return; }
      timer.current = setTimeout(ask, SEARCH_POLL_MS);
    };
    void ask();
  }, [deps, stop]);

  const cancel = useCallback(() => { stop(); setSearch({ status: 'idle' }); }, [stop]);

  useEffect(() => stop, [stop]);

  return { search, start, cancel };
}
