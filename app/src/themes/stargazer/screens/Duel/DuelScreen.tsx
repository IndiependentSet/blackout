import { useEffect, useState } from 'react';
import { coveredEdges } from '../../../../domain/cover';
import { formatClock } from '../../../../domain/survival';
import type { Match } from '../../../../domain/types';
import { useMatch } from '../../../../game/match/useMatch';
import { useMatchSession } from '../../../../game/useMatchSession';
import type { Result } from '../../../../services/result';
import { Button } from '../../kit/Button';
import { Avatar, Note, Page, TopBar } from '../../kit/Page';
import { SkyPlay } from '../../play/SkyPlay';
import { plural } from '../../copy';
import { DuelResult } from './DuelResult';
import styles from './Duel.module.css';

interface Props {
  matchId: string;
  userId: string;
  initial: string;
  avatar?: string | null;
  onOpenLobby: () => void;
  onOpenHub: () => void;
}

const Bar = ({ covered, total, tone }: { covered: number; total: number; tone: 'mine' | 'theirs' }) => (
  <div className={styles.track} role="progressbar" aria-label={tone === 'mine' ? 'your progress' : 'their progress'}
    aria-valuemin={0} aria-valuemax={total} aria-valuenow={covered}>
    <div className={tone === 'mine' ? styles.fillMine : styles.fillTheirs} style={{ width: (total ? Math.min(100, (covered / total) * 100) : 0) + '%' }} />
  </div>
);

/* Star Duel in play (1i): both players on the same sky, the clock between them. The board locks until the server's
   countdown is over; a full cover is sent at once, and the server decides the winner. */
export function DuelScreen({ matchId, userId, initial, avatar, onOpenLobby, onOpenHub }: Props) {
  const match = useMatch(matchId, userId);
  const { view, status, sendProgress } = match;
  const level = view ? view.match.level : null;
  const session = useMatchSession(level, match.submit);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const covered = level ? coveredEdges(level, session.state.placed).size : 0;
  useEffect(() => { sendProgress(covered); }, [covered, status, sendProgress]);

  const run = (action: () => Promise<Result<Match>>) => {
    setBusy(true); setActionError(null);
    action().then(r => { setBusy(false); if (!r.ok) setActionError(r.error); });
  };
  const them = match.opponentName || 'Your opponent';
  const themInitial = them.replace('@', '').slice(0, 1).toUpperCase() || '?';

  if (match.loading || !view || status === null) {
    return (
      <Page tone="duel">
        <TopBar title="Star Duel" onBack={onOpenLobby} backLabel="Lobby" />
        <Note tone={match.loading ? undefined : 'error'}>{match.loading ? 'Finding the sky…' : match.error ?? 'That duel isn’t yours to see.'}</Note>
      </Page>
    );
  }
  const row = view.match;
  const mine = view.players.find(p => p.user_id === userId);
  const theirs = view.players.find(p => p.user_id !== userId);
  const result = <DuelResult view={view} userId={userId} opponentName={them} onOpenLobby={onOpenLobby} onOpenHub={onOpenHub} />;

  if (status === 'pending') {
    const sent = row.created_by === userId;
    return (
      <Page tone="duel">
        <TopBar title="Star Duel" onBack={onOpenLobby} backLabel="Lobby" />
        <section className={styles.invite}>
          <div className={styles.who}>
            <Avatar letter={themInitial} size={46} tone="mint" />
            <div className={styles.whoText}><b>{sent ? `Waiting for ${them}` : `${them} challenged you`}</b>
              <span>{sent ? 'The duel starts three seconds after they accept. The challenge lapses after an hour.' : 'Accept and a three-second countdown starts. You have five minutes.'}</span></div>
          </div>
          {actionError && <Note tone="error">{actionError}</Note>}
          <div className={styles.inviteActions}>
            {sent
              ? <Button kind="outline" size="md" tone="mint" className={styles.grow} disabled={busy} onClick={() => run(match.forfeit)}>Call it off</Button>
              : <>
                  <Button kind="mint" size="md" className={styles.grow} disabled={busy} onClick={() => run(match.accept)}>Accept</Button>
                  <Button kind="ghost" size="md" tone="soft" disabled={busy} onClick={() => run(match.decline)}>Decline</Button>
                </>}
          </div>
        </section>
      </Page>
    );
  }
  if (status === 'done' || status === 'void') return result;

  const total = row.level.edges.length;
  const theirDone = theirs && theirs.cats_used !== null;
  const lockedIn = mine && mine.cats_used !== null;
  const top = (
    <>
      <div className={styles.versus}>
        <div className={styles.side}><Avatar letter={initial} avatar={avatar} size={38} /><div className={styles.sideText}><b>You</b><span className={styles.gold}>{lockedIn ? `locked · ${mine?.cats_used}` : `${session.state.placed.length} lit`}</span></div></div>
        <div className={styles.clock} role="timer" aria-label={status === 'countdown' ? 'starts in' : 'time left'}>
          {status === 'countdown' ? Math.max(1, Math.ceil(match.countdown / 1000)) : formatClock(match.remaining)}
        </div>
        <div className={styles.sideRight}><div className={styles.sideText}><b>{them}</b><span className={styles.mint}>{theirDone ? `done · ${theirs?.cats_used}` : match.opponentGone ? 'away' : 'charting'}</span></div><Avatar letter={themInitial} size={38} tone="mint" /></div>
      </div>
      <div className={styles.bars}><Bar covered={covered} total={total} tone="mine" /><Bar covered={match.opponentCovered} total={total} tone="theirs" /></div>
    </>
  );
  const status_ = status === 'countdown' ? 'Get ready: the sky opens in a moment.'
    : theirDone ? `${them} finished with ${theirs?.cats_used}. Light the whole figure with fewer to win.`
    : match.opponentGone ? `${them} has left the sky. The clock decides.` : null;

  return (
    <SkyPlay session={session} userId={userId} locked={status !== 'live'} tone="duel" title="Star Duel" onBack={onOpenLobby} top={top}
      status={status_}
      primary={{ label: lockedIn ? `Locked in · ${plural(mine?.cats_used ?? 0, 'star')}` : 'Lock in my sky', disabled: true }}
      footer={(
        <div className={styles.forfeit}>
          {actionError && <Note tone="error">{actionError}</Note>}
          <Button kind="ghost" size="sm" onClick={onOpenLobby}>Lobby</Button>
          {sure
            ? <Button kind="ghost" size="sm" tone="mint" disabled={busy} onClick={() => run(match.forfeit)}>Sure? Give up this duel</Button>
            : <Button kind="ghost" size="sm" disabled={busy} onClick={() => setSure(true)}>Give up</Button>}
        </div>
      )} />
  );
}
