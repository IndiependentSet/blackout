import { useCallback, useReducer, useState } from 'react';
import { dayNumber, daySeed } from '../domain/calendar';
import { DAILY_SET } from '../domain/sites';
import type { PlayFeatures } from '../domain/types';
import { recordClear } from '../services/repositories/siteClears';
import { prefersMoreContrast } from './env';
import { useDailyLevels } from './hooks/useDailyLevels';
import { useDailySchedule } from './hooks/useDailySchedule';
import { useLevels } from './hooks/useLevels';
import type { ClearSaver, PlaySession } from './session';
import { gameReducer, initialGameState } from './state/gameReducer';

const DAILY_FEATURES: PlayFeatures = { hints: true, invoice: true, share: true };

export interface GameSession extends PlaySession {
  /** false when today's published week isn't there (or today's generation config couldn't be loaded) and the
      device is building the week itself: those levels may not be everyone's, so their clears stay off the leaderboard */
  onSchedule: boolean;
}

/* Everything about today's game that has to outlive any one screen: the week's
   levels, the player's board, and how they like the board shown. Held above
   the work order, the game and the account screens so none of them loses it. */
export function useGameSession(): GameSession {
  const [day] = useState(() => dayNumber());
  const published = useDailyLevels(day);
  const { schedule } = useDailySchedule(day);
  /* The published week is the game. Only when it isn't there does the device build one from the saved config
     (waiting to know that first, so a published week never costs a generation), and that week doesn't count. */
  const built = useLevels(daySeed(day), published.status === 'missing' ? schedule : null);
  const levels = published.levels ?? built;
  const onSchedule = published.status !== 'missing';
  const [state, dispatch] = useReducer(gameReducer, undefined, initialGameState);
  const [expanded, setExpanded] = useState(false);
  /* someone who has asked their system for more contrast gets the house
     turned down from the start; everyone else can hit DIM */
  const [dim, setDim] = useState(prefersMoreContrast);

  const toggleExpanded = useCallback(() => setExpanded(v => !v), []);
  const toggleDim = useCallback(() => setDim(v => !v), []);

  const save = useCallback<ClearSaver>(
    (userId, idx, run) => recordClear(userId, day, idx, run.used, run.par, run.stars), [day]);

  return {
    day, levels, onSchedule, level: levels[state.idx], state, dispatch,
    set: DAILY_SET, features: DAILY_FEATURES, save,
    view: { expanded, dim, toggleExpanded, toggleDim },
  };
}
