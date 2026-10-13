import { useEffect, useRef, useState } from 'react';
import type { Level } from '../../domain/types';
import { levelSource, requestKey } from '../../services/levels';
import type { LevelSource } from '../../services/levels';
import { logger } from '../../services/logger';

/* The level for `step` of a survival run, `null` until the source has answered. The step after it is asked for
   at the same time, so clearing a site finds the next one waiting. Replies are kept by request, so one that
   lands after the run has moved on is still useful, and one that lands after the screen has gone is dropped. */
export function useSurvivalLevels(runSeed: string, step: number, source: LevelSource = levelSource): Level | null {
  const [loaded, setLoaded] = useState<ReadonlyMap<string, Level>>(() => new Map());
  const asked = useRef(new Set<string>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    for (const s of [step, step + 1]) {
      const req = { mode: 'survival', runSeed, step: s } as const;
      const key = requestKey(req);
      if (asked.current.has(key)) continue;
      asked.current.add(key);
      source.getLevel(req).then(r => {
        if (!mounted.current) return;
        if (!r.ok) {
          asked.current.delete(key);
          return logger.error('survival level ' + s, r.error);
        }
        setLoaded(prev => new Map(prev).set(key, r.data));
      });
    }
  }, [runSeed, step, source]);

  return loaded.get(requestKey({ mode: 'survival', runSeed, step })) ?? null;
}
