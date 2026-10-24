import { useEffect, useState } from 'react';
import { H, W } from './stage';

export interface Fit { scale: number; vw: number; vh: number }

const measure = (wide: boolean): Fit => {
  const vw = typeof window === 'undefined' ? W : window.innerWidth;
  const vh = typeof window === 'undefined' ? H : window.innerHeight;
  /* a phone fills the screen; on desktop the same composition stays phone-sized, a little under the window's height */
  return { scale: wide ? Math.min(1, (0.92 * vh) / H) : Math.min(vw / W, vh / H), vw, vh };
};

/** How big the 390×844 stage is drawn, kept live as the window changes. */
export function useStageFit(wide: boolean): Fit {
  const [fit, setFit] = useState(() => measure(wide));
  useEffect(() => {
    const on = () => setFit(measure(wide));
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [wide]);
  return fit;
}
