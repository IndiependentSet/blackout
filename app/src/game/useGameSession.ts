import { useCallback, useReducer, useState, type Dispatch } from 'react';
import { dayNumber, daySeed } from '../domain/calendar';
import type { Level } from '../domain/types';
import { prefersMoreContrast } from './env';
import { useLevels } from './hooks/useLevels';
import { gameReducer, initialGameState, type GameAction, type GameState } from './state/gameReducer';

export interface GameSession {
  /** the work-order number everyone shares today */
  day: number;
  /** the week's levels; null while one is still being generated */
  levels: (Level | null)[];
  /** the open site's level */
  level: Level | null;
  state: GameState;
  dispatch: Dispatch<GameAction>;
  /** board preferences that survive leaving for another screen */
  view: { expanded: boolean; dim: boolean; toggleExpanded: () => void; toggleDim: () => void };
}

/* Everything about today's game that has to outlive any one screen: the week's
   levels, the player's board, and how they like the board shown. Held above
   the work order, the game and the account screens so none of them loses it. */
export function useGameSession(): GameSession {
  const [day] = useState(() => dayNumber());
  const levels = useLevels(daySeed(day));
  const [state, dispatch] = useReducer(gameReducer, undefined, initialGameState);
  const [expanded, setExpanded] = useState(false);
  /* someone who has asked their system for more contrast gets the house
     turned down from the start; everyone else can hit DIM */
  const [dim, setDim] = useState(prefersMoreContrast);

  const toggleExpanded = useCallback(() => setExpanded(v => !v), []);
  const toggleDim = useCallback(() => setDim(v => !v), []);

  return {
    day, levels, level: levels[state.idx], state, dispatch,
    view: { expanded, dim, toggleExpanded, toggleDim },
  };
}
