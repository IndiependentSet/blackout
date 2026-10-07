import { useCallback, useEffect, useRef, useState } from 'react';
import type { RunSummary } from '../../domain/survival';
import type { Level } from '../../domain/types';
import { logger } from '../../services/logger';
import type { Result } from '../../services/result';
import { startSurvivalRun, submitSurvivalSite } from '../../services/repositories/survival';

/** The two server calls a recorded run makes. */
export interface SurvivalRecorderRepo {
  start: () => Promise<Result<string>>;
  submit: (runId: string, step: number, level: Level, nodes: number[]) => Promise<Result<RunSummary>>;
}

const SERVER_REPO: SurvivalRecorderRepo = { start: startSurvivalRun, submit: submitSurvivalSite };

/** local: nobody signed in · ranked: signed in, all good so far · syncing: a call is out · unsaved: the server said no or never answered */
export type RecordStatus = 'local' | 'ranked' | 'syncing' | 'unsaved';

export interface SurvivalRecorder {
  status: RecordStatus;
  /** true when no call is waiting on the server, so the board can be read without missing the last site */
  settled: boolean;
  /** open the run on the server; the first call wins, later ones do nothing */
  begin: () => void;
  record: (step: number, level: Level, nodes: number[]) => void;
}

/* Registers a survival run on the server for a signed-in player. The run is still played locally whatever happens
   here: a missing migration or a dropped connection only turns `status` to 'unsaved'. Submits go out one at a
   time, in order, and an answer that lands after the screen has gone is dropped. */
export function useSurvivalRecorder(userId: string | null, repo: SurvivalRecorderRepo = SERVER_REPO): SurvivalRecorder {
  const [calls, setCalls] = useState({ pending: 0, failed: false });
  const mounted = useRef(true);
  const failed = useRef(false);
  const runId = useRef<Promise<string | null> | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const settle = useCallback((ok: boolean) => {
    if (!ok) failed.current = true;
    if (mounted.current) setCalls(c => ({ pending: c.pending - 1, failed: c.failed || !ok }));
  }, []);
  const open = useCallback(() => {
    if (mounted.current) setCalls(c => ({ ...c, pending: c.pending + 1 }));
  }, []);

  const begin = useCallback(() => {
    if (!userId || runId.current) return;
    open();
    runId.current = repo.start().then(
      r => { settle(r.ok); return r.ok ? r.data : null; },
      e => { logger.error('survival start', e); settle(false); return null; },
    );
  }, [userId, repo, open, settle]);

  const record = useCallback((step: number, level: Level, nodes: number[]) => {
    if (!userId) return;
    begin();
    open();
    queue.current = queue.current.then(async () => {
      const id = await runId.current;
      if (!id || failed.current) return settle(id !== null && !failed.current);
      try {
        const r = await repo.submit(id, step, level, nodes);
        settle(r.ok);
      } catch (e) {
        logger.error('survival submit', e);
        settle(false);
      }
    });
  }, [userId, repo, begin, open, settle]);

  const status: RecordStatus = !userId ? 'local' : calls.failed ? 'unsaved' : calls.pending > 0 ? 'syncing' : 'ranked';
  return { status, settled: calls.pending === 0, begin, record };
}
