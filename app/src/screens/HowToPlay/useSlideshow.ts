import { useRef, useState, type PointerEvent } from 'react';
import { useWindowKey } from '../../hooks/useWindowKey';

const SWIPE_MIN_PX = 60;
const SWIPE_DOMINANCE = 1.5;

interface Options { count: number; onNext: () => void; onClose: () => void }

/* Slide position and how to move it: buttons, arrow keys, and a horizontal
   swipe (anything shorter or steeper is a tap on the board underneath). Past
   the last slide, "next" finishes. */
export function useSlideshow({ count, onNext, onClose }: Options) {
  const last = count - 1;
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  const go = (n: number) => {
    const to = Math.max(0, Math.min(last, n));
    if (to === index) return;
    setDir(to > index ? 1 : -1);
    setIndex(to);
  };
  const next = () => (index === last ? onNext() : go(index + 1));

  useWindowKey(e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); next(); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  });

  const start = useRef<{ x: number; y: number } | null>(null);
  const swipe = {
    onPointerDown: (e: PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current; start.current = null;
      if (!s) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(dy) * SWIPE_DOMINANCE) go(index + (dx < 0 ? 1 : -1));
    },
  };

  return { index, dir, last, go, next, swipe };
}
