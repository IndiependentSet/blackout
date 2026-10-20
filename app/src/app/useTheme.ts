import { useCallback, useState } from 'react';

/** The two looks the game can wear. Stargazer is the game; CATASTROPHE INC. is kept as a hidden alternative. */
export type Theme = 'stargazer' | 'catastrophe';

const PARAM = 'skin';

/** `?skin=catastrophe` opens the cats; anything else is Stargazer. */
export const themeFromSearch = (search: string): Theme =>
  new URLSearchParams(search).get(PARAM) === 'catastrophe' ? 'catastrophe' : 'stargazer';

/* Kept in the URL rather than storage, so a reload or a shared link keeps the look and nothing new is persisted. */
export function useTheme(): [Theme, (next: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => themeFromSearch(window.location.search));
  const switchTo = useCallback((next: Theme) => {
    const url = new URL(window.location.href);
    if (next === 'catastrophe') url.searchParams.set(PARAM, next); else url.searchParams.delete(PARAM);
    window.history.replaceState(window.history.state, '', url);
    setTheme(next);
  }, []);
  return [theme, switchTo];
}
