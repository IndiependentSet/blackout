import { memo, useId } from 'react';
import type { SkyFigure } from '../../../domain/types';
import { STAR_PATH } from '../play/SkyBoard';
import { skyOf } from '../play/sky';
import styles from './kit.module.css';

type Mode =
  /** tonight's next sky, nothing lit yet */
  | 'dim'
  /** lit by some stars: their lines glow and they are drawn as four-point stars (a charted figure lights them all) */
  | 'lit'
  /** an atlas thumbnail: thin gold lines and small glowing stars */
  | 'atlas';

interface Props {
  figure: SkyFigure;
  mode: Mode;
  /** the stars drawn lit (lit mode) */
  lit?: readonly number[];
  className?: string;
}

/** A sky drawn still, for previews, the night's result and the atlas. */
export const Figure = memo(function Figure({ figure, mode, lit = [], className }: Props) {
  const glowId = 'sg-fig' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const sky = skyOf(figure, mode === 'lit' ? lit : []);
  const s = sky.scale;
  const glow = `url(#${glowId})`;
  return (
    <svg className={className ?? styles.figure} viewBox={sky.viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0" className={styles.glowCore} /><stop offset=".4" className={styles.glowMid} /><stop offset="1" className={styles.glowEdge} />
        </radialGradient>
      </defs>
      {mode === 'dim' && <>
        {sky.lines.map(l => <line key={l.i} className={styles.figDark} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={3 * s} strokeDasharray={`${2 * s} ${10 * s}`} />)}
        {sky.stars.map(n => (
          <g key={n.i}><circle cx={n.x} cy={n.y} r={14 * s} className={styles.figHalo} /><circle cx={n.x} cy={n.y} r={6.5 * s} className={styles.figDim} /></g>
        ))}
      </>}
      {mode === 'lit' && <>
        {sky.lines.map(l => l.lit ? (
          <g key={l.i}>
            <line className={styles.figLineGlow} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={12 * s} />
            <line className={styles.figLine} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={3.5 * s} />
          </g>
        ) : <line key={l.i} className={styles.figDark} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={3 * s} strokeDasharray={`${2 * s} ${10 * s}`} />)}
        {sky.stars.map(n => n.lit ? (
          <g key={n.i}>
            <circle cx={n.x} cy={n.y} r={44 * s} fill={glow} />
            <path d={STAR_PATH} transform={`translate(${n.x} ${n.y}) scale(${s})`} className={styles.figStar} />
          </g>
        ) : <circle key={n.i} cx={n.x} cy={n.y} r={7 * s} className={styles.figStar} />)}
      </>}
      {mode === 'atlas' && <>
        {sky.lines.map(l => <line key={l.i} className={styles.figLine} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={5 * s} />)}
        {sky.stars.map(n => (
          <g key={n.i}><circle cx={n.x} cy={n.y} r={30 * s} fill={glow} /><circle cx={n.x} cy={n.y} r={9 * s} className={styles.figStar} /></g>
        ))}
      </>}
    </svg>
  );
});
