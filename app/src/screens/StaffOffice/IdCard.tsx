import { SITE_COUNT } from '../../domain/sites';
import { displayName, initial } from '../../domain/profile';
import { useStreak } from '../../game/hooks/useStreak';
import { getAllTimeCount } from '../../services/repositories/siteClears';
import { useResource } from '../../hooks/useResource';
import { Avatar, Button, Field, Message, Panel, Stat } from '../../ui';
import { BadgeShelf } from './BadgeShelf';
import { useHandleEditor } from './useHandleEditor';
import styles from './StaffOffice.module.css';

interface Props {
  userId: string;
  email: string;
  username: string;
  /** sites on budget this week, for the weekly stat */
  weeklyPerfect: number;
  onSaved: (username: string) => void;
  onSignOut: () => void;
  onOpenCrew: () => void;
}

/* Who you are, your handle (editable), your stats, and the way into the crew roster. */
export function IdCard({ userId, email, username, weeklyPerfect, onSaved, onSignOut, onOpenCrew }: Props) {
  const handle = useHandleEditor(userId, username, onSaved);
  const allTime = useResource('alltime:' + userId, () => getAllTimeCount(userId));
  const streak = useStreak(userId);

  return (
    <Panel tab="STAFF ID CARD" tone="orchid">
      <div className={styles.who}>
        <Avatar letter={initial({ username })} />
        <div className={styles.identity}>
          {!handle.editing ? (
            <div className={styles.name}>
              <div className={styles.handle}>{displayName({ username })}</div>
              <Button variant="paper" size="mini" onClick={handle.start}>EDIT</Button>
            </div>
          ) : (
            <div className={styles.edit}>
              <Field compact value={handle.draft} onChange={e => handle.setDraft(e.target.value)} maxLength={16} autoFocus />
              <div className={styles.editButtons}>
                <Button size="mini" disabled={handle.saving} onClick={handle.save}>{handle.saving ? 'SAVING…' : 'SAVE'}</Button>
                <Button variant="paper" size="mini" disabled={handle.saving} onClick={handle.cancel}>CANCEL</Button>
              </div>
            </div>
          )}
          {!!handle.error && <div className={styles.error}>{handle.error}</div>}
          <div className={styles.email}>{email}</div>
        </div>
        <Button variant="paper" size="chip" className={styles.clockOut} onClick={onSignOut}>CLOCK OUT</Button>
      </div>

      <div className={styles.stats}>
        <Stat value={`${weeklyPerfect}/${SITE_COUNT}`} label="THIS WEEK PURR-FECT" />
        <Stat tone="lilac" value={allTime.data ?? 0} label="ALL-TIME SITES CLEARED" />
        <Stat value={streak.current} label={streak.best > streak.current ? `DAY STREAK · BEST ${streak.best}` : 'DAY STREAK'} />
      </div>
      {allTime.error && <Message tone="error">COULDN&apos;T LOAD STATS — {allTime.error}</Message>}

      <BadgeShelf userId={userId} />

      <Button variant="paper" size="chip" className={styles.crewLink} onClick={onOpenCrew} style={{ minHeight: 46, padding: '0 14px', fontSize: 12.5 }}>
        <span>CREW ROSTER &amp; SQUADS</span>
        <span className={styles.chevron}>&rsaquo;</span>
      </Button>
    </Panel>
  );
}
