import { supabase } from '../supabase/client';

/* The slice of the Supabase realtime client this file uses, so a test can hand in a fake. */
interface ChannelLike {
  on(type: string, filter: Record<string, unknown>, callback: (payload: unknown) => void): ChannelLike;
  subscribe(callback?: (status: string) => void): ChannelLike;
  track(payload: Record<string, unknown>): Promise<unknown>;
  presenceState(): Record<string, unknown>;
  send(message: { type: 'broadcast'; event: string; payload: Record<string, unknown> }): Promise<unknown>;
}
export interface RealtimeClientLike {
  channel(name: string, options?: Record<string, unknown>): ChannelLike;
  removeChannel(channel: ChannelLike): Promise<unknown>;
}
/* The real client's `.on` is overloaded per event type, which a structural interface cannot spell; the calls
   made here are the ones its docs show. */
const defaultClient = supabase as unknown as RealtimeClientLike;

export interface MatchChannelHandlers {
  /** who is in the channel right now (a snapshot, sent whenever someone joins or leaves) */
  onPresence: (userIds: string[]) => void;
  /** the opponent's progress: how many cables their cats cover */
  onProgress: (userId: string, covered: number) => void;
  /** the match or a player's row changed on the server: read it again */
  onChange: () => void;
}

export interface MatchChannel {
  /** tell the opponent how many cables are covered; dropped until the channel is joined */
  sendProgress: (covered: number) => void;
  /** leave the channel; safe to call more than once */
  close: () => void;
}

const PROGRESS = 'progress';

/* One match's live line. Three kinds of traffic share it:
     presence    who is here (used to notice an opponent who has left)
     broadcast   the opponent's progress, a bare number: it only draws a bar, never decides anything
     postgres_changes  the authoritative state: the server's rows, which row-level security shows only to the
                 two players. A change just means "read the match again".
   The channel is named by the match id, so progress is cosmetic and carries no nodes. */
export function openMatchChannel(
  matchId: string, userId: string, handlers: MatchChannelHandlers, client: RealtimeClientLike = defaultClient,
): MatchChannel {
  const channel = client.channel('match:' + matchId, { config: { presence: { key: userId }, broadcast: { self: false } } });
  let joined = false;
  let closed = false;

  channel
    .on('presence', { event: 'sync' }, () => handlers.onPresence(Object.keys(channel.presenceState())))
    .on('broadcast', { event: PROGRESS }, message => {
      const payload = (message as { payload?: { userId?: unknown; covered?: unknown } }).payload;
      if (!payload || typeof payload.userId !== 'string' || payload.userId === userId) return;
      if (typeof payload.covered !== 'number' || !Number.isFinite(payload.covered)) return;
      handlers.onProgress(payload.userId, Math.max(0, Math.floor(payload.covered)));
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: 'id=eq.' + matchId }, () => handlers.onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players', filter: 'match_id=eq.' + matchId }, () => handlers.onChange())
    .subscribe(status => {
      if (closed || status !== 'SUBSCRIBED') return;
      joined = true;
      void channel.track({ userId });
      // a change that landed between the first read and the subscription would otherwise be missed
      handlers.onChange();
    });

  return {
    sendProgress: covered => {
      if (!joined || closed) return;
      void channel.send({ type: 'broadcast', event: PROGRESS, payload: { userId, covered } });
    },
    close: () => {
      if (closed) return;
      closed = true;
      joined = false;
      void client.removeChannel(channel);
    },
  };
}

/* Your challenges as they change: a new invitation, an acceptance, a result. Just "read the list again". */
export function openInboxChannel(userId: string, onChange: () => void, client: RealtimeClientLike = defaultClient): () => void {
  const channel = client.channel('inbox:' + userId);
  let closed = false;
  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: 'opponent_id=eq.' + userId }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: 'created_by=eq.' + userId }, () => onChange())
    .subscribe();
  return () => {
    if (closed) return;
    closed = true;
    void client.removeChannel(channel);
  };
}
