import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { scoreRun } from '../../domain/scoring';
import type { CampaignClear } from '../../domain/types';
import { fail, ok } from '../../services/result';

const getCampaignClears = vi.fn();
const recordCampaignClear = vi.fn();
vi.mock('../../services/repositories/campaign', () => ({
  getCampaignClears: (...a: unknown[]) => getCampaignClears(...a),
  recordCampaignClear: (...a: unknown[]) => recordCampaignClear(...a),
}));

const { useCampaignClears } = await import('./useCampaignClears');

const lv = { stars: 2 as const, k: 3 };
const stored = (levelNo: number, used = 3): CampaignClear => ({ levelNo, run: scoreRun(lv, used), campaignStars: 3 });

beforeEach(() => {
  vi.clearAllMocks();
  getCampaignClears.mockResolvedValue(ok([]));
  recordCampaignClear.mockResolvedValue(ok(null));
});

describe('useCampaignClears', () => {
  it('starts empty and records a clear with its campaign stars', async () => {
    const { result } = renderHook(() => useCampaignClears('u1'));
    expect(result.current.clears.size).toBe(0);
    act(() => result.current.record(1, scoreRun(lv, 3), 0));
    expect(result.current.clears.get(1)).toMatchObject({ levelNo: 1, campaignStars: 3 });
    await waitFor(() => expect(result.current.persistence).toBe('server'));
  });

  it('keeps the better of two runs of the same level', async () => {
    const { result } = renderHook(() => useCampaignClears('u1'));
    act(() => result.current.record(1, scoreRun(lv, 3), 0));
    act(() => result.current.record(1, scoreRun(lv, 5), 3));
    expect(result.current.clears.get(1)!.run.used).toBe(3);
    expect(result.current.clears.get(1)!.campaignStars).toBe(3);
    await waitFor(() => expect(result.current.persistence).toBe('server'));
  });

  it('does not hand one account\'s record to another', async () => {
    const { result, rerender } = renderHook(({ id }) => useCampaignClears(id), { initialProps: { id: 'u1' as string | null } });
    act(() => result.current.record(1, scoreRun(lv, 3), 0));
    rerender({ id: 'u2' });
    expect(result.current.clears.size).toBe(0);
    rerender({ id: null });
    expect(result.current.clears.size).toBe(0);
    await waitFor(() => expect(result.current.persistence).toBe('memory'));
  });
});

describe('useCampaignClears, with the server', () => {
  it('loads the saved record for the signed-in account and reports it as saved', async () => {
    getCampaignClears.mockResolvedValue(ok([stored(1), stored(2)]));
    const { result } = renderHook(() => useCampaignClears('u1'));
    expect(result.current.persistence).toBe('loading');
    await waitFor(() => expect(result.current.persistence).toBe('server'));
    expect([...result.current.clears.keys()]).toEqual([1, 2]);
    expect(getCampaignClears).toHaveBeenCalledWith('u1');
  });

  it('puts a clear made this session on top of the loaded record, keeping the better run', async () => {
    getCampaignClears.mockResolvedValue(ok([stored(1, 3)]));
    const { result } = renderHook(() => useCampaignClears('u1'));
    await waitFor(() => expect(result.current.persistence).toBe('server'));
    act(() => result.current.record(1, scoreRun(lv, 4), 0));
    act(() => result.current.record(2, scoreRun(lv, 3), 0));
    expect(result.current.clears.get(1)!.run.used).toBe(3);
    expect(result.current.clears.has(2)).toBe(true);
  });

  it('carries on in memory when the record can not be loaded', async () => {
    getCampaignClears.mockResolvedValue(fail('relation "campaign_clears" does not exist'));
    const { result } = renderHook(() => useCampaignClears('u1'));
    await waitFor(() => expect(result.current.persistence).toBe('memory'));
    act(() => result.current.record(1, scoreRun(lv, 3), 0));
    expect(result.current.clears.has(1)).toBe(true);
  });

  it('writes a clear to the server with its campaign stars', async () => {
    const { result } = renderHook(() => useCampaignClears('u1'));
    await waitFor(() => expect(result.current.persistence).toBe('server'));
    const run = scoreRun(lv, 3);
    let saved;
    await act(async () => { saved = await result.current.save(5, run, 3); });
    expect(saved).toEqual(ok(null));
    expect(recordCampaignClear).toHaveBeenCalledWith('u1', 5, run, 2);   // clear + on budget; INSIDER told them the answer
  });

  it('says the progress is no longer saved once a save fails, and saved again after the next one works', async () => {
    const { result } = renderHook(() => useCampaignClears('u1'));
    await waitFor(() => expect(result.current.persistence).toBe('server'));
    recordCampaignClear.mockResolvedValueOnce(fail('permission denied'));
    await act(async () => { await result.current.save(1, scoreRun(lv, 3), 0); });
    expect(result.current.persistence).toBe('memory');
    await act(async () => { await result.current.save(1, scoreRun(lv, 3), 0); });
    expect(result.current.persistence).toBe('server');
  });

  it('refuses to save for a signed-out player and never asks the server', async () => {
    const { result } = renderHook(() => useCampaignClears(null));
    let saved;
    await act(async () => { saved = await result.current.save(1, scoreRun(lv, 3), 0); });
    expect(saved).toMatchObject({ ok: false });
    expect(recordCampaignClear).not.toHaveBeenCalled();
    expect(getCampaignClears).not.toHaveBeenCalled();
  });
});
