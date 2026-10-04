import { useEffect, useState } from 'react';
import { encodeParams, type PlaygroundParams } from './params';
import type { Outcome } from './runGeneration';

type Reply = { ok: true; outcome: Outcome } | { ok: false; error: string };
interface Done { key: string; outcome: Outcome | null; error: string | null; ms: number }

/** Generates for the current params in a worker. A new request terminates the
    one in flight, so dragging a slider never queues up stale runs. */
export function useGenerator(params: PlaygroundParams) {
  const key = encodeParams(params);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('./generate.worker.ts', import.meta.url), { type: 'module' });
    const t0 = performance.now();
    const finish = (outcome: Outcome | null, error: string | null) => {
      setDone({ key, outcome, error, ms: Math.round(performance.now() - t0) });
      worker.terminate();
    };
    worker.onmessage = (e: MessageEvent<Reply>) => (e.data.ok ? finish(e.data.outcome, null) : finish(null, e.data.error));
    worker.onerror = e => finish(null, e.message || 'worker failed');
    const debounce = window.setTimeout(() => worker.postMessage(params), 120);
    return () => { window.clearTimeout(debounce); worker.terminate(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- key is params, serialised

  return {
    running: done?.key !== key, outcome: done?.outcome ?? null, error: done?.error ?? null, wallMs: done?.ms ?? 0,
    /** identifies the outcome shown (it lags `params` while a run is in flight) */
    outcomeKey: done?.key ?? '',
  };
}
