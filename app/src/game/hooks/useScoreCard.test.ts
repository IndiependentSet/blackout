import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { scoreRun } from '../../domain/scoring';
import type { AudioService } from '../audio/AudioService';
import { useScoreCard } from './useScoreCard';

const audio = { tick: vi.fn() } as unknown as AudioService;
const run = scoreRun({ stars: 2, k: 3 }, 4);      // two rows: difficulty, over budget

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] }); vi.clearAllMocks(); });
afterEach(() => { vi.useRealTimers(); });

describe('useScoreCard', () => {
  it('is closed until opened', () => {
    expect(renderHook(() => useScoreCard(audio)).result.current.card).toBeNull();
  });

  it('lands the rows one by one with a tick each, then counts the total up', () => {
    const { result } = renderHook(() => useScoreCard(audio));
    act(() => result.current.open(run, 0));
    expect(result.current.card).toMatchObject({ step: 0, total: 0 });

    act(() => { vi.advanceTimersByTime(700); });
    expect(result.current.card?.step).toBe(1);
    act(() => { vi.advanceTimersByTime(250); });
    expect(result.current.card?.step).toBe(2);
    expect(audio.tick).toHaveBeenCalledTimes(2);

    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.card?.total).toBe(run.score);
  });

  it('opens after a delay', () => {
    const { result } = renderHook(() => useScoreCard(audio));
    act(() => result.current.openAfter(760, run, 10));
    expect(result.current.card).toBeNull();
    act(() => { vi.advanceTimersByTime(760); });
    expect(result.current.card).toMatchObject({ prevScore: 10 });
  });

  it('close cancels anything still scheduled', () => {
    const { result } = renderHook(() => useScoreCard(audio));
    act(() => result.current.open(run, 0));
    act(() => result.current.close());
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current.card).toBeNull();
    expect(audio.tick).not.toHaveBeenCalled();
  });

  it('cancels its timers on unmount', () => {
    const { result, unmount } = renderHook(() => useScoreCard(audio));
    act(() => result.current.open(run, 0));
    unmount();
    act(() => { vi.advanceTimersByTime(5000); });
    expect(audio.tick).not.toHaveBeenCalled();
  });
});
