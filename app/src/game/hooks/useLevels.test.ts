import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCHEDULE, levelForSite } from '../../domain/generation';
import { useLevels } from './useLevels';

beforeEach(() => { vi.useFakeTimers(); vi.spyOn(Date, 'now').mockReturnValue(0); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('useLevels', () => {
  it('starts with nothing and builds the week one site at a time', () => {
    const { result } = renderHook(() => useLevels(12, DEFAULT_SCHEDULE));
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
    const { result, unmount } = renderHook(() => useLevels(12, DEFAULT_SCHEDULE));
    act(() => { vi.advanceTimersByTime(1); });
    unmount();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.filter(Boolean)).toHaveLength(1);
  });

  it('waits for the schedule', () => {
    const { result, rerender } = renderHook(({ s }) => useLevels(12, s), { initialProps: { s: null as typeof DEFAULT_SCHEDULE | null } });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.every(l => l === null)).toBe(true);
    rerender({ s: DEFAULT_SCHEDULE });
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current[0]).toEqual(levelForSite(DEFAULT_SCHEDULE, 12, 0));
  });

  it('builds from the schedule it is given', () => {
    const custom = { ...DEFAULT_SCHEDULE, sites: DEFAULT_SCHEDULE.sites.map((s, i) => (i === 0 ? { size: 9, diff: 2 as const, options: {} } : s)) };
    const { result } = renderHook(() => useLevels(12, custom));
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current[0]).toEqual(levelForSite(custom, 12, 0));
    expect(result.current[0]).not.toEqual(levelForSite(DEFAULT_SCHEDULE, 12, 0));
  });
});
