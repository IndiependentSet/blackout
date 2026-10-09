import { configStatus, resolveSchedule, type ConfigStatus, type StoredConfig } from '../../domain/generationConfig';
import { Button, cx, Message } from '../../ui';
import { Info } from '../Playground/Info';
import { dayLabel } from './week';
import styles from './GenerationConfig.module.css';

const LABEL: Record<ConfigStatus, string> = { inForce: 'in force', scheduled: 'scheduled', past: 'past' };

/** Every saved config for the mode: load one into the editor, or cancel one that hasn't started. */
export function HistoryList({ rows, today, busy, onLoad, onCancel }: {
  rows: StoredConfig[]; today: number; busy: boolean;
  onLoad: (row: StoredConfig) => void; onCancel: (row: StoredConfig) => void;
}) {
  return (
    <section>
      <h3>Saved configs <Info k="history" /></h3>
      {!rows.length && <Message tone="muted">Nothing saved yet: every day plays the default.</Message>}
      <ul className={styles.history}>
        {rows.map(r => {
          const status = configStatus(r, rows, today);
          const broken = resolveSchedule(r).source === 'invalid';
          return (
            <li key={r.id}>
              <div className={styles.histHead}>
                <b>Day {r.effectiveFromDay}</b>
                <span className={styles.basis}>{dayLabel(r.effectiveFromDay)}</span>
                <span className={cx(styles.status, styles[status])}>{LABEL[status]}</span>
              </div>
              {r.note && <div className={styles.note}>{r.note}</div>}
              {broken && <div className={styles.note}><span className={styles.slow}>doesn’t parse: players get the default</span></div>}
              <div className={styles.actions}>
                <Button size="mini" variant="secondary" disabled={broken} onClick={() => onLoad(r)}>Load</Button>
                {status === 'scheduled' && <Button size="mini" variant="muted" disabled={busy} onClick={() => onCancel(r)}>Cancel it</Button>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
