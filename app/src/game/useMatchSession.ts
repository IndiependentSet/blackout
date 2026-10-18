import { useCallback, useMemo, useReducer } from 'react';
import { MATCH_SET } from '../domain/match';
import type { Level, PlayFeatures } from '../domain/types';
import { ok, type Result } from '../services/result';
import { useBoardView } from './hooks/useBoardView';
import type { ClearSaver, PlaySession } from './session';
import { gameReducer, initialGameState } from './state/gameReducer';

const MATCH_FEATURES: PlayFeatures = { hints: false, invoice: false, share: false };

/* One match as a game session: a single site, the one graph both players were dealt. Nothing is saved as a
   "clear" in the usual sense: when the cats cover the board, the cats themselves go to the server, which checks
   them and decides the winner. `save` closes over the cats of the render the clear happened in (the screen reads
   `save` from that same render), so it sends exactly the cover that was just completed.
   Taps are blocked from outside, by the screen, until the clock says go (see `locked` on GameScreen). */
export function useMatchSession(level: Level | null, submit: (nodes: number[]) => Promise<Result<unknown>>): PlaySession {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => initialGameState(1));
  const view = useBoardView();
  const levels = useMemo(() => [level], [level]);

  const placed = state.placed;
  const save = useCallback<ClearSaver>(async () => {
    const reply = await submit(placed);
    return reply.ok ? ok(null) : reply;
  }, [submit, placed]);

  return {
    /* no work order here: the score card's "WORK ORDER #n" line is not used by a match */
    day: 0, levels, level, state, dispatch,
    set: MATCH_SET, features: MATCH_FEATURES, save, view,
  };
}
