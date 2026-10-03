import type { CSSProperties, ReactNode } from 'react';
import { cx } from './cx';
import styles from './Panel.module.css';

export type TabTone = 'purple' | 'orchid';

/** The folder-tab header that sits on top of a card. */
export function TabHeader({ tone = 'purple', children, className, style }: {
  tone?: TabTone; children: ReactNode; className?: string; style?: CSSProperties;
}) {
  return <div className={cx(styles.tab, styles[tone], className)} style={style}>{children}</div>;
}

/** A parchment card, optionally under a folder tab. `tight` is the dense list variant. */
export function Panel({ tab, tone, tight, flush, className, style, children }: {
  tab?: ReactNode; tone?: TabTone; tight?: boolean; flush?: boolean;
  className?: string; style?: CSSProperties; children: ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      {tab != null && <TabHeader tone={tone}>{tab}</TabHeader>}
      <div className={cx(styles.card, tight && styles.tight, flush && styles.flush, className)} style={style}>{children}</div>
    </div>
  );
}
