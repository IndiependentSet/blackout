import { memo } from 'react';
import { starfield } from '../play/sky';
import styles from './kit.module.css';

const FIELD_PHONE = starfield(7, 70);
const FIELD_WIDE = starfield(21, 160);

/** Twinkling background stars behind a page; decorative only. */
export const Starfield = memo(function Starfield({ wide }: { wide: boolean }) {
  return (
    <div className={styles.field} aria-hidden="true">
      {(wide ? FIELD_WIDE : FIELD_PHONE).map((s, i) => (
        <div key={i} className={styles.twinkle}
          style={{ left: s.x + '%', top: s.y + '%', width: s.r, height: s.r, animationDuration: s.dur + 's', animationDelay: s.delay + 's' }} />
      ))}
    </div>
  );
});

/** Three shooting stars falling across Meteor Rush. */
export function Meteors() {
  return (
    <div className={styles.meteors} aria-hidden="true">
      <div className={styles.meteor} style={{ left: '77%', top: 90, width: 140, animationDuration: '3.2s' }} />
      <div className={styles.meteor} style={{ left: '92%', top: 250, width: 110, animationDuration: '4.1s', animationDelay: '1.3s' }} />
      <div className={styles.meteor} style={{ left: '62%', top: 30, width: 90, animationDuration: '3.7s', animationDelay: '2.4s' }} />
    </div>
  );
}
