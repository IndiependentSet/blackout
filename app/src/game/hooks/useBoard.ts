import { useState } from 'react';
import { BOARD_ROWS, mineOf, type Audience, type Board, type BoardEntry, type BoardKind } from '../../domain/ranking';
import { useResource } from '../../hooks/useResource';
import { getFriendships } from '../../services/repositories/friendships';
import { getBoard } from '../../services/repositories/leaderboards';

/** where a player stands on a board: their row and how many are on it */
export interface Place { entry: BoardEntry; total: number }

export interface BoardOptions {
  kind: BoardKind;
  userId: string | null;
  /** the night a night or week board ends on */
  day?: number;
  limit?: number;
  /** also list this many rows either side of the player's own (the ladder's "around you") */
  around?: number;
  /** hold the read off (the Rush board waits until the run is banked) */
  enabled?: boolean;
}

export interface BoardState {
  board: Board | undefined;
  loading: boolean;
  error: string | null;
  audience: Audience;
  /** the player has fellow stargazers, so the two audiences differ */
  hasFriends: boolean;
  /** who those fellow stargazers are, so a row can offer to challenge them */
  friendIds: ReadonlySet<string>;
  setAudience: (a: Audience) => void;
  reload: () => void;
}

/* One leaderboard, read once per page: the player's fellow stargazers when they have any (else everyone), and a switch
   to the other. A failed read is an `error` for the board to say; it never blocks the page it sits on. */
export function useBoard({ kind, userId, day, limit = BOARD_ROWS, around, enabled = true }: BoardOptions): BoardState {
  const friends = useResource(enabled && userId ? 'friends:' + userId : null, () => getFriendships(userId as string));
  const friendIds = friends.data ? friends.data.friends.map(f => f.person.id) : [];
  const hasFriends = friendIds.length > 0;
  const [picked, setPicked] = useState<Audience | null>(null);
  const audience: Audience = picked ?? (hasFriends ? 'friends' : 'everyone');
  const circle = audience === 'friends' && userId ? [...friendIds, userId] : undefined;

  const board = useResource(enabled && !friends.loading ? `board:${kind}:${audience}:${day ?? ''}:${limit}:${around ?? ''}:${userId ?? ''}` : null,
    () => getBoard(kind, { day, ids: circle, limit, around }));
  return {
    board: board.data, loading: !enabled || friends.loading || board.loading, error: board.error,
    audience, hasFriends, friendIds: new Set(friendIds), setAudience: setPicked, reload: board.reload,
  };
}

/** Where the player stands on a board, from a read of their own row alone: null signed out, before they are on it, or while it loads. */
export function useMyPlace(kind: BoardKind, userId: string | null, opts: { day?: number; enabled?: boolean; refresh?: string } = {}): Place | null {
  const { day, enabled = true, refresh = '' } = opts;
  const res = useResource(enabled && userId ? `place:${kind}:${day ?? ''}:${userId}:${refresh}` : null, () => getBoard(kind, { day, limit: 0 }));
  const entry = res.data ? mineOf(res.data) : null;
  return entry && res.data ? { entry, total: res.data.total } : null;
}
