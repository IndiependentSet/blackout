import type { Dispatch } from 'react';
import type { HintTier, Level, PlayFeatures, PlaySet, SiteResult } from '../domain/types';
import type { Result } from '../services/result';
import type { GameAction, GameState } from './state/gameReducer';

/** How a game mode records a cleared level for a signed-in player. */
export type ClearSaver = (userId: string, idx: number, run: SiteResult, consulted: 0 | HintTier) => Promise<Result<null>>;

/** Everything `GameScreen` needs from a game mode: its levels, its board state and what it switches on. */
export interface PlaySession {
  /** the work-order number shown on the score card */
  day: number;
  /** the levels of the set; null while one is still being generated */
  levels: (Level | null)[];
  /** the open level */
  level: Level | null;
  state: GameState;
  dispatch: Dispatch<GameAction>;
  set: PlaySet;
  /** units already cleared before the one the board holds (survival restarts the board at index 0 for each site) */
  siteOffset?: number;
  features: PlayFeatures;
  /** false when the saved generation config couldn't be loaded and the default is played: clears then stay unrecorded (daily only) */
  onSchedule?: boolean;
  /** null when the mode keeps no record of a clear */
  save: ClearSaver | null;
  /** board preferences that survive leaving for another screen */
  view: { expanded: boolean; dim: boolean; toggleExpanded: () => void; toggleDim: () => void };
}
