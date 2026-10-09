import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCHEDULE } from '../../domain/generation';
import { fail, ok } from '../../services/result';

const configInForce = vi.fn();
vi.mock('../../services/repositories/generationConfigs', () => ({ configInForce: (...a: unknown[]) => configInForce(...a) }));
const { SCHEDULE_TIMEOUT_MS, useDailySchedule } = await import('./useDailySchedule');

const saved = { ...DEFAULT_SCHEDULE, retries: 2 };
const row = (schedule: unknown) => ({ id: 1, mode: 'daily', effectiveFromDay: 3, schedule, note: '', createdAt: '' });

beforeEach(() => { configInForce.mockReset(); });

describe('useDailySchedule', () => {
  it('holds the week back while the config loads', async () => {
    let answer: (v: unknown) => void = () => {};
    configInForce.mockReturnValue(new Promise(resolve => { answer = resolve; }));
    const { result } = renderHook(() => useDailySchedule(5));
    expect(result.current).toEqual({ schedule: null, onSchedule: true });
    expect(configInForce).toHaveBeenCalledWith('daily', 5);
    answer(ok(null));
    await waitFor(() => expect(result.current.schedule).toBe(DEFAULT_SCHEDULE));
  });
  it('gives up waiting and plays the default off schedule', async () => {
    vi.useFakeTimers();
    try {
      configInForce.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useDailySchedule(5));
      await act(async () => { await vi.advanceTimersByTimeAsync(SCHEDULE_TIMEOUT_MS); });
      expect(result.current).toEqual({ schedule: DEFAULT_SCHEDULE, onSchedule: false });
    } finally { vi.useRealTimers(); }
  });
  it('plays the saved schedule in force', async () => {
    configInForce.mockResolvedValue(ok(row(saved)));
    const { result } = renderHook(() => useDailySchedule(5));
    await waitFor(() => expect(result.current.schedule).toEqual(saved));
    expect(result.current.onSchedule).toBe(true);
  });
  it('plays the default, on schedule, when no config has been saved', async () => {
    configInForce.mockResolvedValue(ok(null));
    const { result } = renderHook(() => useDailySchedule(5));
    await waitFor(() => expect(result.current).toEqual({ schedule: DEFAULT_SCHEDULE, onSchedule: true }));
  });
  it('plays the default off schedule when the config cannot be loaded', async () => {
    configInForce.mockResolvedValue(fail('offline'));
    const { result } = renderHook(() => useDailySchedule(5));
    await waitFor(() => expect(result.current).toEqual({ schedule: DEFAULT_SCHEDULE, onSchedule: false }));
  });
  it('plays the default off schedule when the stored config does not parse', async () => {
    configInForce.mockResolvedValue(ok(row({ version: 9 })));
    const { result } = renderHook(() => useDailySchedule(5));
    await waitFor(() => expect(result.current).toEqual({ schedule: DEFAULT_SCHEDULE, onSchedule: false }));
  });
});
