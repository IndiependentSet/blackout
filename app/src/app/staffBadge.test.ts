import { describe, expect, it } from 'vitest';
import { scoreRun } from '../domain/scoring';
import { staffBadge } from './staffBadge';

const lv = { stars: 1 as const, k: 2 };
const none = Array(7).fill(null);

describe('staffBadge', () => {
  it('invites a visitor to sign in', () => {
    expect(staffBadge({ userId: null, handle: '' }, none)).toEqual({ label: 'STAFF LOGIN', sub: 'SAVE YOUR SCORE' });
  });
  it('shows a signed-in player their handle and perfect sites', () => {
    const results = [scoreRun(lv, 2), scoreRun(lv, 3), ...none.slice(2)];
    expect(staffBadge({ userId: 'u', handle: '@ann' }, results)).toEqual({ label: '@ann', sub: '1/7 PURR-FECT' });
  });
  it('falls back to STAFF while the handle loads', () => {
    expect(staffBadge({ userId: 'u', handle: '' }, none).label).toBe('STAFF');
  });
});
