import { cx } from './cx';
import styles from './Pills.module.css';

/** A row of pill choices, one on: the switch between two boards or audiences. */
export function Pills<T extends string>({ items, value, onChange, label }: { items: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string }) {
  return (
    <div className={styles.pills} role="tablist" aria-label={label}>
      {items.map(i => (
        <button key={i.id} role="tab" aria-selected={i.id === value} className={cx(styles.pill, i.id === value && styles.on)} onClick={() => onChange(i.id)}>{i.label}</button>
      ))}
    </div>
  );
}
