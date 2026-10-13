import { heldBadges } from '../../domain/badges';
import { useResource } from '../../hooks/useResource';
import { listBadgesOf } from '../../services/repositories/badges';
import styles from './BadgeShelf.module.css';

/* A player's badges, loaded for them. A shelf is a bonus: while it loads, or if it can't be read (the table
   isn't there yet, the network is down), it shows nothing rather than an error on the card it sits on. */
export function BadgeShelf({ userId }: { userId: string }) {
  const res = useResource('badges:' + userId, () => listBadgesOf(userId));
  if (!res.data) return null;
  const held = heldBadges(res.data);

  return (
    <div className={styles.shelf} aria-label="Badges">
      <div className={styles.head}>BADGES · {held.length}</div>
      {held.length === 0 ? (
        <div className={styles.empty}>NO BADGES YET</div>
      ) : (
        <ul className={styles.list}>
          {held.map(b => (
            <li key={b.id} className={styles.badge} title={b.description}>
              <span className={styles.name}>{b.name}</span>
              <span className={styles.desc}>{b.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
