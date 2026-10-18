import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generate } from '../../domain/generation';
import { fail, ok } from '../../services/result';

const getDailyLevels = vi.fn();
vi.mock('../../services/repositories/dailyLevels', () => ({ getDailyLevels: (...a: unknown[]) => getDailyLevels(...a) }));
const { DAILY_LEVELS_TIMEOUT_MS, useDailyLevels } = await import('./useDailyLevels');

const level = generate({ seed: 3, size: 6, diff: 1, options: { clock: false } }).level!;
const published = Array.from({ length: 7 }, () => level);

beforeEach(() => { getDailyLevels.mockReset(); });

describe('useDailyLevels', () => {
  it('holds back while the server answers, then hands over the published week', async () => {
    let answer: (v: unknown) => void = () => {};
    getDailyLevels.mockReturnValue(new Promise(resolve => { answer = resolve; }));
    const { result } = renderHook(() => useDailyLevels(5));
    expect(result.current).toEqual({ status: 'loading', levels: null });
    expect(getDailyLevels).toHaveBeenCalledWith(5);
    answer(ok(published));
    await waitFor(() => expect(result.current).toEqual({ status: 'published', levels: published }));
  });
  it('says the week is missing when the server has none', async () => {
    getDailyLevels.mockResolvedValue(ok(null));
    const { result } = renderHook(() => useDailyLevels(5));
    await waitFor(() => expect(result.current).toEqual({ status: 'missing', levels: null }));
  });
  it('says the week is missing when the read fails', async () => {
    getDailyLevels.mockResolvedValue(fail('boom'));
    const { result } = renderHook(() => useDailyLevels(5));
    await waitFor(() => expect(result.current.status).toBe('missing'));
  });
  it('gives up waiting', async () => {
    vi.useFakeTimers();
    try {
      getDailyLevels.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useDailyLevels(5));
      await act(async () => { await vi.advanceTimersByTimeAsync(DAILY_LEVELS_TIMEOUT_MS); });
      expect(result.current).toEqual({ status: 'missing', levels: null });
    } finally { vi.useRealTimers(); }
  });
});
