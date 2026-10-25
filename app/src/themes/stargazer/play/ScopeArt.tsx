import type { Heading } from './slew';
import styles from './SkyStage.module.css';

/** The tube's rest angle, aimed up and to the right at the eyepiece's field. */
const AIM = -36;

interface Props {
  /** 0 aimed at the old sky, 1 at the new */
  turn: number;
  heading: Heading;
  size: number;
  opacity: number;
}

/** A small refractor on its tripod, in the corner of the board, swinging across as the view slews. */
export function ScopeArt({ turn, heading, size, opacity }: Props) {
  const swing = 20 * heading.dx + 12 * heading.dy;
  const angle = AIM + swing * (2 * turn - 1);
  return (
    <svg className={styles.scope} viewBox="0 0 120 120" width={size} height={size} style={{ opacity }} aria-hidden="true">
      <g className={styles.scopeLegs}>
        <line x1={52} y1={70} x2={20} y2={117} />
        <line x1={52} y1={70} x2={57} y2={118} />
        <line x1={52} y1={70} x2={88} y2={116} />
      </g>
      <g transform={`translate(52 64) rotate(${angle.toFixed(2)})`}>
        <rect className={styles.scopeBody} x={-40} y={-3} width={11} height={6} rx={1.5} />
        <path className={styles.scopeBody} d="M-30 -5 L36 -7 L36 7 L-30 5 Z" />
        <rect className={styles.scopeBody} x={-4} y={-14} width={22} height={5} rx={2.5} />
        <rect className={styles.scopeBody} x={35} y={-9} width={16} height={18} rx={2} />
        <ellipse className={styles.scopeLens} cx={51} cy={0} rx={2} ry={7.5} />
      </g>
      <circle className={styles.scopeHead} cx={52} cy={65} r={5} />
    </svg>
  );
}
