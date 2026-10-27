import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './kit.module.css';

/** Takes the height a phone page has left over; a drawing inside shrinks to fit it (capped at `max` px wide). */
export const Fit = ({ children, max, className }: { children: ReactNode; max?: number; className?: string }) => (
  <div className={cx(styles.fit, className)} style={max ? { maxWidth: max, width: '100%', alignSelf: 'center' } : undefined}>{children}</div>
);

/** A list that may outgrow the screen: it scrolls inside its own panel, so the page itself never does. `fade` softens
    its top and bottom edges, for content that runs up against cards (the voyage path). */
export const Scroll = ({ children, className, label, fade }: { children: ReactNode; className?: string; label?: string; fade?: boolean }) => (
  <div className={cx(styles.scroll, fade && styles.scrollFade, className)} role={label ? 'region' : undefined} aria-label={label}>{children}</div>
);

/** A page with one main part (a drawing, the month, tonight's card) and the rest around it. Upright and on desktop it
    changes nothing: `before`, `lead` and `after` are laid out as if they were the column's own children, in that order.
    On a phone turned sideways, `lead` takes the left half at full height and `before` then `after` stack on the right,
    `after` scrolling on its own if it must. Only CSS tells the two apart, so turning the phone never remounts anything. */
export const Split = ({ before, lead, after }: { before?: ReactNode; lead: ReactNode; after?: ReactNode }) => (
  <div className={styles.split}>
    {before && <div className={styles.splitBefore}>{before}</div>}
    <div className={styles.splitLead}>{lead}</div>
    {after && <div className={styles.splitAfter}>{after}</div>}
  </div>
);
