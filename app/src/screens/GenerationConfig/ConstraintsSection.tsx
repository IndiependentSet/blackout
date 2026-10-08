import { OPTION_LIMITS as L, type LevelConstraints } from '../../domain/generation';
import { Check, Num, Row } from '../Playground/controls';
import type { HelpKey } from '../Playground/help';
import styles from '../Playground/Playground.module.css';

type Key = keyof LevelConstraints;
const ROWS: { k: Key & HelpKey; label: string; start: number; min: number; max: number }[] = [
  { k: 'minNodes', label: 'At least N nodes', start: 4, min: L.size.min, max: L.size.max },
  { k: 'maxK', label: 'Par at most', start: 2, min: 0, max: L.size.max },
  { k: 'hasDegree', label: 'Has degree', start: 3, min: 1, max: L.maxDegree.max },
];

/** A site's extra accept rules; ticking one on starts it at the game's site-1 value. */
export function ConstraintsSection({ c, onChange }: {
  c: LevelConstraints; onChange: (patch: Partial<Record<Key, number | null>>) => void;
}) {
  return (
    <section>
      <h3>Constraints</h3>
      {ROWS.map(({ k, label, start, min, max }) => {
        const v = c[k];
        return (
          <Row key={k} label={label} help={k}>
            <Check v={v !== undefined} on={on => onChange({ [k]: on ? start : null })} />
            {v !== undefined ? <Num v={v} min={min} max={max} label={label} on={n => onChange({ [k]: n })} />
              : <span className={styles.muted}>off</span>}
          </Row>
        );
      })}
    </section>
  );
}
