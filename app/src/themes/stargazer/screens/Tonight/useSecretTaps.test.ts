import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SECRET_GAP_MS, useSecretTaps } from './useSecretTaps';

let clock = 0;
beforeEach(() => { clock = 1000; vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());

const setup = () => {
  const onSecret = vi.fn();
  const hook = renderHook(() => useSecretTaps(onSecret, 7, () => clock));
  const tap = (gap = 200) => act(() => { clock += gap; hook.result.current.tap(); });
  return { onSecret, hook, tap };
};

describe('useSecretTaps', () => {
  it('counts quick taps and fires on the seventh', () => {
    const { onSecret, hook, tap } = setup();
    for (let i = 1; i <= 6; i++) { tap(); expect(hook.result.current.count).toBe(i); }
    expect(onSecret).not.toHaveBeenCalled();
    tap();
    expect(onSecret).toHaveBeenCalledTimes(1);
    expect(hook.result.current.count).toBe(7);
  });

  it('starts again after a pause, and the shown count clears', () => {
    const { onSecret, hook, tap } = setup();
    tap(); tap(); tap();
    act(() => { vi.advanceTimersByTime(SECRET_GAP_MS + 10); });
    expect(hook.result.current.count).toBe(0);
    for (let i = 0; i < 6; i++) tap(SECRET_GAP_MS + 100);
    expect(onSecret).not.toHaveBeenCalled();
  });

  it('fires on the seventh tap in a row, not after a slow one', () => {
    const { onSecret, tap } = setup();
    for (let i = 0; i < 6; i++) tap(100);
    tap(SECRET_GAP_MS + 1);                              // too slow: counting starts again
    expect(onSecret).not.toHaveBeenCalled();
    for (let i = 0; i < 6; i++) tap(100);
    expect(onSecret).toHaveBeenCalledTimes(1);
  });

  it('changes pulse on every tap', () => {
    const { hook, tap } = setup();
    const a = hook.result.current.pulse;
    tap();
    expect(hook.result.current.pulse).not.toBe(a);
  });
});
