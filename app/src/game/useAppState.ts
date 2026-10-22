import { useCallback, useState } from 'react';
import { betterRun, type RunSummary } from '../domain/survival';
import { useAuth } from '../services/auth/authContext';
import type { AuthState } from '../services/auth/authContext';
import { useCampaignClears, type CampaignRecord } from './hooks/useCampaignClears';
import { useSurvivalBest } from './hooks/useSurvivalRanking';
import { useGameSession, type GameSession } from './useGameSession';

/** What has to outlive every screen and both themes: who is signed in, today's board, the campaign record and the
    best survival run. Held by the app shell, so switching theme mid-game keeps the board exactly as it was. */
export interface AppState {
  auth: AuthState;
  session: GameSession;
  campaign: CampaignRecord;
  /** the best run this session, kept here so a finished run outlives its screen */
  survivalBest: RunSummary | null;
  finishSurvival: (run: RunSummary) => void;
  /** the best of this session's and the server's */
  survivalRecord: RunSummary | null;
}

export function useAppState(): AppState {
  const auth = useAuth();
  const session = useGameSession();
  const campaign = useCampaignClears(auth.userId);
  const [survivalBest, setSurvivalBest] = useState<RunSummary | null>(null);
  const finishSurvival = useCallback((run: RunSummary) => setSurvivalBest(best => betterRun(best, run)), []);
  const survivalRecord = useSurvivalBest(auth.userId, survivalBest);
  return { auth, session, campaign, survivalBest, finishSurvival, survivalRecord };
}
