import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/* The game reads campaign and survival levels from the published pools on the server. Tests have no server, so
   they get the fixed mock maps, tagged as the mock they are. A test of the real source imports it by its own path. */
vi.mock('../services/levels', async () => {
  const { mockLevelSource } = await import('../services/levels/mockLevelSource');
  return { IS_MOCK_SOURCE: true, levelSource: mockLevelSource, requestKey: (await import('../services/levels/levelSource')).requestKey };
});

/* …and the screens ask which pools are published: tests say there is one. */
vi.mock('../services/repositories/levelPools', async importOriginal => {
  const real = await importOriginal<typeof import('../services/repositories/levelPools')>();
  const { ok } = await import('../services/result');
  return { ...real, listPools: async (mode: 'campaign' | 'survival' | 'match') =>
    ok([{ id: 1, mode, version: 1, note: '', levelCount: 1, createdAt: '2026-10-20T00:00:00Z', curve: {} }]) };
});

afterEach(() => cleanup());
