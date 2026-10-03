import type { BoardRow, FriendLink, Profile } from '../../domain/types';

export interface RankedRow { rank: number; name: string; score: number; isSelf: boolean; person: Profile }

/** Board rows ready to show: rank, display name (marking you), and a profile to open. Non-friends are opened by the name the board knows. */
export function boardRows(rows: BoardRow[], friends: FriendLink[], userId: string): RankedRow[] {
  const people = new Map(friends.map(f => [f.person.id, f.person]));
  return rows.map((r, i) => ({
    rank: i + 1,
    name: (r.name || 'STAFF') + (r.user_id === userId ? ' (YOU)' : ''),
    score: r.score,
    isSelf: r.user_id === userId,
    person: people.get(r.user_id) || { id: r.user_id, username: r.name },
  }));
}
