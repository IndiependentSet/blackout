import { useEffect, useState } from 'react';
import { coveredEdges } from '../../domain/cover';
import type { Match } from '../../domain/types';
import { GameScreen } from '../../game/GameScreen';
import { useMatchSession } from '../../game/useMatchSession';
import type { Result } from '../../services/result';
import { Button, Message, type StaffBadgeInfo } from '../../ui';
import { MatchHud } from './MatchHud';
import { MatchResult } from './MatchResult';
import { MatchWaiting } from './MatchWaiting';
import { useMatch, type MatchDeps } from './useMatch';
import styles from './Match.module.css';

interface Props {
  matchId: string;
  userId: string;
  badge: StaffBadgeInfo;
  onOpenAccount: () => void;
  onOpenLobby: () => void;
  onOpenHub: () => void;
  /** only a test hands these in */
  deps?: MatchDeps;
}

function Notice({ children, onOpenLobby }: { children: string; onOpenLobby: () => void }) {
  return (
    <div className={styles.waiting}>
      <div className={styles.card}>
        <div className={styles.cardBody}>
          <Message tone="muted">{children}</Message>
        </div>
        <div className={styles.actions}>
          <Button variant="glass" size="chip" onClick={onOpenLobby} style={{ flex: 1 }}>LOBBY</Button>
        </div>
      </div>
    </div>
  );
}

/* One 1vs1, from the challenge being answered to the result sheet. The board is the usual game screen, kept
   locked until the server's clock says go; the match itself (rows, clock, opponent) lives in useMatch. Leaving
   the screen does not end the match: the clock keeps running and it can be reopened from the lobby. FORFEIT is
   the only way to give it up. */
export function MatchScreen({ matchId, userId, badge, onOpenAccount, onOpenLobby, onOpenHub, deps }: Props) {
  const match = useMatch(matchId, userId, deps);
  const { view, status, sendProgress } = match;
  const level = view ? view.match.level : null;
  const session = useMatchSession(level, match.submit);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const covered = level ? coveredEdges(level, session.state.placed).size : 0;
  useEffect(() => { sendProgress(covered); }, [covered, status, sendProgress]);

  const run = (action: () => Promise<Result<Match>>) => {
    setBusy(true);
    setActionError(null);
    action().then(r => { setBusy(false); if (!r.ok) setActionError(r.error); });
  };

  if (match.loading) return <Notice onOpenLobby={onOpenLobby}>LOADING MATCH…</Notice>;
  if (!view || status === null) return <Notice onOpenLobby={onOpenLobby}>{match.error ? match.error.toUpperCase() : 'THAT MATCH IS NOT YOURS TO SEE.'}</Notice>;

  const { match: row } = view;
  const result = <MatchResult view={view} userId={userId} opponentName={match.opponentName} onOpenLobby={onOpenLobby} onOpenHub={onOpenHub} />;

  if (status === 'pending') {
    return (
      <MatchWaiting mine={row.created_by === userId} opponentName={match.opponentName} busy={busy} error={actionError}
        onAccept={() => run(match.accept)} onDecline={() => run(match.decline)} onCancel={() => run(match.forfeit)}
        onOpenLobby={onOpenLobby} />
    );
  }
  /* called off before it began: there is no board to show behind the sheet */
  if (status === 'void' && row.starts_at === null) return <div className={styles.waiting}>{result}</div>;

  return (
    <>
      <GameScreen session={session} userId={userId} badge={badge} locked={status !== 'live'}
        onOpenAccount={onOpenAccount} onOpenHub={onOpenHub}
        hud={(
          <MatchHud status={status} countdown={match.countdown} remaining={match.remaining} mine={covered}
            theirs={match.opponentCovered} total={row.level.edges.length} opponentName={match.opponentName}
            opponentGone={match.opponentGone} onForfeit={() => run(match.forfeit)} />
        )} />
      {(status === 'done' || status === 'void') && result}
    </>
  );
}
