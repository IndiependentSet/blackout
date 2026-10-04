import { useEffect, useRef } from 'react';

/** Listen for keydown on the window; the handler may change every render without re-subscribing. */
export function useWindowKey(handler: (e: KeyboardEvent) => void, enabled = true) {
  const latest = useRef(handler);
  useEffect(() => { latest.current = handler; });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => latest.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
