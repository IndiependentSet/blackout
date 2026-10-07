import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { chapterSet, chapterSize, unlockedUpTo, type CampaignClears, type Chapter } from '../domain/campaign';
import type { PlayFeatures } from '../domain/types';
import { prefersMoreContrast } from './env';
import { useChapterLevels } from './hooks/useChapterLevels';
import type { RecordClear, SaveClear } from './hooks/useCampaignClears';
import type { ClearSaver, PlaySession } from './session';
import { gameReducer, initialGameState, type GameState } from './state/gameReducer';

const CAMPAIGN_FEATURES: PlayFeatures = { hints: true, invoice: false, share: false };

/* A campaign chapter as a game session: its levels are the board's "sites". A
   level the player has not unlocked is held back as `null`, which is all the
   game screen needs to refuse it. A clear goes to the in-memory record at once
   and to the server through `saveClear`; the score card shows how that went. */
export function useCampaignSession(
  chapter: Chapter, startLevelNo: number, clears: CampaignClears, record: RecordClear, saveClear: SaveClear,
): PlaySession {
  const loaded = useChapterLevels(chapter);
  const unlocked = unlockedUpTo(clears);
  const levels = useMemo(() => loaded.map((lv, i) => (chapter.from + i <= unlocked ? lv : null)), [loaded, unlocked, chapter.from]);
  const set = useMemo(() => chapterSet(chapter), [chapter]);

  const [state, dispatch] = useReducer(gameReducer, undefined, (): GameState => {
    const size = chapterSize(chapter);
    return {
      ...initialGameState(size), idx: startLevelNo - chapter.from,
      results: Array.from({ length: size }, (_, i) => clears.get(chapter.from + i)?.run ?? null),
    };
  });
  const [expanded, setExpanded] = useState(false);
  const [dim, setDim] = useState(prefersMoreContrast);
  const toggleExpanded = useCallback(() => setExpanded(v => !v), []);
  const toggleDim = useCallback(() => setDim(v => !v), []);

  const save = useCallback<ClearSaver>(
    (_userId, idx, run, consulted) => saveClear(chapter.from + idx, run, consulted), [chapter.from, saveClear]);

  const handled = useRef(0);
  useEffect(() => {
    const e = state.event;
    if (!e || e.seq === handled.current) return;
    handled.current = e.seq;
    if (e.kind === 'cleared') record(chapter.from + state.idx, e.run, e.consulted);
  }, [state.event, state.idx, chapter.from, record]);

  return {
    day: chapter.index + 1, levels, level: levels[state.idx], state, dispatch,
    set, features: CAMPAIGN_FEATURES, save,
    view: { expanded, dim, toggleExpanded, toggleDim },
  };
}
