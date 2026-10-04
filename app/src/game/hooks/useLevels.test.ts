import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLevels } from './useLevels';

beforeEach(() => { vi.useFakeTimers(); vi.spyOn(Date, 'now').mockReturnValue(0); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('useLevels', () => {
  it('starts with nothing and builds the week one site at a time', () => {
    const { result } = renderHook(() => useLevels(12));
    expect(result.current.every(l => l === null)).toBe(true);

    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current[0]).not.toBeNull();
    expect(result.current[1]).toBeNull();

    act(() => { vi.advanceTimersByTime(50); });
    expect(result.current[1]).not.toBeNull();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.every(l => l !== null)).toBe(true);
    expect(result.current).toHaveLength(7);
  });

  it('stops building when unmounted', () => {
    const { result, unmount } = renderHook(() => useLevels(12));
    act(() => { vi.advanceTimersByTime(1); });
    unmount();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.filter(Boolean)).toHaveLength(1);
  });
});
