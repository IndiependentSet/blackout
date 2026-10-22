import type { Friendships } from '../../domain/types';

export type Relation = 'friend' | 'outgoing' | 'incoming' | 'none';

/** How a player stands to you: workmate, request you sent, request they sent, or no link. */
export function relationTo(f: Friendships | undefined, id: string): Relation {
  if (!f) return 'none';
  if (f.friends.some(x => x.person.id === id)) return 'friend';
  if (f.outgoing.some(x => x.person.id === id)) return 'outgoing';
  if (f.incoming.some(x => x.person.id === id)) return 'incoming';
  return 'none';
}

export const SEARCH_LABEL: Record<Relation, string> = { friend: 'WORKMATE', outgoing: 'SENT', incoming: 'ANSWER', none: 'ADD' };
export const STANDING: Record<Relation, string> = {
  friend: 'ON YOUR CREW', outgoing: 'REQUEST SENT', incoming: 'WANTS TO JOIN YOUR CREW', none: 'NOT ON YOUR CREW',
};
export const PROFILE_ACTION: Record<Relation, string> = {
  friend: 'REMOVE FROM CREW', outgoing: 'REQUEST PENDING', incoming: 'ACCEPT REQUEST', none: 'SEND CREW REQUEST',
};
