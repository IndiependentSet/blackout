import { useLayoutEffect, useState } from 'react';

export interface BoxSize { w: number; h: number }

/** An element's size on screen in px, kept current as it resizes; null until it has been measured (or where there is
    no ResizeObserver). Pass `setEl` as the element's `ref`: a remounted element is followed. Measured before paint, so
    what's drawn from it never flashes at the wrong size. */
export function useBoxSize<E extends Element>(): { el: E | null; setEl: (el: E | null) => void; box: BoxSize | null } {
  const [el, setEl] = useState<E | null>(null);
  const [box, setBox] = useState<BoxSize | null>(null);
  useLayoutEffect(() => {
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width), h = Math.round(r.height);
      setBox(b => (b && b.w === w && b.h === h ? b : w > 0 && h > 0 ? { w, h } : null));
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return { el, setEl, box };
}
