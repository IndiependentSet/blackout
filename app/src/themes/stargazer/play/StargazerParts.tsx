import type { ReactNode } from 'react';
import { cx } from '../kit/cx';
import { Icon } from '../kit/icons';
import { MiniStar } from '../kit/MiniStar';
import { SCOPES, type Scope, type SkyEntry } from './sky';
import styles from './Stargazer.module.css';

const SCOPE_ICONS: Record<Scope, ReactNode> = {
  spot: <><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></>,
  sweep: <><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /></>,
  count: <><line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" /></>,
};

/** The telescope's three hints: a row of short pills on a phone, a labelled list with key numbers on desktop. */
export function Telescope({ wide, active, onUse }: { wide: boolean; active: Scope | null; onUse: (scope: Scope) => void }) {
  return (
    <div className={wide ? styles.scopeList : styles.scopeRow}>
      {wide && <div className={styles.eyebrowSoft}>Telescope</div>}
      {SCOPES.map(t => (
        <button key={t.scope} className={cx(styles.scope, active === t.scope && styles.scopeOn)} aria-pressed={active === t.scope}
          onClick={() => onUse(t.scope)}>
          <Icon size={16}>{SCOPE_ICONS[t.scope]}</Icon>
          {wide ? t.long : t.short}
          {wide && <span className={styles.scopeKey}>{t.key}</span>}
        </button>
      ))}
    </div>
  );
}

/** Tonight's skies as dots under the header (phone). */
export function SkyDots({ skies }: { skies: SkyEntry[] }) {
  return <div className={styles.dots}>{skies.map(k => <div key={k.n} className={cx(styles.dot, styles[k.state])} />)}</div>;
}

/** Tonight's skies as a list down the left (desktop); a sky that's ready can be opened. */
export function SkyList({ skies, canOpen, onOpen }: { skies: SkyEntry[]; canOpen: (i: number) => boolean; onOpen: (i: number) => void }) {
  return (
    <>
      {skies.map((k, i) => (
        <button key={k.n} className={cx(styles.skyRow, k.state === 'cur' && styles.skyRowCur, k.state === 'next' && styles.skyRowNext)}
          disabled={!canOpen(i)} onClick={() => onOpen(i)}>
          <MiniStar state={k.state} size={22} />
          <b>Sky {k.n}</b>
          <span className={styles.skyNote}>{k.note}</span>
        </button>
      ))}
    </>
  );
}

/** The big lit count with what's still dark beside it. */
export function LitCount({ lit, label, wide }: { lit: number; label: string; wide: boolean }) {
  return (
    <div className={styles.count}>
      <div className={wide ? styles.bigWide : styles.big}>{lit}</div>
      <div className={wide ? styles.countTextWide : styles.countText}>{lit === 1 ? 'star' : 'stars'} lit<br /><span>{label}</span></div>
    </div>
  );
}

export const ParPill = ({ par }: { par: number }) => <div className={styles.par}>Par {par}</div>;
