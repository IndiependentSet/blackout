import { useEffect, useRef, useState } from 'react';
import { encodeParams, type PlaygroundParams } from './params';
import type { VarietySummary } from './variety';

type Reply =
  | { type: 'progress' | 'done'; summary: VarietySummary; ms: number }
  | { type: 'error'; error: string };

export interface VarietyRun {
  status: 'idle' | 'running' | 'done' | 'stopped' | 'error';
  /** the settings the results belong to (encoded), so the panel can say when they're stale */
  paramsKey: string;
  samples: number;
  summary: VarietySummary | null;
  ms: number;
  error: string | null;
}

/** A finished (or stopped) sweep, kept for side-by-side comparison. */
export interface CompareRow { id: number; params: PlaygroundParams; summary: VarietySummary; stopped: boolean }
const HISTORY = 8;

const IDLE: VarietyRun = { status: 'idle', paramsKey: '', samples: 0, summary: null, ms: 0, error: null };

/** One variety sweep at a time, in its own worker. Starting a new one or
    leaving the page terminates the old one. */
export function useVariety() {
  const [run, setRun] = useState<VarietyRun>(IDLE);
  const [history, setHistory] = useState<CompareRow[]>([]);
  const worker = useRef<Worker | null>(null);
  /* the running sweep's settings and latest numbers, for the history row it becomes */
  const latest = useRef<{ params: PlaygroundParams; summary: VarietySummary | null } | null>(null);
  const nextId = useRef(1);

  const record = (stopped: boolean) => {
    const l = latest.current;
    latest.current = null;
    if (!l?.summary) return;
    const row: CompareRow = { id: nextId.current++, params: l.params, summary: l.summary, stopped };
    setHistory(h => [row, ...h].slice(0, HISTORY));
  };

  const halt = () => { worker.current?.terminate(); worker.current = null; };
  useEffect(() => halt, []);

  const start = (params: PlaygroundParams, samples: number) => {
    halt();
    const w = new Worker(new URL('./variety.worker.ts', import.meta.url), { type: 'module' });
    worker.current = w;
    latest.current = { params, summary: null };
    setRun({ ...IDLE, status: 'running', paramsKey: encodeParams(params), samples });
    w.onmessage = (e: MessageEvent<Reply>) => {
      if (worker.current !== w) return;                       // a stale sweep
      const m = e.data;
      if (m.type === 'error') { halt(); setRun(r => ({ ...r, status: 'error', error: m.error })); return; }
      if (latest.current) latest.current.summary = m.summary;
      if (m.type === 'done') { halt(); record(false); }
      setRun(r => ({ ...r, status: m.type === 'done' ? 'done' : 'running', summary: m.summary, ms: m.ms }));
    };
    w.onerror = e => { halt(); setRun(r => ({ ...r, status: 'error', error: e.message || 'worker failed' })); };
    w.postMessage({ params, samples });
  };

  const stop = () => {
    if (worker.current) record(true);
    halt();
    setRun(r => (r.status === 'running' ? { ...r, status: 'stopped' } : r));
  };

  return { run, history, start, stop };
}
