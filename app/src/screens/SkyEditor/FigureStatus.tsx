import type { FigureCheck } from '../../domain/generation';
import styles from './SkyEditor.module.css';

/** What a drawing comes to: par, stars, whether it has one answer, and anything wrong with it. */
export function FigureStatus({ check }: { check: FigureCheck }) {
  const { level, optima, errors, warnings, playable } = check;
  return (
    <div className={styles.status} aria-live="polite">
      {level && (
        <div className={styles.facts}>
          <span>Par <b>{level.k}</b></span>
          <span>Stars <b>{'★'.repeat(level.stars)}</b></span>
          <span className={playable ? styles.good : styles.bad}>{playable ? 'One answer ✓' : `${optima} answers`}</span>
        </div>
      )}
      {errors.length > 0 && <ul className={styles.errors}>{errors.map(e => <li key={e}>{e}</li>)}</ul>}
      {warnings.length > 0 && <ul className={styles.warnings}>{warnings.map(w => <li key={w}>{w}</li>)}</ul>}
      {playable && !warnings.length && <p className={styles.good}>Ready to play.</p>}
    </div>
  );
}
