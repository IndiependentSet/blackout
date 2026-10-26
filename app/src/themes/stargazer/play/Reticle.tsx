import { cx } from '../kit/cx';
import styles from './Reticle.module.css';

/** The eyepiece's crosshair: two broken hairlines and a small centre ring. Fills its box (the slew's eyepiece, the loupe). */
export function Reticle({ className }: { className?: string }) {
  return (
    <svg className={cx(styles.reticle, className)} viewBox="-50 -50 100 100" aria-hidden="true">
      <line x1={-47} y1={0} x2={-9} y2={0} />
      <line x1={9} y1={0} x2={47} y2={0} />
      <line x1={0} y1={-47} x2={0} y2={-9} />
      <line x1={0} y1={9} x2={0} y2={47} />
      <circle r={4} />
    </svg>
  );
}
