import { H, STREAKS, W, sprite } from './art';
import { clamp, Easing, MOTION, mix, mix3, tween } from './motion';
import { tunnelAt } from './tunnelState';
import { CUES } from './timeline';
import { SIDES, tubeGeometry } from './tunnelGeometry';
import styles from './WormholeTransit.module.css';

/** The tunnel's sky: a glow around the vanishing point that warms from star-blue to plum, with scanlines over it. */
export function TunnelBackdrop({ T, scale, vw, vh }: { T: number; scale: number; vw: number; vh: number }) {
  const { on, op, k, cx, cy } = tunnelAt(T);
  if (!on) return null;
  const x = vw / 2 + (cx - W / 2) * scale, y = vh / 2 + (cy - H / 2) * scale;
  return (
    <div className={styles.layer} style={{ opacity: op, background: `radial-gradient(60% 50% at ${x}px ${y}px, ${mix('var(--sg-night-2)', 'var(--purple)', k)} 0%, ${mix('var(--sg-night-0)', 'var(--tr-plum)', k)} 55%, var(--tr-void) 100%)` }}>
      <div className={`${styles.layer} ${styles.scan}`} />
    </div>
  );
}

const DEST = 'PURRXIMA B';
const FROM = 'NEPTUNE   ';
/** The destination readout scrambling from NEPTUNE to PURRXIMA B. */
const scramble = (T: number, k: number): string =>
  DEST.split('').map((ch, i) => (k * 1.4 > (i + 1) / DEST.length ? ch : (Math.floor(T * 20 + i * 7) % 3 ? '#%&*<>?/'[Math.floor(T * 30 + i) % 8] : FROM[i]))).join('');

const bracket = (x: number, y: number, sx: number, sy: number) =>
  <path key={`${x}-${y}`} d={`M${x} ${y + 22 * sy} V${y} H${x + 22 * sx}`} fill="none" stroke="var(--sg-mint)" strokeWidth="2" />;

/** Through the warp tube: rings and rails in three chromatic passes, an event horizon, a cat rushing up, and the ship's HUD. */
export function Tunnel({ T }: { T: number }) {
  const { on, op, k, travel, cx, cy } = tunnelAt(T);
  if (!on) return null;
  const { CatPlanet: cp } = CUES;
  const geo = tubeGeometry(T, travel, cx, cy);
  const col = (p: number) => mix3('var(--sg-mint)', 'var(--pink)', 'var(--amber)', clamp(k * 1.15 + p * 0.2 - 0.1, 0, 1));
  const layer = (dx: number, color: string | null, alpha: number, glow: boolean) => (
    <g transform={`translate(${dx} 0)`}>
      {geo.map((g, i) => <polygon key={i} points={g.pts.map(v => v.join(',')).join(' ')} fill="none" stroke={color ?? col(g.p)} strokeLinejoin="round"
        strokeWidth={(0.5 + g.p * 5) * (glow ? 4 : 1)} opacity={Math.min(1, g.p * 5) * alpha * (glow ? 0.12 : 0.3 + 0.7 * g.p)} />)}
      {Array.from({ length: SIDES }, (_, j) => <polyline key={'s' + j} points={geo.map(g => g.pts[j].join(',')).join(' ')} fill="none"
        stroke={color ?? col(0.7)} strokeWidth={glow ? 6 : 1.2} opacity={alpha * (glow ? 0.1 : 0.55)} />)}
    </g>
  );
  const streaks = STREAKS.map((s, i) => {
    const p = (s.ph + travel * 1.6) % 1;
    const r0 = 20 + Math.pow(p, 2) * 520, len = 10 + p * (40 + k * 140);
    return <line key={i} x1={cx + Math.cos(s.a) * r0} y1={cy + Math.sin(s.a) * r0} x2={cx + Math.cos(s.a) * (r0 + len)} y2={cy + Math.sin(s.a) * (r0 + len)}
      stroke={mix('var(--sg-twinkle)', 'var(--rose)', k)} strokeWidth={s.w} strokeLinecap="round" opacity={p * 0.9} />;
  });
  const catIn = tween(T, 0, 1, cp - 1.1, cp - 0.05, Easing.easeInCubic);
  const rim = col(0.9);
  const hud = tween(T, 0, 1, CUES.Wormhole + 0.1, CUES.Wormhole + 0.5, MOTION.enter) * (1 - tween(T, 0, 1, cp - 0.4, cp - 0.1));
  return (
    <div className={styles.tunnel} style={{ opacity: op }}>
      <svg width={W} height={H} className={styles.fill}>
        {layer(0, null, 1, true)}
        {layer(-2.5, 'var(--sg-mint)', 0.5, false)}
        {layer(2.5, 'var(--pink)', 0.5, false)}
        {layer(0, null, 1, false)}
        {streaks}
      </svg>
      <div className={styles.horizon} style={{ left: cx - 70, top: cy - 70, transform: `scale(${1 + k * 1.2})`,
        background: `radial-gradient(circle, var(--tr-void) 0%, var(--tr-void) 38%, ${rim} 46%, rgba(255, 255, 255, .9) 49%, ${rim} 53%, transparent 72%)` }} />
      {catIn > 0 && <img className={styles.cat} alt="" src={sprite('chaos', Math.floor(T / 0.18) % 2 ? 'wakeB' : 'wakeA')}
        style={{ left: cx - 90, top: cy - 90, opacity: Math.min(1, catIn * 3), transform: `scale(${0.08 + catIn * 2.2}) rotate(${(1 - catIn) * 200}deg)` }} />}
      <div className={styles.fill} style={{ opacity: hud }}>
        <svg width={W} height={H} className={styles.fill}>
          {bracket(18, 62, 1, 1)}{bracket(372, 62, -1, 1)}{bracket(18, 826, 1, -1)}{bracket(372, 826, -1, -1)}
          <circle cx={cx} cy={cy} r="96" fill="none" stroke="var(--sg-mint)" strokeWidth="1" strokeDasharray="4 10" opacity=".6" transform={`rotate(${-T * 30} ${cx} ${cy})`} />
          <path d={`M${cx - 112} ${cy} h12 M${cx + 100} ${cy} h12 M${cx} ${cy - 112} v12 M${cx} ${cy + 100} v12`} stroke="var(--sg-mint)" strokeWidth="1.5" />
        </svg>
        <div className={styles.hudBlock} style={{ left: 30 }}><span className={styles.hudLabel}>Warp</span><span className={styles.hudNum}>{(9.2 + k * 0.79).toFixed(2)}</span></div>
        <div className={styles.hudBlock} style={{ right: 30, alignItems: 'flex-end' }}>
          <span className={styles.hudLabel}>Field integrity</span>
          <span className={styles.hudNum} style={{ color: k > 0.6 ? 'var(--pink)' : undefined }}>{Math.round(100 - k * 87)}%</span>
        </div>
        <div className={styles.hudDest}>
          <div className={styles.hudDestRow}><span className={styles.hudLabel}>Destination</span><span className={`${styles.hudLabel} ${styles.hudDestName}`}>{scramble(T, k)}</span></div>
          <div className={styles.bar}><div className={styles.barFill} style={{ width: `${k * 100}%` }} /></div>
        </div>
      </div>
    </div>
  );
}
