import type { ReactNode } from 'react';
import '../tokens.css';
import { cx } from './cx';
import { Meteors, Starfield } from './Starfield';
import styles from './kit.module.css';

/** The sky behind a page: the usual night, the brighter sky of a result, Meteor Rush's red dawn, the duel's teal. */
export type Tone = 'night' | 'result' | 'rush' | 'duel' | 'deep';

interface Props {
  tone?: Tone;
  /** a full-height desktop layout instead of the phone column */
  wide?: boolean;
  children: ReactNode;
  className?: string;
}

/** Every Stargazer page: its sky, the starfield, and a phone-width column (or the full width on desktop). */
export function Page({ tone = 'night', wide = false, children, className }: Props) {
  return (
    <div className={cx('sg', styles.page, styles['tone-' + tone], wide && styles.pageWide)}>
      <Starfield wide={wide} />
      {tone === 'rush' && <Meteors />}
      <div className={cx(wide ? styles.wideInner : styles.column, className)}>{children}</div>
    </div>
  );
}

/** A page's title row: an optional back button, the heading, and whatever sits at the right. */
export function TopBar({ title, onBack, backLabel = 'Back', right, small }: { title?: ReactNode; onBack?: () => void; backLabel?: string; right?: ReactNode; small?: boolean }) {
  return (
    <div className={styles.topBar}>
      {onBack && <button className={styles.iconBtn} aria-label={backLabel} onClick={onBack}><BackGlyph /></button>}
      {title && <h1 className={small ? styles.headingSmall : styles.heading}>{title}</h1>}
      {right && <div className={styles.topRight}>{right}</div>}
    </div>
  );
}
const BackGlyph = () => <svg viewBox="0 0 24 24" width="22" height="22" className={styles.iconSvg} aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>;

/** A short uppercase label above a block. */
export const Eyebrow = ({ children, tone = 'mint' }: { children: ReactNode; tone?: 'mint' | 'soft' | 'mars' | 'faint' }) => (
  <div className={cx(styles.eyebrow, styles['eyebrow-' + tone])}>{children}</div>
);

/** A round initial for a player. */
export const Avatar = ({ letter, size = 40, tone = 'gold' }: { letter: string; size?: number; tone?: 'gold' | 'mint' | 'soft' | 'mars' }) => (
  <div className={cx(styles.avatar, styles['avatar-' + tone])} style={{ width: size, height: size, fontSize: size * 0.43 }} aria-hidden="true">{letter}</div>
);

/** A one-line notice in a soft panel (loading, an error, an empty list). */
export const Note = ({ children, tone }: { children: ReactNode; tone?: 'error' }) => (
  <div className={cx(styles.note, tone === 'error' && styles.noteError)} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>
);
