import { STARS, twinkle } from './art';
import { CUES } from './timeline';
import { tween } from './motion';
import styles from './WormholeTransit.module.css';

/** The night the console sits in, over the whole screen. It fades in over Tonight (which drops away) and the stars go with the dive. */
export function Backdrop({ T }: { T: number }) {
  const cover = tween(T, 0, 1, CUES.Boarding, CUES.Boarding + 0.6);
  const off = tween(T, 1, 0, CUES.Wormhole - 0.4, CUES.Wormhole + 0.2);
  if (cover <= 0) return null;
  return (
    <div className={`${styles.layer} ${styles.night}`} style={{ opacity: cover }}>
      {off > 0 && (
        <div className={styles.layer} style={{ opacity: off }}>
          {STARS.map((s, i) => <div key={i} className={styles.star} style={{ left: s.x + '%', top: s.y + '%', width: s.r, height: s.r, opacity: twinkle(T, s) }} />)}
        </div>
      )}
    </div>
  );
}
