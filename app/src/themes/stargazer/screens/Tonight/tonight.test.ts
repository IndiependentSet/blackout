import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SiteResult } from '../../../../domain/types';
import { tonightState } from './tonight';
import { SECRET_GAP_MS, useSecretTaps } from './useSecretTaps';

const r = (status: 'perfect' | 'over') => ({ status }) as SiteResult;

describe('tonightState', () => {
  it('opens the sky on the board while it is dark, else the first dark one', () => {
    expect(tonightState([null, null, null], 0)).toMatchObject({ charted: 0, next: 0, done: false });
    expect(tonightState([r('perfect'), null, null], 0)).toMatchObject({ charted: 1, atPar: 1, next: 1 });
    expect(tonightState([r('perfect'), null, r('over')], 2)).toMatchObject({ next: 1, atPar: 1 });
  });
  it('is done once every sky is charted', () => {
    expect(tonightState([r('perfect'), r('over')], 1)).toMatchObject({ done: true, charted: 2, atPar: 1 });
  });
});

describe('useSecretTaps', () => {
  it('fires on the seventh tap in a row, not after a pause', () => {
    let t = 0;
    const onSecret = vi.fn();
    const { result } = renderHook(() => useSecretTaps(onSecret, 7, () => t));
    for (let i = 0; i < 6; i++) { t += 100; result.current(); }
    t += SECRET_GAP_MS + 1; result.current();          // too slow: counting starts again
    expect(onSecret).not.toHaveBeenCalled();
    for (let i = 0; i < 6; i++) { t += 100; result.current(); }
    expect(onSecret).toHaveBeenCalledTimes(1);
  });
});
