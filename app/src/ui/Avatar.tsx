import { cx } from './cx';
import styles from './Avatar.module.css';

/** A player's initial in a round badge. */
export function Avatar({ letter, size = 'lg' }: { letter: string; size?: 'lg' | 'sm' }) {
  return <span className={cx(styles.avatar, styles[size])}>{letter}</span>;
}
