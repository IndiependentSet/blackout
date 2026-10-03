import { cx } from './cx';
import styles from './Logo.module.css';

/** The CATASTROPHE INC. lockup. */
export function Logo({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <div className={cx(styles.logo, styles[size])}>
      <span className={styles.word}>CATASTROPHE</span>
      <span className={styles.inc}>INC.</span>
    </div>
  );
}
