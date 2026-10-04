import { SITE_COUNT } from '../../../domain/sites';
import { Stamp } from '../primitives';
import { useTick } from '../useTick';
import { cx } from '../../../ui';
import styles from '../Demos.module.css';

const TIERS = [
  { label: 'SURVEY', body: 'Points at a pad with only one path. Its neighbour is always the safe hire.', icon: '🔍' },
  { label: 'ESTIMATE', body: 'Proves the fewest cats this site can possibly need.', icon: '🧮' },
  { label: 'INSIDER', body: 'Leaks one pad from the purr-fect crew. Costs you some pride.', icon: '🤫' },
];

/** The three consultants. */
export function ConsultDemo() {
  return (
    <div className={styles.tiers}>
      {TIERS.map((h, i) => (
        <div key={h.label} className={styles.tier} style={{ animationDelay: `${i * 0.12}s` }}>
          <span aria-hidden="true" className={styles.tierIcon}>{h.icon}</span>
          <div>
            <div className={styles.tierName}>{h.label}</div>
            <div className={styles.tierBody}>{h.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Seven bars filling in: the week's sites closing one by one. */
export function WeekDemo({ sites }: { sites: readonly string[] }) {
  const lit = Math.min(useTick(450), SITE_COUNT);
  return (
    <div className={styles.week}>
      <div className={styles.bars}>
        {sites.map((s, i) => (
          <div key={s} title={s} className={styles.barCol}>
            <div className={cx(styles.bar, i < lit && styles.closed)} style={{ height: 34 + i * 9 }}>{i < lit ? 'S' : i + 1}</div>
          </div>
        ))}
      </div>
      <div className={styles.legend}>S = SITE CLOSED ON BUDGET</div>
      <div className={styles.finale}>
        {lit === SITE_COUNT && <Stamp style={{ fontSize: 20, transform: 'rotate(-4deg)' }}>WEEKLY INVOICE: PURR-FECT</Stamp>}
      </div>
    </div>
  );
}
