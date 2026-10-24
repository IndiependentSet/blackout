import { useState } from 'react';
import type { SkyFigure } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import { listPinnedSkies, pinSky, unpinSky } from '../../services/repositories/dailyManualLevels';
import type { Result } from '../../services/result';

/** The hand-drawn skies pinned to upcoming days, and pinning or unpinning one: one write at a time, its error kept. */
export function usePinnedSkies() {
  const pinned = useResource('pinned-skies', listPinnedSkies);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(write: () => Promise<Result<null>>): Promise<boolean> {
    setBusy(true); setError(null);
    const r = await write();
    setBusy(false);
    if (!r.ok) { setError(r.error); return false; }
    pinned.reload();
    return true;
  }

  return {
    list: pinned.data ?? [], loadError: pinned.error, loading: pinned.loading, busy, error,
    pin: (day: number, idx: number, figure: SkyFigure) => run(() => pinSky(day, idx, figure)),
    unpin: (day: number, idx: number) => run(() => unpinSky(day, idx)),
  };
}
