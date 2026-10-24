import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ok } from '../../services/result';
import { toBoard } from '../../domain/ranking';

const getBoard = vi.hoisted(() => vi.fn());
const getFriendships = vi.hoisted(() => vi.fn());
vi.mock('../../services/repositories/leaderboards', () => ({ getBoard }));
vi.mock('../../services/repositories/friendships', () => ({ getFriendships }));

const { useBoard, useMyPlace } = await import('./useBoard');

const friends = (...ids: string[]) => ok({ friends: ids.map(id => ({ person: { id } })), incoming: [], outgoing: [] });
const mine = toBoard([{ place: 4, total: 9, user_id: 'me', username: 'me', avatar: null, value: 10, extra: 1, is_me: true }]);

beforeEach(() => { getBoard.mockReset(); getFriendships.mockReset(); getBoard.mockResolvedValue(ok(mine)); });

describe('useBoard', () => {
  it('opens on the player’s fellow stargazers, with themself in the circle, when they have any', async () => {
    getFriendships.mockResolvedValue(friends('f1', 'f2'));
    const { result } = renderHook(() => useBoard({ kind: 'week', userId: 'me', day: 412 }));
    await waitFor(() => expect(result.current.board).toBeDefined());
    expect(result.current.audience).toBe('friends');
    expect(result.current.hasFriends).toBe(true);
    expect(getBoard).toHaveBeenCalledWith('week', { day: 412, ids: ['f1', 'f2', 'me'], limit: 20, around: undefined });
    expect([...result.current.friendIds]).toEqual(['f1', 'f2']);
  });

  it('opens on everyone without friends, and reads nothing before the friends are known', async () => {
    getFriendships.mockResolvedValue(friends());
    const { result } = renderHook(() => useBoard({ kind: 'rush', userId: 'me' }));
    expect(getBoard).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.board).toBeDefined());
    expect(result.current.audience).toBe('everyone');
    expect(getBoard).toHaveBeenCalledWith('rush', { day: undefined, ids: undefined, limit: 20, around: undefined });
  });

  it('reads the other audience when the player switches', async () => {
    getFriendships.mockResolvedValue(friends('f1'));
    const { result } = renderHook(() => useBoard({ kind: 'night', userId: 'me' }));
    await waitFor(() => expect(result.current.board).toBeDefined());
    act(() => result.current.setAudience('everyone'));
    await waitFor(() => expect(getBoard).toHaveBeenLastCalledWith('night', { day: undefined, ids: undefined, limit: 20, around: undefined }));
    expect(result.current.audience).toBe('everyone');
  });

  it('asks for the window around the player when told to', async () => {
    getFriendships.mockResolvedValue(friends());
    const { result } = renderHook(() => useBoard({ kind: 'duel', userId: 'me', limit: 3, around: 3 }));
    await waitFor(() => expect(result.current.board).toBeDefined());
    expect(getBoard).toHaveBeenCalledWith('duel', { day: undefined, ids: undefined, limit: 3, around: 3 });
  });

  it('reads signed out without asking for friends, and holds off while disabled', async () => {
    const { result, rerender } = renderHook(({ enabled }) => useBoard({ kind: 'rush', userId: null, enabled }), { initialProps: { enabled: false } });
    expect(getFriendships).not.toHaveBeenCalled();
    expect(getBoard).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
    rerender({ enabled: true });
    await waitFor(() => expect(result.current.board).toBeDefined());
    expect(getFriendships).not.toHaveBeenCalled();
  });

  it('says why a read failed', async () => {
    getFriendships.mockResolvedValue(friends());
    getBoard.mockResolvedValue({ ok: false, error: 'offline' });
    const { result } = renderHook(() => useBoard({ kind: 'night', userId: 'me' }));
    await waitFor(() => expect(result.current.error).toBe('offline'));
    expect(result.current.board).toBeUndefined();
  });
});

describe('useMyPlace', () => {
  it('reads only the player’s own row', async () => {
    const { result } = renderHook(() => useMyPlace('voyage', 'me'));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toMatchObject({ total: 9, entry: { place: 4, isMe: true } });
    expect(getBoard).toHaveBeenCalledWith('voyage', { day: undefined, limit: 0 });
  });

  it('is null signed out, while disabled, and for a player who is not on the board', async () => {
    const { result: out } = renderHook(() => useMyPlace('voyage', null));
    const { result: off } = renderHook(() => useMyPlace('voyage', 'me', { enabled: false }));
    expect(out.current).toBeNull();
    expect(off.current).toBeNull();
    getBoard.mockResolvedValue(ok(toBoard([])));
    const { result: none } = renderHook(() => useMyPlace('night', 'me', { day: 3 }));
    await waitFor(() => expect(getBoard).toHaveBeenCalledWith('night', { day: 3, limit: 0 }));
    expect(none.current).toBeNull();
  });
});
