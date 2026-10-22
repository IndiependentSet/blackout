import { useCallback, useEffect, useRef, useState } from 'react';
import { countdownMs, matchRemainingMs, matchStatus, MATCH_GRACE_MS, otherPlayer } from '../../domain/match';
import { displayName } from '../../domain/profile';
import type { Match, MatchStatus, MatchView, Profile } from '../../domain/types';
import { openMatchChannel, type MatchChannel, type MatchChannelHandlers } from '../../services/realtime/matchChannel';
import { acceptMatch, closeExpiredMatches, declineMatch, forfeitMatch, getMatch, submitMatch } from '../../services/repositories/matches';
import { profilesByIds } from '../../services/repositories/profiles';
import type { Result } from '../../services/result';

const TICK_MS = 250;
/** while the clock has run out but the server has not settled the match, ask again this often */
const SETTLE_RETRY_MS = 2_000;

/** What the hook talks to, so a test can hand in fakes. */
export interface MatchDeps {
  getMatch: (matchId: string) => Promise<Result<MatchView | null>>;
  closeExpired: () => Promise<Result<number>>;
  submit: (matchId: string, nodes: number[]) => Promise<Result<Match>>;
  forfeit: (matchId: string) => Promise<Result<Match>>;
  accept: (matchId: string) => Promise<Result<Match>>;
  decline: (matchId: string) => Promise<Result<Match>>;
  profiles: (ids: string[]) => Promise<Result<Record<string, Profile>>>;
  openChannel: (matchId: string, userId: string, handlers: MatchChannelHandlers) => MatchChannel;
  now: () => number;
}

export const defaultMatchDeps: MatchDeps = {
  getMatch, closeExpired: closeExpiredMatches, submit: submitMatch, forfeit: forfeitMatch,
  accept: acceptMatch, decline: declineMatch, profiles: profilesByIds,
  openChannel: (matchId, userId, handlers) => openMatchChannel(matchId, userId, handlers),
  now: () => Date.now(),
};

/* A re-read returns the same graph as a new object. Keep the old one: the board builds its house per level
   object, and would rebuild it on every change the server announces. */
function keepLevel(prev: Match | undefined, next: Match): Match {
  return prev && prev.id === next.id && JSON.stringify(prev.level) === JSON.stringify(next.level) ? { ...next, level: prev.level } : next;
}

export interface MatchLive {
  /** the server's rows; null until the first read, and after it if the match is not yours to see */
  view: MatchView | null;
  loading: boolean;
  error: string | null;
  status: MatchStatus | null;
  /** ms until the first tap is allowed */
  countdown: number;
  /** ms left on the match clock */
  remaining: number;
  /** how many cables the opponent's cats cover, as they last said */
  opponentCovered: number;
  opponentName: string;
  /** their presence has been missing for the whole grace period while the match is live */
  opponentGone: boolean;
  sendProgress: (covered: number) => void;
  submit: (nodes: number[]) => Promise<Result<Match>>;
  forfeit: () => Promise<Result<Match>>;
  accept: () => Promise<Result<Match>>;
  decline: () => Promise<Result<Match>>;
  reload: () => void;
}

/* One match as the player sees it. The server's rows are the truth (read on mount, and again whenever the
   channel says they changed); the channel also carries the opponent's progress and who is present. What time
   it is for the match comes from the server's `starts_at`/`ends_at` against the clock ticking here, so a
   countdown, the live clock and "your opponent has left" are all derived, not stored: nothing waits on a
   timer to flip a flag. The channel is closed when the screen goes. */
export function useMatch(matchId: string, userId: string, deps: MatchDeps = defaultMatchDeps): MatchLive {
  const [view, setView] = useState<MatchView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [opponentCovered, setOpponentCovered] = useState(0);
  const [presence, setPresence] = useState(() => ({ here: false, since: deps.now() }));
  const [now, setNow] = useState(() => deps.now());
  const channel = useRef<MatchChannel | null>(null);
  const latest = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  /* a reply that is not the newest request's, or that lands after the screen has gone, is dropped */
  const reload = useCallback(() => {
    const mine = ++latest.current;
    deps.getMatch(matchId).then(r => {
      if (mine !== latest.current || !alive.current) return;
      setLoaded(true);
      if (!r.ok) return setError(r.error);
      setError(null);
      setView(prev => (r.data ? { ...r.data, match: keepLevel(prev?.match, r.data.match) } : null));
    });
  }, [matchId, deps]);

  useEffect(() => {
    reload();
    const ch = deps.openChannel(matchId, userId, {
      onPresence: ids => {
        const here = ids.some(id => id !== userId);
        setPresence(p => (p.here === here ? p : { here, since: deps.now() }));
      },
      onProgress: (from, covered) => { if (from !== userId) setOpponentCovered(covered); },
      onChange: reload,
    });
    channel.current = ch;
    return () => { ch.close(); channel.current = null; };
  }, [matchId, userId, reload, deps]);

  const match = view ? view.match : null;
  const otherId = match ? otherPlayer(match, userId) : null;

  useEffect(() => {
    if (!otherId) return;
    let live = true;
    deps.profiles([otherId]).then(r => { if (live && r.ok) setOpponent(r.data[otherId] ?? null); });
    return () => { live = false; };
  }, [otherId, deps]);

  const running = match !== null && match.status === 'active';
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(deps.now()), TICK_MS);
    return () => clearInterval(id);
  }, [running, deps]);

  const remaining = match ? matchRemainingMs(match.ends_at, now) : 0;
  const timeUp = running && match.ends_at !== null && remaining === 0;
  useEffect(() => {
    if (!timeUp) return;
    let live = true;
    const settle = () => { deps.closeExpired().then(() => { if (live) reload(); }); };
    settle();
    const id = setInterval(settle, SETTLE_RETRY_MS);
    return () => { live = false; clearInterval(id); };
  }, [timeUp, deps, reload]);

  const status = match ? matchStatus(match, now) : null;
  const liveSince = match && match.starts_at ? Date.parse(match.starts_at) : 0;
  const opponentGone = status === 'live' && !presence.here && now - Math.max(presence.since, liveSince) >= MATCH_GRACE_MS;

  const sendProgress = useCallback((covered: number) => { channel.current?.sendProgress(covered); }, []);

  const apply = useCallback((r: Result<Match>) => {
    if (r.ok && alive.current) {
      setView(v => (v ? { ...v, match: keepLevel(v.match, r.data) } : v));
      reload();
    }
    return r;
  }, [reload]);
  const submit = useCallback((nodes: number[]) => deps.submit(matchId, nodes).then(apply), [matchId, deps, apply]);
  const forfeit = useCallback(() => deps.forfeit(matchId).then(apply), [matchId, deps, apply]);
  const accept = useCallback(() => deps.accept(matchId).then(apply), [matchId, deps, apply]);
  const decline = useCallback(() => deps.decline(matchId).then(apply), [matchId, deps, apply]);

  return {
    view, loading: !loaded, error, status,
    countdown: match ? countdownMs(match.starts_at, now) : 0,
    remaining, opponentCovered, opponentName: displayName(opponent), opponentGone,
    sendProgress, submit, forfeit, accept, decline, reload,
  };
}
