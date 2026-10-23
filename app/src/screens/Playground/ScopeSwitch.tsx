import { useId } from 'react';
import { cx } from '../../themes/stargazer/kit/cx';
import type { EditScope } from './scope';
import styles from './Playground.module.css';

/** What a settings-panel edit reaches: the open sky or tier (`one`, e.g. "Tier 2 · levels 6–11") or all of them. */
export function ScopeSwitch({ scope, one, all, onScope }: { scope: EditScope; one: string; all: string; onScope: (s: EditScope) => void }) {
  const label = useId();
  return (
    <div className={styles.scope}>
      <span className={styles.scopeLabel} id={label}>Changes below apply to</span>
      <div className={styles.scopeChoice} role="radiogroup" aria-labelledby={label}>
        {(['one', 'all'] as const).map(s => (
          <button key={s} type="button" role="radio" aria-checked={scope === s}
            className={cx(styles.scopeOption, scope === s && styles.scopeOn)} onClick={() => onScope(s)}>{s === 'one' ? one : all}</button>
        ))}
      </div>
      {scope === 'all' && <p className={styles.scopeNote}>
        Each setting you change is copied to every one of them. Everything you don’t touch (size, stars, budget, hardness)
        stays each one’s own. The values shown are the open one’s.
      </p>}
    </div>
  );
}
