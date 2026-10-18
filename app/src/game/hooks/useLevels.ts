import { useEffect, useState } from 'react';
import type { GenerationSchedule } from '../../domain/generation';
import { LAST_SITE, SITE_COUNT } from '../../domain/sites';
import type { Level } from '../../domain/types';
import { siteLevelAsync } from '../../services/generation/scheduleClient';

type SiteBuilder = typeof siteLevelAsync;

/* The week's seven levels, for a device that has to build them itself (the published week isn't there yet).
   A level can take seconds, so each is built in a worker, one at a time: site 1 first, the rest queued behind it
   while the player reads the work order. `null` means "still being built"; nothing is built until the schedule
   (`null` while it loads) is known. A site that fails to build stays `null`. */
export function useLevels(seed: number, schedule: GenerationSchedule | null, build: SiteBuilder = siteLevelAsync): (Level | null)[] {
  const [levels, setLevels] = useState<(Level | null)[]>(() => Array(SITE_COUNT).fill(null));

  useEffect(() => {
    if (!schedule) return;
    const ctrl = new AbortController();
    (async () => {
      for (let i = 0; i <= LAST_SITE; i++) {
        const r = await build(schedule, seed, i, { signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        if (r.ok) setLevels(prev => prev.map((x, j) => (j === i ? r.data : x)));
      }
    })();
    return () => ctrl.abort();
  }, [seed, schedule, build]);

  return levels;
}
