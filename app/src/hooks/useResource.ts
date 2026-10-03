import { useEffect, useState } from 'react';
import type { Result } from '../services/result';

export interface Resource<T> {
  data: T | undefined;
  error: string | null;
  /** true until the first answer for the current key arrives */
  loading: boolean;
  /** fetch again (after a write) */
  reload: () => void;
}

/* Load something keyed by `key`. Answers that arrive for a key the screen has
   since moved off are ignored, so a slow reply can't overwrite a newer one.
   Pass `null` to hold off (a dependency isn't ready yet). */
export function useResource<T>(key: string | null, load: () => Promise<Result<T>>): Resource<T> {
  const [tick, setTick] = useState(0);
  const [slot, setSlot] = useState<{ key: string; result: Result<T> } | null>(null);
  const fullKey = key === null ? null : key + '#' + tick;

  useEffect(() => {
    if (fullKey === null) return;
    let live = true;
    load().then(result => { if (live) setSlot({ key: fullKey, result }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is whatever the caller built for this key
  }, [fullKey]);

  const current = slot && slot.key === fullKey ? slot.result : null;
  return {
    data: current && current.ok ? current.data : undefined,
    error: current && !current.ok ? current.error : null,
    loading: fullKey !== null && current === null,
    reload: () => setTick(t => t + 1),
  };
}
