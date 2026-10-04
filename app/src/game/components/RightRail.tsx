import type { ReactNode } from 'react';
import { Button, Tag, cx } from '../../ui';
import { KEY_LEGEND, PROCEDURE } from '../copy';
import styles from './RightRail.module.css';

/** Right of the board: the procedure, the invoice, and (once the week is done) the shareable invoice. */
export function RightRail({ hidden, children }: { hidden: boolean; children: ReactNode }) {
  return <aside className={cx(styles.aside, hidden && styles.hidden)}>{children}</aside>;
}

export function Procedure() {
  return (
    <>
      <Tag className={styles.tag}>SITE PROCEDURE</Tag>
      <div className={cx(styles.card, styles.procedure)}>
        {PROCEDURE.map(s => (
          <div key={s.n} className={styles.step}>
            <span className={styles.stepNo}>{s.n}</span>
            <div>
              <div className={styles.stepHead}>{s.head}</div>
              <div className={styles.stepBody}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/** Running total for the week, and what going over (or staying under) budget means on this site. */
export function Invoice({ total, scored, par }: { total: number; scored: string; par: number | null }) {
  return (
    <>
      <Tag tone="orchid" className={styles.tag}>THE INVOICE</Tag>
      <div className={cx(styles.card, styles.invoice)}>
        <div className={styles.total}>
          <span className={styles.points}>{total.toLocaleString()}</span>
          <span className={styles.small}>PTS BILLED</span>
          <span className={cx(styles.small, styles.done)}>{scored}</span>
        </div>
        <div className={styles.budgets}>
          <div className={styles.budget}>
            <div className={styles.budgetHead}>{par == null ? '—' : par + 1 + ' CATS'}</div>
            <div className={styles.budgetBody}>OVER BUDGET — ACCOUNTS WILL CALL.</div>
          </div>
          <div className={cx(styles.budget, styles.budgetOn)}>
            <div className={styles.budgetHead}>{par == null ? '—' : par + ' CATS'}</div>
            <div className={styles.budgetBody}>ON BUDGET — PURR-FECT.</div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Once all seven sites are scored: the week's invoice as shareable text. */
export function ShareCard({ text, copied, onCopy }: { text: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className={cx(styles.card, styles.share)}>
      <div className={styles.shareHead}>WEEKLY INVOICE</div>
      <div className={styles.shareText}>{text}</div>
      <Button variant="primary" onClick={onCopy}>{copied ? 'COPIED!' : 'COPY INVOICE'}</Button>
    </div>
  );
}

export const KeyLegend = () => <div className={styles.legend}>{KEY_LEGEND}</div>;

