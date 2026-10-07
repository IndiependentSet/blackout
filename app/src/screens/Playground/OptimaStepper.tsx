import { Button } from '../../ui';
import { Info } from './Info';
import { optimumCaption, stepOptimum } from './optima';
import styles from './Playground.module.css';

/** Toggle for marking other optimal covers in the schematic, and ◀ ▶ to step through them. */
export function OptimaStepper({ on, onToggle, idx, kept, others, onStep }: {
  on: boolean; onToggle: (on: boolean) => void;
  /** which kept cover is shown */
  idx: number;
  /** covers the solver kept, and how many other optima there are in all */
  kept: number; others: number;
  onStep: (idx: number) => void;
}) {
  return (
    <span className={styles.toggle}>
      <label><input type="checkbox" checked={on} onChange={e => onToggle(e.target.checked)} /> other optima</label>
      {on && (kept > 0
        ? <>
            {kept > 1 && <Button size="mini" variant="secondary" aria-label="previous optimum" onClick={() => onStep(stepOptimum(idx, -1, kept))}>◀</Button>}
            <span className={styles.muted}>{optimumCaption(idx, kept, others)}</span>
            {kept > 1 && <Button size="mini" variant="secondary" aria-label="next optimum" onClick={() => onStep(stepOptimum(idx, 1, kept))}>▶</Button>}
          </>
        : <span className={styles.muted}>none (unique)</span>)}
      <Info k="otherOptima" />
    </span>
  );
}
