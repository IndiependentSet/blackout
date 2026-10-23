import { describe, expect, it } from 'vitest';
import { ADMIN_GROUPS, ADMIN_PAGES, POOL_PAGE, poolModeFromSearch } from './adminPages';
import { POOL_MODES } from './gameModes';

describe('admin pages', () => {
  it('every page sits in a group, and every pool mode has its page', () => {
    for (const p of ADMIN_PAGES) expect(ADMIN_GROUPS.map(g => g.id)).toContain(p.group);
    for (const m of POOL_MODES) {
      const page = ADMIN_PAGES.find(p => p.id === POOL_PAGE[m]);
      expect(page?.href).toBe(`/pools.html?mode=${m}`);
    }
  });

  it('reads the pool mode from the URL, Voyage by default', () => {
    expect(poolModeFromSearch('?mode=survival')).toBe('survival');
    expect(poolModeFromSearch('?mode=match&x=1')).toBe('match');
    expect(poolModeFromSearch('')).toBe('campaign');
    expect(poolModeFromSearch('?mode=daily')).toBe('campaign');
  });
});
