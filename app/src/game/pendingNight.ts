import type { SiteResult } from '../domain/types';

/* Tonight's clears made while signed out are kept on the device until the player signs in (the sign-in link may open a
   fresh page), then recorded and dropped. Browser storage can be missing or full, so every access is guarded. */
const KEY = 'sg-pending-night';

interface Pending { day: number; results: (SiteResult | null)[] }

const usable = (r: unknown): r is SiteResult => {
  const o = r as Partial<SiteResult> | null;
  return !!o && typeof o.used === 'number' && typeof o.par === 'number' && typeof o.stars === 'number' && Array.isArray(o.rows);
};

export function loadPendingNight(day: number, count: number): (SiteResult | null)[] | null {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Pending | null;
    if (!p || p.day !== day || !Array.isArray(p.results)) return null;
    const results = Array.from({ length: count }, (_, i) => (usable(p.results[i]) ? p.results[i] : null));
    return results.some(Boolean) ? results : null;
  } catch { return null; }
}

export function savePendingNight(day: number, results: (SiteResult | null)[]): void {
  try {
    if (results.some(Boolean)) localStorage.setItem(KEY, JSON.stringify({ day, results } satisfies Pending));
  } catch { /* storage unavailable: the night just isn't kept across a reload */ }
}

export function clearPendingNight(): void {
  try { localStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
