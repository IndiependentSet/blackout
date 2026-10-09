import { useCallback, useEffect, useRef, useState } from 'react';
import type { PoolMode } from '../../domain/gameModes';
import { poolSlots, type LevelCurve } from '../../domain/generation';
import { generateSlotAsync, type SlotResult } from '../../services/generation/poolClient';

export type BuildStatus = 'running' | 'done' | 'stopped' | 'error';

export interface Build {
  /** the mode and curve this build was made from */
  key: string;
  status: BuildStatus;
  results: SlotResult[];
  total: number;
  error: string | null;
}

type Generate = typeof generateSlotAsync;

/* Generates a curve's whole pool, one slot at a time in a worker, so progress shows and STOP takes effect at once.
   `current` says the build still matches the draft: editing the curve afterwards leaves the old build on screen,
   marked stale, and it can no longer be published. */
export function usePoolBuild(mode: PoolMode, curve: LevelCurve, generate: Generate = generateSlotAsync) {
  const key = mode + ':' + JSON.stringify(curve);
  const [build, setBuild] = useState<Build | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => () => ctrl.current?.abort(), []);

  const start = useCallback(async () => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    const slots = poolSlots(mode, curve);
    const results: SlotResult[] = [];
    setBuild({ key, status: 'running', results: [], total: slots.length, error: null });
    for (const slot of slots) {
      const r = await generate(curve, slot, { signal: c.signal });
      if (c.signal.aborted) return;
      if (!r.ok) { setBuild(b => b && { ...b, status: 'error', error: r.error }); return; }
      results.push(r.data);
      setBuild(b => b && { ...b, results: results.slice() });
    }
    setBuild(b => b && { ...b, status: 'done' });
  }, [mode, curve, key, generate]);

  const stop = useCallback(() => {
    ctrl.current?.abort();
    setBuild(b => (b && b.status === 'running' ? { ...b, status: 'stopped' } : b));
  }, []);

  return { build, current: build?.key === key, start, stop };
}

/** Why a build cannot be published yet; empty when it can. */
export function publishBlockers(build: Build | null, current: boolean): string[] {
  if (!build) return ['Generate the pool first.'];
  if (!current) return ['The curve changed after this build: generate again.'];
  if (build.status !== 'done') return ['The build is not finished.'];
  const bad = build.results.filter(r => !r.unique).length;
  return bad ? [`${bad} level${bad === 1 ? '' : 's'} do not have a unique best cover: change the curve or its seed.`] : [];
}
