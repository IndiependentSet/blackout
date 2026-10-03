import type { FriendLink, Friendship, Friendships, Profile } from '../../domain/types';
import { ok, type Result } from '../result';
import { supabase } from '../supabase/client';
import { toResult } from '../supabase/guard';
import { profilesByIds } from './profiles';

const EMPTY: Friendships = { friends: [], incoming: [], outgoing: [] };

export async function getFriendships(userId: string | null): Promise<Result<Friendships>> {
  if (!userId) return ok(EMPTY);
  const { data, error } = await supabase.from('friendships')
    .select('*').or('requester_id.eq.' + userId + ',addressee_id.eq.' + userId);
  const res = toResult('getFriendships', (data || []) as Friendship[], error);
  if (!res.ok) return res;
  const rows = res.data;

  const others = new Set(rows.flatMap(r => [r.requester_id, r.addressee_id]));
  others.delete(userId);
  const people = await profilesByIds([...others]);
  const peopleById = people.ok ? people.data : {};
  const of = (id: string): Profile => peopleById[id] || { id };
  const link = (r: Friendship, otherId: string): FriendLink => ({ row: r, person: of(otherId) });
  const otherOf = (r: Friendship) => (r.requester_id === userId ? r.addressee_id : r.requester_id);

  return ok({
    friends: rows.filter(r => r.status === 'accepted').map(r => link(r, otherOf(r))),
    incoming: rows.filter(r => r.status === 'pending' && r.addressee_id === userId).map(r => link(r, r.requester_id)),
    outgoing: rows.filter(r => r.status === 'pending' && r.requester_id === userId).map(r => link(r, r.addressee_id)),
  });
}

export async function requestFriend(selfId: string, otherId: string): Promise<Result<null>> {
  const { error } = await supabase.from('friendships')
    .upsert({ requester_id: selfId, addressee_id: otherId, status: 'pending' },
      { onConflict: 'requester_id,addressee_id' });
  return toResult('requestFriend', null, error);
}

export async function acceptFriend(rowId: string): Promise<Result<null>> {
  const { error } = await supabase.from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() }).eq('id', rowId);
  return toResult('acceptFriend', null, error);
}

export async function removeFriendship(rowId: string): Promise<Result<null>> {
  const { error } = await supabase.from('friendships').delete().eq('id', rowId);
  return toResult('removeFriendship', null, error);
}
