import { useResource, type Resource } from '../../hooks/useResource';
import type { BoardRow, BoardScope, MySquad, Squad, SquadMember } from '../../domain/types';
import { getBoardFor } from '../../services/repositories/leaderboards';
import { createSquad, getMySquads, getSquadMembers, joinSquadByCode, leaveSquad } from '../../services/repositories/squads';
import type { Result } from '../../services/result';

export interface Squads {
  mine: MySquad[];
  create: (name: string) => Promise<Result<Squad>>;
  join: (code: string) => Promise<Result<Squad>>;
  leave: (squadId: string) => Promise<void>;
  /** the open squad's roster and ranking */
  members: Resource<SquadMember[]>;
  board: Resource<BoardRow[]>;
}

/* Your squads, and the roster and board of whichever one is open. */
export function useSquads(userId: string, scope: BoardScope, open: Squad | null): Squads {
  const mine = useResource('squads:' + userId, () => getMySquads(userId));
  const members = useResource(open ? 'sm:' + open.id : null, () => getSquadMembers((open as Squad).id));
  const ids = members.data ? members.data.map(m => m.user_id) : null;
  const board = useResource(ids ? `sboard:${scope}:${ids.join(',')}` : null, () => getBoardFor(ids as string[], scope));

  const refresh = <T,>(r: Result<T>) => { if (r.ok) mine.reload(); return r; };
  return {
    mine: mine.data ?? [],
    create: name => createSquad(userId, name).then(refresh),
    join: code => joinSquadByCode(userId, code).then(refresh),
    leave: squadId => leaveSquad(userId, squadId).then(() => mine.reload()),
    members, board,
  };
}
