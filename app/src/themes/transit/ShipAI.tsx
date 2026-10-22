import { CUES, type Branch } from './timeline';
import styles from './WormholeTransit.module.css';

/** The ship's voice: one line at a time, typed on, narrating the whole trip. The last line is in CATASTROPHE colours. */
export function ShipAI({ T, branch }: { T: number; branch: Branch }) {
  const { Boarding: b, WrongButton: wb, Wormhole: wh, CatPlanet: cp, Hired: hd } = CUES;
  const auto = branch === 'autopilot';
  const lines = [
    { at: b + 0.9, until: wb + 0.1, text: 'Good evening, Stargazer. Course set for Neptune.' },
    { at: wb + 0.2, until: wh, text: auto ? 'Autopilot engaged. Destination… overridden?' : 'That was the other button.' },
    { at: wh + 0.2, until: wh + 1.7, text: 'Unscheduled wormhole. Keep your paws inside the ship.' },
    { at: wh + 1.7, until: cp - 0.2, text: auto ? 'Override signed: CATASTROPHE INC., Recruiting.' : 'Who left a cat in the navigation system?' },
    { at: cp + 0.4, until: hd, text: 'Arrived: Purrxima b. Population: mostly cats.' },
  ];
  const l = lines.find(x => T >= x.at && T < x.until);
  if (!l) return null;
  const shown = l.text.slice(0, Math.floor((T - l.at) * 42));
  const fade = Math.min(1, (T - l.at) / 0.15, (l.until - T) / 0.15);
  const hot = l.at >= cp;
  return (
    <div className={`${styles.ai} ${hot ? styles.aiHot : styles.aiCool}`} style={{ opacity: fade }}>
      <span className={styles.aiTag} style={{ color: hot ? 'var(--pink)' : 'var(--sg-mint)' }}>SHIP AI</span>
      <span className={styles.aiText}>{shown}<span style={{ opacity: Math.floor(T * 4) % 2 }}>▍</span></span>
    </div>
  );
}
