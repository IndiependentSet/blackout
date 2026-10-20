import { moonOf } from '../../../domain/nights';
import type { Night } from '../../../domain/types';
import styles from './kit.module.css';

interface Props {
  night: Night | undefined;
  size?: number;
  /** tonight gets a mint ring */
  today?: boolean;
  /** a night still to come is drawn as an empty ring */
  future?: boolean;
}

/** A night as a moon: new when nothing was charted, full for a perfect night, partly lit in between. */
export function Moon({ night, size = 26, today = false, future = false }: Props) {
  const { state, fill } = moonOf(night);
  /* the shadow disc slides off to the right as the moon fills; fully off for a full moon */
  const shadowX = state === 'full' ? 113 : state === 'none' ? 14 : 14 + 2 + fill * 12;
  const label = future ? 'still to come' : state === 'full' ? 'perfect night' : state === 'none' ? 'nothing charted' : `${night?.perfect ?? 0} at par`;
  return (
    <svg viewBox="0 0 28 28" width={size} height={size} role="img" aria-label={label}>
      <circle cx="14" cy="14" r="10" className={styles.moonLit} />
      <circle cx={shadowX} cy="14" r="10.6" className={styles.moonShadow} />
      <circle cx="14" cy="14" r="10" className={today ? styles.moonToday : future ? styles.moonFuture : styles.moonRingNone} />
    </svg>
  );
}
