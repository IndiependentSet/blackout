import { useEffect } from 'react';

/** While `dirty`, leaving the page (a nav link, a reload, closing the tab) asks first: an admin page's draft lives only
    in memory. */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
