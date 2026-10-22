import { useCallback, useEffect, useRef, useState } from 'react';

/** Taps closer together than this keep counting; a longer pause starts again. */
export const SECRET_GAP_MS = 1500;
export const SECRET_TAPS = 7;
/** The count only shows from this tap on, so a stray tap or two gives nothing away. */
export const SECRET_SHOW_FROM = 3;

/* The easter egg: `onSecret` runs on the seventh tap in a row. Returns the tap handler, the run so far (0 once the
   pause is over; `taps` on the last one) and a number that changes on every tap, to restart a ripple. */
export function useSecretTaps(onSecret: () => void, taps = SECRET_TAPS, now: () => number = Date.now) {
  const run = useRef({ count: 0, last: 0 });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [shown, setShown] = useState({ count: 0, pulse: 0 });
  useEffect(() => () => clearTimeout(timer.current), []);

  const tap = useCallback(() => {
    const t = now();
    const r = run.current;
    r.count = t - r.last <= SECRET_GAP_MS ? r.count + 1 : 1;
    r.last = t;
    const count = r.count;
    setShown(s => ({ count, pulse: s.pulse + 1 }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(s => ({ ...s, count: 0 })), SECRET_GAP_MS);
    if (r.count >= taps) { r.count = 0; onSecret(); }
  }, [onSecret, taps, now]);

  return { tap, count: shown.count, pulse: shown.pulse };
}
