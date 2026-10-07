import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { remainingMs, runSummary, SURVIVAL_LIMIT_MS, SURVIVAL_SET, type RunSummary } from '../domain/survival';
import type { PlayFeatures, SiteResult } from '../domain/types';
import { levelSource } from '../services/levels';
import type { LevelSource } from '../services/levels';
import { useBoardView } from './hooks/useBoardView';
import { useSurvivalLevels } from './hooks/useSurvivalLevels';
import { useSurvivalRecorder, type RecordStatus, type SurvivalRecorderRepo } from './hooks/useSurvivalRecorder';
import type { PlaySession } from './session';
import { gameReducer, initialGameState, type GameAction, type GameState } from './state/gameReducer';

const SURVIVAL_FEATURES: PlayFeatures = { hints: false, invoice: false, share: false };
const TICK_MS = 250;

export interface SurvivalSession extends PlaySession {
  /** time left on the clock; the full limit until the first site is on the board */
  remainingMs: number;
  over: boolean;
  summary: RunSummary;
  /** whether the run is being registered on the server, and whether every site has been answered for */
  recording: RecordStatus;
  recorded: boolean;
}

/* The board holds a single site; the run is the sites cleared so far, which is also the index of the one on the board. */
interface RunState { game: GameState; runs: SiteResult[] }
type RunAction = GameAction | { type: 'advance' };

const initialRun = (): RunState => ({ game: initialGameState(1), runs: [] });

export function runReducer(s: RunState, a: RunAction): RunState {
  if (a.type !== 'advance') return { ...s, game: gameReducer(s.game, a) };
  const e = s.game.event;
  /* only a clear moves the run on, and only once: after it the board is a fresh site */
  if (!e || e.kind !== 'cleared') return s;
  return { game: gameReducer(s.game, { type: 'restart', count: 1 }), runs: [...s.runs, e.run] };
}

/* The clock starts when the first site is on the board, so loading is not the player's time. It stops ticking once it runs out. */
function useSurvivalClock(started: boolean): number {
  const [left, setLeft] = useState(SURVIVAL_LIMIT_MS);

  useEffect(() => {
    if (!started) return;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const remaining = remainingMs(startedAt, Date.now());
      setLeft(remaining);
      if (remaining === 0) clearInterval(id);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [started]);

  return left;
}

/* One survival run as a game session. Every clear is added to the run and the board restarts on the next site, which
   was asked for ahead of time. The run seed only names the run to the level source: which puzzle comes back is the
   source's business, never decided here. A signed-in player's run is also registered on the server, which keeps its
   own clock; the board never waits for it. */
export function useSurvivalSession(
  source: LevelSource = levelSource,
  newSeed: () => string = () => crypto.randomUUID(),
  userId: string | null = null,
  recorderRepo?: SurvivalRecorderRepo,
): SurvivalSession {
  const [runSeed] = useState(newSeed);
  const [{ game: state, runs }, dispatch] = useReducer(runReducer, undefined, initialRun);
  const step = runs.length;
  const level = useSurvivalLevels(runSeed, step, source);
  const view = useBoardView();
  const started = level !== null || step > 0;
  const left = useSurvivalClock(started);
  const over = left === 0;
  const recorder = useSurvivalRecorder(userId, recorderRepo);
  const { begin, record } = recorder;

  useEffect(() => { if (started) begin(); }, [started, begin]);

  const cleared = state.event?.kind === 'cleared';
  /* each clear is banked once, in the commit it happens: `level`, `step` and the cats are still the cleared site's
     until `advance` lands in the next render */
  const banked = useRef(0);
  const clearSeq = state.event?.kind === 'cleared' ? state.event.seq : 0;
  const { placed } = state;
  useEffect(() => {
    if (!clearSeq || over || !level || clearSeq <= banked.current) return;
    banked.current = clearSeq;
    record(step, level, placed);
  }, [clearSeq, over, level, step, placed, record]);

  useEffect(() => {
    if (cleared && !over) dispatch({ type: 'advance' });
  }, [cleared, over]);

  const levels = useMemo(() => [level], [level]);
  const summary = useMemo(() => runSummary(runs), [runs]);

  return {
    /* no work order here: the score card never shows, so the number is unused */
    day: 0, levels, level, state, dispatch,
    set: SURVIVAL_SET, features: SURVIVAL_FEATURES, save: null, siteOffset: step, view,
    remainingMs: left, over, summary, recording: recorder.status, recorded: recorder.settled,
  };
}
