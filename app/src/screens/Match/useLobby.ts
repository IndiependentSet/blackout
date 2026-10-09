import { useEffect, useRef, useState } from 'react';
import { groupMatches, otherPlayer, type MatchGroups } from '../../domain/match';
import type { FriendLink, Friendships, Match, MatchRecord, MatchView, Profile } from '../../domain/types';
import { useResource } from '../../hooks/useResource';
import { openInboxChannel } from '../../services/realtime/matchChannel';
import { getFriendships } from '../../services/repositories/friendships';
import { acceptMatch, closeExpiredMatches, createMatch, declineMatch, getMatchRecord, listMyMatches } from '../../services/repositories/matches';
import { profilesByIds } from '../../services/repositories/profiles';
import type { Result } from '../../services/result';

/** What the lobby talks to, so a test can hand in fakes. */
export interface LobbyDeps {
  list: (userId: string) => Promise<Result<MatchView[]>>;
  friends: (userId: string) => Promise<Result<Friendships>>;
  record: (userId: string) => Promise<Result<MatchRecord | null>>;
  profiles: (ids: string[]) => Promise<Result<Record<string, Profile>>>;
  closeExpired: () => Promise<Result<number>>;
  /** the server picks the level, from the 1vs1 pool */
  create: (opponentId: string) => Promise<Result<string>>;
  accept: (matchId: string) => Promise<Result<Match>>;
  decline: (matchId: string) => Promise<Result<Match>>;
  watch: (userId: string, onChange: () => void) => () => void;
}

export const defaultLobbyDeps: LobbyDeps = {
  list: userId => listMyMatches(userId),
  friends: getFriendships,
  record: getMatchRecord,
  profiles: profilesByIds,
  closeExpired: closeExpiredMatches,
  create: opponentId => createMatch(opponentId),
  accept: acceptMatch,
  decline: declineMatch,
  watch: (userId, onChange) => openInboxChannel(userId, onChange),
};

export interface Lobby {
  groups: MatchGroups;
  friends: FriendLink[];
  record: MatchRecord | null;
  names: Record<string, string>;
  loading: boolean;
  /** the last thing that went wrong, already worded for the player */
  error: string | null;
  busy: boolean;
  /** the friends who already have an open match with you, so they are not challenged twice */
  engaged: ReadonlySet<string>;
  challenge: (friendId: string) => Promise<string | null>;
  accept: (matchId: string) => Promise<boolean>;
  decline: (matchId: string) => Promise<void>;
}

/* The lobby: your challenges sorted into lists, the friends you can challenge, your record. The server settles
   expired matches first (lazily, see match-rpc.sql), and the inbox channel re-reads the list when anything
   about your matches changes. A failed read (for example the migration is not applied yet) is shown as a
   message; nothing else on the dashboard depends on this screen. */
export function useLobby(userId: string, deps: LobbyDeps = defaultLobbyDeps): Lobby {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const alive = useRef(true);

  const list = useResource('lobby:' + userId, async () => {
    await deps.closeExpired();
    return deps.list(userId);
  });
  const friends = useResource('lobby-friends:' + userId, () => deps.friends(userId));
  const record = useResource('lobby-record:' + userId, () => deps.record(userId));
  const reload = list.reload;
  /* useResource hands out a new `reload` every render; the inbox channel must not be reopened each time */
  const reloads = useRef({ list: list.reload, record: record.reload });
  useEffect(() => { reloads.current = { list: list.reload, record: record.reload }; });

  useEffect(() => {
    alive.current = true;
    const stop = deps.watch(userId, () => { reloads.current.list(); reloads.current.record(); });
    return () => { alive.current = false; stop(); };
  }, [userId, deps]);

  const views = list.data;
  const others = views ? [...new Set(views.map(v => otherPlayer(v.match, userId)))].sort().join(',') : null;
  useEffect(() => {
    if (!others) return;
    let live = true;
    deps.profiles(others.split(',')).then(r => {
      if (!live || !r.ok) return;
      setNames(Object.fromEntries(Object.entries(r.data).map(([id, p]) => [id, p.username ? '@' + p.username : ''])));
    });
    return () => { live = false; };
  }, [others, deps]);

  const act = async <T>(work: () => Promise<Result<T>>): Promise<Result<T>> => {
    setBusy(true);
    setActionError(null);
    const r = await work();
    if (!alive.current) return r;
    setBusy(false);
    if (!r.ok) setActionError(r.error);
    return r;
  };

  const challenge = (friendId: string) => act(() => deps.create(friendId)).then(r => (r.ok ? r.data : null));

  const accept = (matchId: string) => act(() => deps.accept(matchId)).then(r => r.ok);
  const decline = (matchId: string) => act(() => deps.decline(matchId)).then(() => reload());

  const friendLinks = friends.data ? friends.data.friends : [];
  const engaged = new Set<string>();
  for (const v of views ?? []) {
    if (v.match.status === 'pending' || v.match.status === 'active') engaged.add(otherPlayer(v.match, userId));
  }

  return {
    groups: groupMatches(views ?? [], userId),
    friends: friendLinks, record: record.data ?? null, names, engaged,
    loading: list.loading || friends.loading,
    error: actionError ?? list.error ?? friends.error,
    busy, challenge, accept, decline,
  };
}
