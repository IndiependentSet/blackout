import { useEffect, useState } from 'react';
import { H, W } from './art';

/** The widest a phone column grows before the film stops filling the screen. */
const COLUMN_MAX = 560;

export interface Stage {
  scale: number; vw: number; vh: number;
  /** the stage in film units: the whole screen, at least the 390×844 column the console and the hire sit in */
  w: number; h: number;
}

/* The film is composed at 390×844. A phone shows that column full screen (up to 560px wide); a wide screen shows it
   at its own size, centred, 92% of the height at most. Either way the stage itself is the whole screen: the sky, the
   tunnel and the planet run out to its edges around the column. */
export function stageFor(vw: number, vh: number, wide: boolean): Stage {
  const scale = wide ? Math.min(1, 0.92 * vh / H) : Math.min(Math.min(vw, COLUMN_MAX) / W, vh / H);
  return { scale, vw, vh, w: Math.max(W, vw / scale), h: Math.max(H, vh / scale) };
}

export function useStage(wide: boolean): Stage {
  const [stage, setStage] = useState(() => stageFor(window.innerWidth, window.innerHeight, wide));
  useEffect(() => {
    const onResize = () => setStage(stageFor(window.innerWidth, window.innerHeight, wide));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [wide]);
  return stage;
}
