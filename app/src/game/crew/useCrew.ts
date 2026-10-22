import { useResource, type Resource } from '../../hooks/useResource';
import type { BoardRow, BoardScope, Friendships } from '../../domain/types';
import { acceptFriend, getFriendships, removeFriendship, requestFriend } from '../../services/repositories/friendships';
import { getBoardFor } from '../../services/repositories/leaderboards';

export interface Crew {
  friendships: Friendships | undefined;
  board: Resource<BoardRow[]>;
  add: (otherId: string) => Promise<void>;
  /** answer a request: accept it, or decline (which deletes it) */
  respond: (rowId: string, accept: boolean) => Promise<void>;
  remove: (rowId: string) => Promise<void>;
}

/* Your workmates: who they are, how you all rank, and the writes that change it. */
export function useCrew(userId: string, scope: BoardScope): Crew {
  const list = useResource('friends:' + userId, () => getFriendships(userId));
  const ids = list.data ? [...list.data.friends.map(f => f.person.id), userId] : null;
  const board = useResource(ids ? `fboard:${scope}:${ids.join(',')}` : null, () => getBoardFor(ids as string[], scope));

  const then = (p: Promise<unknown>) => p.then(() => list.reload());
  return {
    friendships: list.data,
    board,
    add: otherId => then(requestFriend(userId, otherId)),
    respond: (rowId, accept) => then(accept ? acceptFriend(rowId) : removeFriendship(rowId)),
    remove: rowId => then(removeFriendship(rowId)),
  };
}
