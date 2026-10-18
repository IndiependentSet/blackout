import { Button } from '../../ui';
import styles from './Match.module.css';

interface Props {
  /** true when you sent the challenge, false when it was sent to you */
  mine: boolean;
  opponentName: string;
  busy: boolean;
  error: string | null;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onOpenLobby: () => void;
}

/* A challenge nobody has accepted yet: the sender waits (and may call it off), the receiver answers it. */
export function MatchWaiting({ mine, opponentName, busy, error, onAccept, onDecline, onCancel, onOpenLobby }: Props) {
  const them = opponentName || 'A WORKMATE';
  return (
    <div className={styles.waiting}>
      <div className={`${styles.card} ${styles.waitCard}`} role="dialog" aria-label="challenge">
        <div className={styles.cardHead}>
          <span className={styles.order}>1VS1 · SAME HOUSE, TWO CREWS</span>
          <span className={styles.title}>{mine ? 'WAITING FOR ' + them : them + ' CHALLENGED YOU'}</span>
        </div>
        <div className={styles.cardBody}>
          <p className={styles.line}>
            {mine
              ? 'The match starts three seconds after they accept. The challenge lapses after an hour.'
              : 'Accept and a three-second countdown starts. First to flatten the site with the fewest cats wins; you have five minutes.'}
          </p>
          {error && <div className={styles.warn} role="alert">{error.toUpperCase()}</div>}
        </div>
        <div className={styles.actions}>
          <Button variant="glass" size="chip" onClick={onOpenLobby}>LOBBY</Button>
          {mine
            ? <Button variant="accent" disabled={busy} onClick={onCancel} style={{ flex: 1 }}>CANCEL CHALLENGE</Button>
            : (
              <>
                <Button variant="muted" size="chip" disabled={busy} onClick={onDecline}>DECLINE</Button>
                <Button variant="primary" disabled={busy} onClick={onAccept} style={{ flex: 1 }}>ACCEPT</Button>
              </>
            )}
        </div>
      </div>
    </div>
  );
}
