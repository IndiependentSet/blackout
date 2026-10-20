import type { SkyState } from '../play/sky';
import { cx } from './cx';
import styles from './kit.module.css';

/** A small four-point star, 13 units from tip to centre. */
export const MINI_STAR = 'M0 -13 C1.4 -3.5 3.5 -1.4 13 0 C3.5 1.4 1.4 3.5 0 13 C-1.4 3.5 -3.5 1.4 -13 0 C-3.5 -1.4 -1.4 -3.5 0 -13 Z';

/** One of tonight's skies as a star: gold at par, dim gold over it, outlined while open or still to come. */
export function MiniStar({ state, size = 30 }: { state: SkyState; size?: number }) {
  return (
    <svg viewBox="-16 -16 32 32" width={size} height={size} aria-hidden="true">
      <path d={MINI_STAR} className={cx(styles.miniStar, styles['star-' + state])} />
    </svg>
  );
}
