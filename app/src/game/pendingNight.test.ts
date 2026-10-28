import { beforeEach, describe, expect, it } from 'vitest';
import type { SiteResult } from '../domain/types';
import { clearPendingNight, loadPendingNight, savePendingNight } from './pendingNight';

const run = { status: 'perfect', score: 9, best: 9, grade: 'A', used: 3, par: 3, stars: 2, rows: [] } as unknown as SiteResult;

describe('pendingNight', () => {
  beforeEach(() => localStorage.clear());

  it('keeps a night for its own day only', () => {
    savePendingNight(412, [run, null, null]);
    expect(loadPendingNight(412, 3)?.[0]).toEqual(run);
    expect(loadPendingNight(413, 3)).toBeNull();
  });

  it('is dropped once cleared, and an empty board is not kept', () => {
    savePendingNight(412, [null, null]);
    expect(loadPendingNight(412, 2)).toBeNull();
    savePendingNight(412, [run, null]);
    clearPendingNight();
    expect(loadPendingNight(412, 2)).toBeNull();
  });

  it('ignores damaged storage', () => {
    localStorage.setItem('sg-pending-night', '{"day":412,"results":[{"used":"x"}]}');
    expect(loadPendingNight(412, 2)).toBeNull();
    localStorage.setItem('sg-pending-night', 'nope');
    expect(loadPendingNight(412, 2)).toBeNull();
  });
});
