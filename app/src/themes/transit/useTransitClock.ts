import { useCallback, useEffect, useRef, useState } from 'react';
import { choose, isOver, skip, startClock, tick, TOTAL, type Branch, type Clock } from './timeline';

/** Runs the film's clock off requestAnimationFrame: T, the pressed button, and the two ways in (press, skip). `reduced` starts on the last frame. */
export function useTransitClock(startAt: number, reduced: boolean) {
  const [clock, setClock] = useState<Clock>(() => startClock(reduced ? TOTAL : startAt));
  const last = useRef<number | null>(null);
  const over = isOver(clock);

  useEffect(() => {
    if (over) return;
    let id = 0;
    const frame = (now: number) => {
      const dt = last.current === null ? 0 : Math.min(0.1, (now - last.current) / 1000);
      last.current = now;
      setClock(c => tick(c, dt));
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(id); last.current = null; };
  }, [over]);

  const press = useCallback((branch: Branch) => setClock(c => choose(c, branch)), []);
  const jump = useCallback(() => setClock(skip), []);
  return { clock, over, press, jump };
}
