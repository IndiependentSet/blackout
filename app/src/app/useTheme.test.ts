import { describe, expect, it } from 'vitest';
import { themeFromSearch } from './useTheme';

describe('themeFromSearch', () => {
  it('is Stargazer unless the URL asks for the cats', () => {
    expect(themeFromSearch('')).toBe('stargazer');
    expect(themeFromSearch('?skin=stargazer')).toBe('stargazer');
    expect(themeFromSearch('?skin=anything')).toBe('stargazer');
    expect(themeFromSearch('?skin=catastrophe')).toBe('catastrophe');
  });
});
