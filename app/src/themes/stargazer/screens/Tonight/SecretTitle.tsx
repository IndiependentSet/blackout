import { cx } from '../../kit/cx';
import { SECRET_SHOW_FROM, SECRET_TAPS, useSecretTaps } from './useSecretTaps';
import styles from './Tonight.module.css';

/* The Stargazer title, and the easter egg behind it: every tap sends out a gold ripple, from the third a counter
   climbs beside the title, and on the seventh the title lights up as the wormhole opens (`onSecret`). */
export function SecretTitle({ onSecret, wide }: { onSecret: () => void; wide: boolean }) {
  const { tap, count, pulse } = useSecretTaps(onSecret);
  const armed = count >= SECRET_TAPS;
  return (
    <span className={styles.secret}>
      {count > 0 && <span key={pulse} className={styles.ripple} aria-hidden="true" />}
      <button className={cx(wide ? styles.brandWide : styles.brand, armed && styles.armed)} onClick={tap}>Stargazer</button>
      {count >= SECRET_SHOW_FROM && <span className={cx(styles.tapCount, armed && styles.tapCountArmed)} aria-hidden="true">{count}</span>}
    </span>
  );
}
