import { memo, useId } from 'react';
import type { Level } from '../../../domain/types';
import { skyOf } from './sky';
import styles from './SkyBoard.module.css';

/** A four-point star, 15 units from tip to centre. */
export const STAR_PATH = 'M0 -15 C1.6 -4 4 -1.6 15 0 C4 1.6 1.6 4 0 15 C-1.6 4 -4 1.6 -15 0 C-4 -1.6 -1.6 -4 0 -15 Z';

interface Props {
  level: Level;
  placed: number[];
  /** Sweep: the dark lines march in mint */
  sweep: boolean;
  /** Spot: the star the telescope rings, if any */
  ring: number | null;
  /** keyboard focus, drawn only once the keyboard has been used */
  focus: number | null;
  onTapStar: (node: number) => void;
}

/** The puzzle as a patch of night sky: tap a star to light it, and every line touching it glows. */
export const SkyBoard = memo(function SkyBoard({ level, placed, sweep, ring, focus, onTapStar }: Props) {
  const glowId = 'sg-glow' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const sky = skyOf(level, placed);
  const s = sky.scale;
  const dark = sky.lines.filter(l => !l.lit);
  const lit = sky.lines.filter(l => l.lit);
  const at = (i: number | null) => (i == null ? null : sky.stars[i]);
  const ringAt = at(ring), focusAt = at(focus);
  return (
    <svg className={styles.sky} viewBox={sky.viewBox} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Sky">
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0" className={styles.glowCore} />
          <stop offset=".4" className={styles.glowMid} />
          <stop offset="1" className={styles.glowEdge} />
        </radialGradient>
      </defs>
      {dark.map(l => (
        <line key={l.i} className={styles.lineDark} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          strokeWidth={2.5 * s} strokeDasharray={`${2 * s} ${9 * s}`} />
      ))}
      {sweep && dark.map(l => (
        <line key={'h' + l.i} className={styles.lineHot} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={3.5 * s} />
      ))}
      {lit.map(l => (
        <g key={l.i}>
          <line className={styles.lineGlow} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={10 * s} />
          <line className={styles.lineLit} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={3.5 * s} />
        </g>
      ))}
      {ringAt && <circle className={styles.ring} cx={ringAt.x} cy={ringAt.y} r={24 * s} strokeWidth={3 * s} />}
      {focusAt && <circle className={styles.focus} cx={focusAt.x} cy={focusAt.y} r={22 * s} strokeWidth={2 * s} />}
      {sky.stars.map(n => n.lit ? (
        <g key={n.i} className={styles.litStar}>
          <circle cx={n.x} cy={n.y} r={40 * s} fill={`url(#${glowId})`} />
          <path d={STAR_PATH} transform={`translate(${n.x} ${n.y}) scale(${s})`} className={styles.starShape} />
        </g>
      ) : (
        <g key={n.i}>
          <circle cx={n.x} cy={n.y} r={13 * s} className={styles.halo} />
          <circle cx={n.x} cy={n.y} r={6 * s} className={styles.dim} />
        </g>
      ))}
      {sky.stars.map(n => (
        <circle key={'t' + n.i} className={styles.hit} cx={n.x} cy={n.y} r={45}
          role="button" tabIndex={-1} aria-pressed={n.lit} aria-label={'Star ' + (n.i + 1)} onClick={() => onTapStar(n.i)} />
      ))}
    </svg>
  );
});
