import { useEffect, useState } from 'react';
import { levelForSite, type GenerationSchedule } from '../../domain/generation';
import { LAST_SITE, SITE_COUNT } from '../../domain/sites';
import type { Level } from '../../domain/types';

/** Gap between generating one site and the next, so the page stays responsive. */
const STAGGER_MS = 40;

/* The week's seven levels. Generating a level can take a few hundred ms, so
   they are built one at a time on timers: site 1 first, the rest queued behind
   it while the player reads the work order. `null` means "still being built";
   nothing is built until the schedule (`null` while it loads) is known. */
export function useLevels(seed: number, schedule: GenerationSchedule | null): (Level | null)[] {
  const [levels, setLevels] = useState<(Level | null)[]>(() => Array(SITE_COUNT).fill(null));

  useEffect(() => {
    if (!schedule) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    const build = (i: number) => {
      if (!live || i > LAST_SITE) return;
      const lv = levelForSite(schedule, seed, i);     // heavy: kept out of the state updater
      setLevels(prev => prev.map((x, j) => (j === i ? lv : x)));
      timer = setTimeout(() => build(i + 1), STAGGER_MS);
    };
    timer = setTimeout(() => build(0), 0);
    return () => { live = false; clearTimeout(timer); };
  }, [seed, schedule]);

  return levels;
}
