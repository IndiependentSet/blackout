import { cx } from './cx';
import styles from './kit.module.css';

/** A world of the voyage, drawn as a lit sphere (placeholder art until real planets are drawn). */
export const Planet = ({ art, size, className }: { art: string; size?: number; className?: string }) => (
  <div className={cx(styles.planet, styles['planet-' + art], className)} style={size ? { width: size, height: size } : undefined} aria-hidden="true" />
);
