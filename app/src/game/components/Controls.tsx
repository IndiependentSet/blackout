import type { HintTier } from '../../domain/types';
import { Button, cx } from '../../ui';
import { HINT_LABELS } from '../state/hints';
import { isWarning, type Banner, type Hud } from '../state/selectors';
import styles from './Controls.module.css';

/** "3/4 cats hired · 5/9 wrecked" and whatever the foreman last said. */
export function StatusRow({ hud, msg }: { hud: Hud; msg: string }) {
  return (
    <div className={styles.statusRow}>
      <div className={styles.stats}>
        <span className={cx(styles.big, styles[hud.tone])}>{hud.used}/{hud.par}</span>
        <span className={styles.label}>cats hired</span>
        <span className={cx(styles.big, styles.lit)}>{hud.lit}/{hud.edgeCount}</span>
        <span className={styles.label}>wrecked</span>
      </div>
      <div className={cx(styles.msg, isWarning(msg) && styles.warn)}>{msg}</div>
    </div>
  );
}

const TIERS: HintTier[] = [1, 2, 3];

/** The three consultants. The one whose advice is on the board is highlighted. */
export function HintBar({ active, onConsult }: { active: HintTier | null; onConsult: (tier: HintTier) => void }) {
  return (
    <div className={styles.hints}>
      {TIERS.map(t => (
        <button key={t} type="button" className={cx(styles.hint, active === t && styles.active)} onClick={() => onConsult(t)}>
          <span className={styles.hintKicker}>CONSULT {t}</span>
          <span>{HINT_LABELS[t]}</span>
        </button>
      ))}
    </div>
  );
}

const BANNER_CLASS = { working: styles.working, perfect: styles.perfect, over: styles.cleared } as const;

/** RECALL CREW, the status banner and NEXT. */
export function ActionBar({ banner, onRecall, onNext }: { banner: Banner; onRecall: () => void; onNext: () => void }) {
  return (
    <div className={styles.actions}>
      <Button variant="secondary" size="lg" onClick={onRecall} style={{ padding: '0 18px', fontSize: 15 }}>RECALL CREW</Button>
      <div className={cx(styles.banner, BANNER_CLASS[banner.tone])}>
        <span className={styles.bannerText}>{banner.text}</span>
        <button type="button" className={cx(styles.next, banner.tone !== 'working' && styles.cream, banner.canAdvance && styles.ready)} onClick={onNext}>{banner.nextLabel}</button>
      </div>
    </div>
  );
}
