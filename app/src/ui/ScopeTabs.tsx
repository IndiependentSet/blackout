import type { BoardScope } from '../domain/types';
import { cx } from './cx';
import styles from './ScopeTabs.module.css';

const SCOPES: { scope: BoardScope; label: string }[] = [{ scope: 'week', label: 'THIS WEEK' }, { scope: 'allTime', label: 'ALL-TIME' }];

/** THIS WEEK / ALL-TIME switch that sits beside a board's tab. */
export function ScopeTabs({ scope, onChange }: { scope: BoardScope; onChange: (s: BoardScope) => void }) {
  return (
    <div className={styles.tabs}>
      {SCOPES.map(s => (
        <button key={s.scope} type="button" className={cx(styles.tab, scope === s.scope && styles.on)} onClick={() => onChange(s.scope)}>{s.label}</button>
      ))}
    </div>
  );
}
