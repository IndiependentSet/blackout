import { useEffect, useRef, useState } from 'react';

const KEY = 'cc-howto-seen';

/** Has this browser session already seen the orientation? Falls back to "no" if storage is blocked. */
function seenThisSession(): boolean {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { sessionStorage.setItem(KEY, '1'); } catch { /* storage blocked: it just shows once per page load */ }
}

/* The orientation slideshow. A visitor with no staff login — most likely new on
   the job — gets it once per browser session (sessionStorage, so it survives a
   reload but not a closed tab); HOW IT WORKS reopens it any
   time. It is offered on the dashboard, the entry screen. Decided once, when sign-in state first becomes known. */
export function useOrientation({ ready, signedIn, onEntry }: { ready: boolean; signedIn: boolean; onEntry: boolean }) {
  const [open, setOpen] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    if (!ready || decided.current) return;
    decided.current = true;
    if (signedIn || !onEntry || seenThisSession()) return;
    markSeen();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once, when async sign-in state arrives
    setOpen(true);
  }, [ready, signedIn, onEntry]);

  return {
    open,
    show: () => { markSeen(); setOpen(true); },
    hide: () => setOpen(false),
  };
}
