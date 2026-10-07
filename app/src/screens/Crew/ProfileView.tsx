import { SITE_COUNT } from '../../domain/sites';
import { displayName, initial } from '../../domain/profile';
import type { Profile } from '../../domain/types';
import { Avatar, Button, Panel, Stat } from '../../ui';
import { BadgeShelf } from '../StaffOffice/BadgeShelf';
import { NO_SCORES, type Scores } from './versus';
import { PROFILE_ACTION, STANDING, type Relation } from './relation';
import styles from './Crew.module.css';

interface Props {
  person: Profile;
  relation: Relation;
  score: Scores | undefined;
  onAdd: () => void;
  onRemove: () => void;
  onAccept: () => void;
  onHeadToHead: () => void;
}

/** A workmate's personnel file: standing, scores, and the one thing you can do about them. */
export function ProfileView({ person, relation, score, onAdd, onRemove, onAccept, onHeadToHead }: Props) {
  const s = score ?? NO_SCORES;
  const act = relation === 'none' ? onAdd : relation === 'friend' ? onRemove : relation === 'incoming' ? onAccept : undefined;
  return (
    <div className={styles.stack}>
      <Panel tab="PERSONNEL FILE" tone="orchid">
        <div className={styles.who}>
          <Avatar letter={initial(person)} />
          <div className={styles.whoName}>
            <div className={styles.nameLg}>{displayName(person)}</div>
            <div className={styles.standing}>{STANDING[relation]}</div>
          </div>
        </div>
        <div className={styles.stats}>
          <Stat basis={130} value={`${s.week_score}/${SITE_COUNT}`} label="THIS WEEK ON BUDGET" />
          <Stat basis={130} tone="lilac" value={s.score} label="ALL-TIME SITES CLEARED" />
        </div>
        <BadgeShelf userId={person.id} />
        <div className={styles.buttons}>
          <Button disabled={relation === 'outgoing'} variant={relation === 'outgoing' ? 'muted' : relation === 'friend' ? 'secondary' : 'primary'}
            size="md" onClick={act} style={{ flex: '1 1 150px', opacity: relation === 'outgoing' ? 0.6 : 1 }}>{PROFILE_ACTION[relation]}</Button>
          {relation === 'friend' && <Button onClick={onHeadToHead} style={{ flex: '1 1 150px' }}>HEAD TO HEAD</Button>}
        </div>
      </Panel>
    </div>
  );
}
