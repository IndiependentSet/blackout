import { useCallback, useState } from 'react';

/** Which look the daily board is drawn in: CATASTROPHE INC. or the trial Stargazer (Rebrand Proposals 4c). */
export type Skin = 'classic' | 'stargazer';

const PARAM = 'skin';

const fromUrl = (): Skin => (new URLSearchParams(window.location.search).get(PARAM) === 'stargazer' ? 'stargazer' : 'classic');

/* Kept in the URL (`?skin=stargazer`) rather than storage, so a reload or a shared link keeps the look. */
export function useSkin(): [Skin, () => void] {
  const [skin, setSkin] = useState<Skin>(fromUrl);
  const toggle = useCallback(() => {
    setSkin(prev => {
      const next: Skin = prev === 'classic' ? 'stargazer' : 'classic';
      const url = new URL(window.location.href);
      if (next === 'stargazer') url.searchParams.set(PARAM, next); else url.searchParams.delete(PARAM);
      window.history.replaceState(window.history.state, '', url);
      return next;
    });
  }, []);
  return [skin, toggle];
}
