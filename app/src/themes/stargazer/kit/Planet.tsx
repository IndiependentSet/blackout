import type { CSSProperties } from 'react';
import { cx } from './cx';
import styles from './kit.module.css';

/** A world of the voyage, drawn as a lit sphere (placeholder art until real planets are drawn). `style` is for what moves it. */
export const Planet = ({ art, size, className, style }: { art: string; size?: number; className?: string; style?: CSSProperties }) => (
  <div className={cx(styles.planet, styles['planet-' + art], className)} style={size ? { width: size, height: size, ...style } : style} aria-hidden="true" />
);
