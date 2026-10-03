import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './Message.module.css';

/** A line of feedback: an error (red) or an empty-state note (muted, centred). */
export function Message({ tone, children }: { tone: 'error' | 'muted'; children: ReactNode }) {
  return <div className={cx(styles.msg, styles[tone])}>{children}</div>;
}
