import { Button, Logo, Panel } from '../../ui';
import { STARS, sprite, twinkle } from './art';
import { MOTION, tween } from './motion';
import { CUES, type Branch } from './timeline';
import styles from './WormholeTransit.module.css';

const R = 520;
const CATS = [
  { key: 'chaos', x: 70, d: 0 }, { key: 'ninja', x: 160, d: 0.18 }, { key: 'whiskers', x: 245, d: 0.36 }, { key: 'diva', x: 330, d: 0.54 },
];

const worldOpacity = (T: number) => tween(T, 0, 1, CUES.CatPlanet - 0.1, CUES.CatPlanet + 0.4, MOTION.enter);

/** The sky over CATASTROPHE INC.'s planet, over the whole screen. */
export function CatBackdrop({ T }: { T: number }) {
  const op = worldOpacity(T);
  if (op <= 0) return null;
  return (
    <div className={`${styles.layer} ${styles.world}`} style={{ opacity: op }}>
      {STARS.map((s, i) => <div key={i} className={styles.worldStar} style={{ left: s.x + '%', top: s.y * 0.75 + '%', width: s.r, height: s.r,
        background: i % 5 ? 'var(--on-dark)' : 'var(--pink)', opacity: twinkle(T, s) }} />)}
    </div>
  );
}

/** The planet rises, four cats drop onto its horizon and pounce, and the new hire is handed their work order. */
export function CatWorld({ T, branch, onDone }: { T: number; branch: Branch; onDone: () => void }) {
  const cp = CUES.CatPlanet;
  const op = worldOpacity(T);
  if (op <= 0) return null;
  const top = tween(T, 1000, 640, cp + 0.1, cp + 1.0, MOTION.enter);
  const pcx = 195, pcy = top + R;
  const flip = Math.floor(T / 0.35) % 2;
  return (
    <div className={styles.fill} style={{ opacity: op }}>
      <div className={styles.planet} style={{ left: pcx - R, top, width: R * 2, height: R * 2 }} />
      {CATS.map((c, i) => {
        const dropAt = cp + 0.9 + c.d;
        if (T < dropAt) return null;
        const dy = Math.sqrt(R * R - (c.x - pcx) ** 2);
        const foot = pcy - dy + 14;
        const drop = tween(T, 0, 1, dropAt, dropAt + 0.45, MOTION.pop);
        const tilt = Math.atan2(c.x - pcx, dy) * 180 / Math.PI;
        const pounce = T > dropAt + 0.45 ? Math.sin((T + c.d) * 9) : 0;
        return <img key={c.key} className={styles.worldCat} alt="" src={sprite(c.key, (flip + i) % 2 ? 'wakeB' : 'wakeA')}
          style={{ left: c.x - 52, top: foot - 104, opacity: Math.min(1, drop * 2),
            transform: `rotate(${tilt + pounce * 2.5}deg) translateY(${(1 - drop) * -40 - Math.abs(pounce) * 3}px) scale(${0.6 + drop * 0.4})` }} />;
      })}
      <Hired T={T} branch={branch} onDone={onDone} />
    </div>
  );
}

function Hired({ T, branch, onDone }: { T: number; branch: Branch; onDone: () => void }) {
  const hd = CUES.Hired;
  if (T < hd) return null;
  const logo = tween(T, 0, 1, hd, hd + 0.45, MOTION.pop);
  const card = tween(T, 0, 1, hd + 0.5, hd + 0.95, MOTION.pop);
  const hired = tween(T, 0, 1, hd + 1.3, hd + 1.6, MOTION.pop);
  const btn = tween(T, 0, 1, hd + 1.0, hd + 1.4, MOTION.pop);
  return (
    <div className={styles.hired} data-noskip="">
      <div className={styles.lockup} style={{ opacity: Math.min(1, logo * 2), transform: `translateY(${(1 - logo) * -30}px) scale(${1.4 - 0.4 * logo})` }}>
        <span className={styles.lockupTag}>STRUCTURAL DEMOLITION</span>
        <Logo size="md" />
      </div>
      <div className={styles.order} style={{ opacity: Math.min(1, card * 2), transform: `translateY(${(1 - card) * 26}px) scale(${0.9 + 0.1 * card})` }}>
        <Panel tab="WORK ORDER · NEW HIRE">
          <div className={styles.orderBody}>
            <p className={styles.orderCopy}>{branch === 'autopilot' ? 'Right button, wrong planet.' : 'Wrong button, right planet.'} The Feline Division is one supervisor short, and you just landed on the job site.</p>
            <div className={styles.shift}>Shift starts now</div>
            <Button variant="primary" size="xl" onClick={onDone} style={{ opacity: Math.min(1, btn * 2), transform: `scale(${0.85 + 0.15 * btn})` }}>CLOCK IN</Button>
          </div>
        </Panel>
        {hired > 0 && <div className={styles.stamp} style={{ opacity: Math.min(1, hired * 2), transform: `rotate(${-8 - 18 * (1 - hired)}deg) scale(${2.2 - 1.2 * hired})` }}>HIRED!</div>}
      </div>
    </div>
  );
}
