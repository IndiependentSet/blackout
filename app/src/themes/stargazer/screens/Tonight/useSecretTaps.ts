import { useRef } from 'react';

/** Taps closer together than this keep counting; a longer pause starts again. */
export const SECRET_GAP_MS = 1500;
export const SECRET_TAPS = 7;

/* The easter egg: `onSecret` runs on the seventh tap in a row. Returns the tap handler. */
export function useSecretTaps(onSecret: () => void, taps = SECRET_TAPS, now: () => number = Date.now): () => void {
  const run = useRef({ count: 0, last: 0 });
  return () => {
    const t = now();
    const r = run.current;
    r.count = t - r.last <= SECRET_GAP_MS ? r.count + 1 : 1;
    r.last = t;
    if (r.count >= taps) { r.count = 0; onSecret(); }
  };
}
