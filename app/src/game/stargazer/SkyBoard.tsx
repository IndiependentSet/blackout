import { memo } from 'react';
import type { Level } from '../../domain/types';
import { skyOf } from './sky';
import styles from './Stargazer.module.css';

interface Props {
  level: Level;
  placed: number[];
  onTapStar: (node: number) => void;
}

/** The puzzle as a patch of night sky: tap a star to light it, and every line touching it glows. */
export const SkyBoard = memo(function SkyBoard({ level, placed, onTapStar }: Props) {
  const sky = skyOf(level, placed);
  const s = sky.scale;
  return (
    <svg className={styles.sky} viewBox={sky.viewBox} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Sky">
      {sky.stars.filter(n => n.lit).map(n => <circle key={'g' + n.i} className={styles.glow} cx={n.x} cy={n.y} r={36 * s} />)}
      {sky.lines.map(l => (
        <line key={l.i} className={l.lit ? styles.lineLit : styles.lineDark} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          strokeWidth={(l.lit ? 4 : 3) * s} strokeDasharray={l.lit ? undefined : `${4 * s} ${7 * s}`} />
      ))}
      {sky.stars.map(n => (
        <g key={n.i} className={styles.star} role="button" tabIndex={0} aria-pressed={n.lit} aria-label={'Star ' + (n.i + 1)}
          onClick={() => onTapStar(n.i)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTapStar(n.i); } }}>
          <circle cx={n.x} cy={n.y} r={45} className={styles.hit} />
          {n.lit ? (
            <>
              <circle cx={n.x} cy={n.y} r={18 * s} className={styles.litHalo} />
              <circle cx={n.x} cy={n.y} r={10 * s} className={styles.litCore} />
            </>
          ) : <circle cx={n.x} cy={n.y} r={7 * s} className={styles.dim} />}
        </g>
      ))}
    </svg>
  );
});
