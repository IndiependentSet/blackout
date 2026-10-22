import { STARS } from './art';
import { Easing, MOTION, tween } from './motion';
import { CUES, type Branch } from './timeline';
import styles from './WormholeTransit.module.css';

interface Props {
  T: number;
  /** what the film shows: the player's button, or the slip while they have not pressed one */
  branch: Branch;
  /** whether a button has been pressed (or pressed for them) */
  decided: boolean;
  onChoose: (branch: Branch) => void;
}

/* The Stargazer-7 console: a viewport on Neptune and a card with two buttons. Both are real buttons until one is
   pressed; either way the Wormhole drive ends up engaged. */
export function Cockpit({ T, branch, decided, onChoose }: Props) {
  const { Boarding: b, WrongButton: wb, Wormhole: wh } = CUES;
  const auto = branch === 'autopilot';
  const autoOn = auto && T >= wb + 0.15;
  const inP = tween(T, 0, 1, b + 0.3, b + 1.0, MOTION.enter);
  const dive = tween(T, 0, 1, wh - 0.3, wh + 0.7, Easing.easeInCubic);
  if (inP <= 0 || dive >= 1) return null;
  const pressAt = auto ? wb + 0.75 : wb + 0.15;
  const pressed = T >= pressAt;
  const press = pressed ? 1 - 0.06 * Math.max(0, 1 - (T - pressAt) / 0.2) : 1;
  const autoPress = autoOn ? 1 - 0.06 * Math.max(0, 1 - (T - wb - 0.15) / 0.2) : 1;
  const warn = pressed || autoOn;
  const alarm = pressed ? 0.5 + 0.5 * Math.sin((T - wb) * 14) : 0;
  const warp = tween(T, 0, 1, wb + 0.3, wh, Easing.easeInQuad);
  const shake = pressed ? Math.sin(T * 60) * (2 + warp * 4) : 0;
  const live = !decided && inP >= 1;
  return (
    <div className={styles.cockpit} data-noskip="" style={{ opacity: inP * (1 - dive), transform: `translate(${shake}px, ${(1 - inP) * 80}px) scale(${1 + dive * 2.2})`, transformOrigin: '195px 240px' }}>
      <div className={styles.window}>
        {STARS.slice(0, 40).map((s, i) => {
          const dx = s.x * 3.5 - 175, dy = s.y * 3.8 - 190, len = warp * 60 * (0.4 + s.r / 3);
          return <div key={i} className={styles.streak} style={{ left: 175 + dx * (1 + warp * 0.5), top: 190 + dy * (1 + warp * 0.5), width: s.r + len, height: s.r,
            opacity: 0.4 + 0.5 * Math.abs(Math.sin(T / s.dur * 3 + s.ph)), transform: `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)` }} />;
        })}
        <div className={styles.neptune} style={{ opacity: 1 - warp }} />
        <div className={`${styles.eyebrow} ${styles.viewportLabel}`}>Viewport</div>
        <div className={styles.alarm} style={{ opacity: alarm * 0.22 }} />
      </div>
      <div className={styles.panel} style={{ boxShadow: `inset 0 0 0 ${pressed ? 2 : 1}px ${pressed ? `rgba(242, 167, 116, ${0.3 + alarm * 0.5})` : 'rgba(255, 255, 255, .06)'}` }}>
        <div className={styles.eyebrow} style={{ color: warn ? 'var(--sg-mars)' : 'var(--sg-mint)' }}>{autoOn ? 'Autopilot · rerouted' : pressed ? 'Warning · course lost' : 'Ship’s console'}</div>
        <div className={styles.title}>{autoOn ? 'That’s not Neptune.' : pressed ? 'Uh oh.' : 'Stargazer-7'}</div>
        <div className={styles.readouts}>
          <div><span>Course</span><span style={{ color: warn ? 'var(--sg-mars)' : 'var(--sg-text)' }}>{autoOn ? 'Purrxima b' : pressed ? '¿¿¿' : 'Neptune'}</span></div>
          <div><span>Autopilot</span><span style={{ color: 'var(--sg-text)' }}>{autoOn ? 'Overridden' : pressed ? 'Offline' : 'Ready'}</span></div>
        </div>
        <div className={styles.buttons}>
          <button className={`${styles.pill} ${styles.gold}`} disabled={!live} onClick={() => onChoose('autopilot')}
            style={{ opacity: pressed && !auto ? 0.45 : 1, transform: `scale(${autoPress})` }}>{autoOn ? 'Autopilot engaged' : 'Engage autopilot'}</button>
          <button className={`${styles.pill} ${styles.mars}`} disabled={!live} onClick={() => onChoose('slip')}
            style={{ transform: `scale(${press})`, boxShadow: pressed ? `0 0 ${20 + alarm * 30}px rgba(242, 167, 116, ${0.4 + alarm * 0.4})` : 'none' }}>
            {pressed ? (auto ? 'Drive engaged itself' : 'Wormhole drive engaged') : 'Wormhole drive'}
            {!pressed && <span className={styles.warning}>Do not press</span>}
          </button>
        </div>
      </div>
      <Finger T={T} branch={branch} />
    </div>
  );
}

/** The demo finger that reaches for autopilot, and slips onto the other button unless the player pressed one. */
function Finger({ T, branch }: { T: number; branch: Branch }) {
  const { Boarding: b, WrongButton: wb } = CUES;
  const auto = branch === 'autopilot';
  const show = tween(T, 0, 1, b + 1.0, b + 1.3, MOTION.enter) * (1 - tween(T, 0, 1, wb + 0.5, wb + 0.8));
  if (show <= 0) return null;
  const toGold = tween(T, 0, 1, b + 1.0, b + 1.8);
  const slip = auto ? 0 : tween(T, 0, 1, b + 2.2, wb + 0.1, Easing.easeInBack);
  const x = 330 + (195 - 330) * toGold + (wb > T ? Math.sin(T * 9) * 6 * slip : 0);
  const y = 900 + (712 - 900) * toGold + (780 - 712) * slip;
  const down = T >= wb + 0.1 && T < wb + 0.35;
  return <div className={styles.finger} style={{ left: x - 22, top: y - 22, opacity: show, transform: `scale(${down ? 0.8 : 1})` }} />;
}
