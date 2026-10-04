import { Button, cx } from '../../ui';
import type { ScoreCardState } from '../hooks/useScoreCard';
import { bestNote, cardTitle, saveNote, signed, type SaveStatus } from '../state/scoreCopy';
import styles from './ScoreCard.module.css';

interface Props {
  state: ScoreCardState;
  day: number;
  siteNo: number;
  siteName: string;
  nextLabel: string;
  save: SaveStatus | null;
  onReview: () => void;
  onNext: () => void;
}

/* The itemised bill that follows a clear: rows land one by one, then the
   total counts up and the grade is stamped. */
export function ScoreCard({ state, day, siteNo, siteName, nextLabel, save, onReview, onNext }: Props) {
  const { run, prevScore, step, total } = state;
  return (
    <div className={styles.scrim}>
      <div className={styles.card} role="dialog" aria-label="site score">
        <div className={cx(styles.head, run.status === 'perfect' ? styles.perfect : styles.over)}>
          <div className={styles.titles}>
            <span className={styles.order}>WORK ORDER #{day} · SITE {siteNo}</span>
            <span className={styles.title}>{cardTitle(run)}</span>
            <span className={styles.site}>{siteName}</span>
          </div>
          <div className={cx(styles.grade, styles[run.grade])}>{run.grade}</div>
        </div>
        <div className={styles.body}>
          {run.rows.map((r, i) => (
            <div key={i} className={styles.row} style={{ opacity: i < step ? 1 : 0, transform: `translateY(${i < step ? 0 : 10}px)` }}>
              <span className={styles.rowLabel}>{r.label}</span>
              <span className={styles.rowNote}>{r.note}</span>
              <span className={styles.dots} />
              <span className={cx(styles.rowValue, r.v < 0 && styles.penalty)}>{signed(r.v)}</span>
            </div>
          ))}
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>TOTAL</span>
            <span className={styles.totalValue}>{total.toLocaleString()}</span>
            <span className={styles.pts}>PTS</span>
          </div>
          <div className={styles.best}>{bestNote(run, prevScore, total >= run.score)}</div>
          <div className={styles.save}>{saveNote(save)}</div>
        </div>
        <div className={styles.actions}>
          <Button variant="paper" size="chip" onClick={onReview}
            style={{ minHeight: 52, padding: '0 16px', borderWidth: 3, borderRadius: 13, boxShadow: 'var(--lift)', fontSize: 12, letterSpacing: '.08em' }}>REVIEW SITE</Button>
          <Button variant="primary" onClick={onNext} style={{ flex: 1, minHeight: 52, borderRadius: 13, fontSize: 17 }}>{nextLabel}</Button>
        </div>
      </div>
    </div>
  );
}
