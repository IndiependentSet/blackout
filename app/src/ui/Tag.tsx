import type { CSSProperties, ReactNode } from 'react';
import { cx } from './cx';
import styles from './Tag.module.css';

/** A small label tag (SITES, SITE PROCEDURE…). For a tab that sits on a card, use TabHeader. */
export function Tag({ tone = 'purple', size = 'md', className, style, children }: {
  tone?: 'purple' | 'orchid'; size?: 'sm' | 'md' | 'lg'; className?: string; style?: CSSProperties; children: ReactNode;
}) {
  return <span className={cx(styles.tag, styles[tone], styles[size], className)} style={style}>{children}</span>;
}
