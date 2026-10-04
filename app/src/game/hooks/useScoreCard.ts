import { useCallback, useEffect, useRef, useState } from 'react';
import type { SiteResult } from '../../domain/types';
import type { AudioService } from '../audio/AudioService';

export interface ScoreCardState {
  run: SiteResult;
  /** the best score before this run, or 0 */
  prevScore: number;
  /** how many breakdown rows have landed */
  step: number;
  /** the count-up total shown so far */
  total: number;
}

const ROW_MS = 240, FIRST_ROW_MS = 420, COUNT_DELAY_MS = 520, COUNT_MS = 520;

/* The score card that follows a clear: its rows land one by one with a tick,
   then the total counts up. Everything it schedules is cancelled on close and
   on unmount. */
export function useScoreCard(audio: AudioService) {
  const [card, setCard] = useState<ScoreCardState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const raf = useRef(0);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cancelAnimationFrame(raf.current);
  }, []);
  useEffect(() => clear, [clear]);

  const later = useCallback((ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); }, []);

  const countUp = useCallback((target: number) => {
    const t0 = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / COUNT_MS);
      setCard(c => (c ? { ...c, total: Math.round(target * (1 - Math.pow(1 - p, 3))) } : c));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  const open = useCallback((run: SiteResult, prevScore: number) => {
    clear();
    setCard({ run, prevScore, step: 0, total: 0 });
    const n = run.rows.length;
    for (let i = 1; i <= n; i++) {
      later(FIRST_ROW_MS + i * ROW_MS, () => {
        setCard(c => (c ? { ...c, step: i } : c));
        audio.tick(i);
      });
    }
    later(COUNT_DELAY_MS + n * ROW_MS, () => countUp(run.score));
  }, [audio, clear, later, countUp]);

  /** open the card after a pause (the fanfare and flash get a moment first) */
  const openAfter = useCallback((ms: number, run: SiteResult, prevScore: number) => {
    later(ms, () => open(run, prevScore));
  }, [later, open]);

  const close = useCallback(() => { clear(); setCard(null); }, [clear]);

  return { card, open, openAfter, close };
}
