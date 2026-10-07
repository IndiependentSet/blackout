import { useEffect, useState } from 'react';
import { generateAsync } from '../../services/generation/generationClient';
import { encodeParams, toRequest, type PlaygroundParams } from './params';
import { toOutcome, type Outcome } from './runGeneration';

interface Done { key: string; outcome: Outcome | null; error: string | null; ms: number }

/** Generates for the current params in a worker. A new request abandons the
    one in flight, so dragging a slider never queues up stale runs. */
export function useGenerator(params: PlaygroundParams) {
  const key = encodeParams(params);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const t0 = performance.now();
    const debounce = window.setTimeout(() => {
      void generateAsync(toRequest(params), { signal: ctrl.signal }).then(r => {
        if (ctrl.signal.aborted) return;
        const ms = Math.round(performance.now() - t0);
        setDone(r.ok ? { key, outcome: toOutcome(r.data), error: null, ms } : { key, outcome: null, error: r.error, ms });
      });
    }, 120);
    return () => { window.clearTimeout(debounce); ctrl.abort(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- key is params, serialised

  return {
    running: done?.key !== key, outcome: done?.outcome ?? null, error: done?.error ?? null, wallMs: done?.ms ?? 0,
    /** identifies the outcome shown (it lags `params` while a run is in flight) */
    outcomeKey: done?.key ?? '',
  };
}
