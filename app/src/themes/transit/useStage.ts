import { useEffect, useState } from 'react';
import { H, W } from './art';

/** The widest a phone column grows before the film stops filling the screen. */
const COLUMN_MAX = 560;

export interface Stage { scale: number; vw: number; vh: number }

/* The film is composed at 390×844. A phone shows it full screen (up to a 560px column); a wide screen shows it at
   its own size, centred, 92% of the height at most. */
export function stageFor(vw: number, vh: number, wide: boolean): Stage {
  const scale = wide ? Math.min(1, 0.92 * vh / H) : Math.min(Math.min(vw, COLUMN_MAX) / W, vh / H);
  return { scale, vw, vh };
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
