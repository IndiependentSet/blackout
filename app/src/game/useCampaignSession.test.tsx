import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CHAPTERS } from '../domain/campaign';
import { scoreRun } from '../domain/scoring';
import type { CampaignClear } from '../domain/types';
import { useCampaignSession } from './useCampaignSession';

const [first] = CHAPTERS;
const cleared = (levelNo: number): CampaignClear => ({ levelNo, run: scoreRun({ stars: 2, k: 3 }, 3), campaignStars: 3 });

describe('useCampaignSession', () => {
  it('is a chapter-long session with a server save and no invoice', async () => {
    const { result } = renderHook(() => useCampaignSession(first, 1, new Map(), vi.fn(), vi.fn()));
    expect(result.current.set.count).toBe(10);
    expect(result.current.state.results).toHaveLength(10);
    expect(result.current.save).toBeTypeOf('function');
    expect(result.current.features).toEqual({ hints: true, invoice: false, share: false });
    await waitFor(() => expect(result.current.level).not.toBeNull());
  });

  it('holds back every level the player has not unlocked', async () => {
    const { result } = renderHook(() => useCampaignSession(first, 1, new Map(), vi.fn(), vi.fn()));
    await waitFor(() => expect(result.current.levels[0]).not.toBeNull());
    expect(result.current.levels.slice(1).every(l => l === null)).toBe(true);
  });

  it('unlocks the next level after a clear and starts where the player picked', async () => {
    const clears = new Map([[1, cleared(1)], [2, cleared(2)]]);
    const { result } = renderHook(() => useCampaignSession(first, 3, clears, vi.fn(), vi.fn()));
    await waitFor(() => expect(result.current.levels[2]).not.toBeNull());
    expect(result.current.state.idx).toBe(2);
    expect(result.current.levels[3]).toBeNull();
    expect(result.current.state.results[0]).toBe(clears.get(1)!.run);
  });

  it('records a cleared level once, with the hint tier that was used', async () => {
    const record = vi.fn();
    const { result } = renderHook(() => useCampaignSession(first, 1, new Map(), record, vi.fn()));
    await waitFor(() => expect(result.current.level).not.toBeNull());
    const lv = result.current.level!;

    act(() => result.current.dispatch({ type: 'consult', tier: 2, lv }));
    for (const node of lv.sol) act(() => result.current.dispatch({ type: 'tap', node, lv }));

    await waitFor(() => expect(record).toHaveBeenCalledOnce());
    expect(record).toHaveBeenCalledWith(1, expect.objectContaining({ used: lv.k, par: lv.k }), 2);
  });

  it('ignores a level that is still short of a clear', async () => {
    const record = vi.fn();
    const { result } = renderHook(() => useCampaignSession(first, 1, new Map(), record, vi.fn()));
    await waitFor(() => expect(result.current.level).not.toBeNull());
    const lv = result.current.level!;
    act(() => result.current.dispatch({ type: 'tap', node: lv.sol[0], lv }));
    expect(record).not.toHaveBeenCalled();
  });
  it('saves a clear under its campaign level number, not its place in the chapter', async () => {
    const saveClear = vi.fn().mockResolvedValue({ ok: true, data: null });
    const second = CHAPTERS[1];
    const { result } = renderHook(() => useCampaignSession(second, second.from, new Map(), vi.fn(), saveClear));
    const run = scoreRun({ stars: 2, k: 3 }, 3);
    await result.current.save!('u1', 2, run, 1);
    expect(saveClear).toHaveBeenCalledWith(second.from + 2, run, 1);
  });
});
