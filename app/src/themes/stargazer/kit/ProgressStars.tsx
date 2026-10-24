import type { SkyEntry } from '../play/sky';
import { cx } from './cx';
import styles from './ProgressStars.module.css';

/** Tonight's skies as a bar of segments: gold at par, dim gold over par, ringed while open, faint while still to come. */
export function ProgressStars({ skies }: { skies: SkyEntry[] }) {
  const charted = skies.filter(k => k.state === 'par' || k.state === 'over').length;
  const atPar = skies.filter(k => k.state === 'par').length;
  return (
    <div className={styles.bar} role="img" aria-label={`${charted} of ${skies.length} skies charted, ${atPar} at par`}
      style={{ gridTemplateColumns: `repeat(${skies.length}, 1fr)` }}>
      {skies.map(k => <i key={k.n} className={cx(styles.seg, styles[k.state])} />)}
    </div>
  );
}
