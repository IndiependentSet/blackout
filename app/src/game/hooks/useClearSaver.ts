import { useCallback, useRef, useState } from 'react';
import type { HintTier, SiteResult } from '../../domain/types';
import type { ClearSaver } from '../session';
import { skipSave, type SaveStatus } from '../state/scoreCopy';

/** Writes a cleared run through the mode's saver and reports how it went; a signed-out player is told to sign in, and a default-schedule week is not recorded at all. */
export function useClearSaver(userId: string | null, save: ClearSaver | null, onError: (message: string) => void, onSchedule = true) {
  const [status, setStatus] = useState<SaveStatus | null>(null);
  const latest = useRef(0);

  const saveClear = useCallback((idx: number, run: SiteResult, consulted: 0 | HintTier) => {
    if (!save) return;
    const skip = skipSave(userId, onSchedule);
    if (skip || !userId) return setStatus(skip);
    const mine = ++latest.current;
    setStatus({ kind: 'saving' });
    save(userId, idx, run, consulted).then(r => {
      if (mine !== latest.current) return;   // a newer clear has taken over
      if (r.ok) return setStatus({ kind: 'saved' });
      setStatus({ kind: 'error', message: r.error });
      onError(r.error);
    });
  }, [userId, save, onError, onSchedule]);

  return { status, saveClear };
}
