import { useState, type Dispatch } from 'react';
import { POOL_MODE_LABEL } from '../../domain/gameModes';
import { DEFAULT_CURVES, curveRuleErrors, parseCurve, poolSlots } from '../../domain/generation';
import { Button } from '../../ui';
import type { PoolEditor, PoolEditorAction } from './poolEditor';
import pg from '../Playground/Playground.module.css';
import styles from './LevelPools.module.css';

/** The draft curve: a seed, the retries, and one row per tier. Anything finer (generator options, constraints) goes through the JSON. */
export function CurvePanel({ state, dispatch }: { state: PoolEditor; dispatch: Dispatch<PoolEditorAction> }) {
  const { mode, curve } = state;
  const total = poolSlots(mode, curve).length;
  const errors = curveRuleErrors(mode, curve);
  const num = (label: string, v: number, min: number, max: number, on: (n: number) => void) => (
    <input className={pg.num} type="number" aria-label={label} min={min} max={max} value={v}
      onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) on(n); }} />
  );

  return (
    <div className={pg.panel}>
      <section>
        <h3>{POOL_MODE_LABEL[mode]} curve</h3>
        <div className={styles.basis}>
          {mode === 'campaign' ? 'Tier order is level order: levels 1 to 100.'
            : mode === 'survival' ? 'A run plays tier 0 first and deepens by one tier per site.' : 'A challenge picks a tier: 0 is the easier one.'}
        </div>
        <div className={styles.meta}>
          <label>Seed {num('seed', curve.seed, 0, 1_000_000, seed => dispatch({ type: 'meta', patch: { seed } }))}</label>
          <label>Retries {num('retries', curve.retries, 1, 20, retries => dispatch({ type: 'meta', patch: { retries } }))}</label>
        </div>
        <table className={styles.tiers}>
          <thead><tr><th>Tier</th><th>Levels</th><th>Nodes</th><th>★</th><th /></tr></thead>
          <tbody>
            {curve.tiers.map((t, i) => (
              <tr key={i}>
                <td>{i}</td>
                <td>{num(`tier ${i} levels`, t.count, 1, 400, count => dispatch({ type: 'tier', index: i, patch: { count } }))}</td>
                <td>{num(`tier ${i} nodes`, t.size, 2, 60, size => dispatch({ type: 'tier', index: i, patch: { size } }))}</td>
                <td>{num(`tier ${i} stars`, t.diff, 1, 3, diff => dispatch({ type: 'tier', index: i, patch: { diff } }))}</td>
                <td><Button size="mini" variant="muted" disabled={curve.tiers.length === 1} aria-label={`remove tier ${i}`}
                  onClick={() => dispatch({ type: 'removeTier', index: i })}>×</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.basis}>{total} level{total === 1 ? '' : 's'} in all</div>
        {!!errors.length && <ul className={styles.errors}>{errors.map(e => <li key={e}>{e}</li>)}</ul>}
        <div className={styles.actions}>
          <Button size="mini" variant="secondary" onClick={() => dispatch({ type: 'addTier' })}>Add a tier</Button>
          <Button size="mini" variant="muted" onClick={() => dispatch({ type: 'load', curve: DEFAULT_CURVES[mode], basis: 'the default' })}>Default</Button>
        </div>
        <CurveJson state={state} dispatch={dispatch} />
      </section>
    </div>
  );
}

/** The curve as JSON, to copy out or to paste one in (checked as the pool would be). */
function CurveJson({ state, dispatch }: { state: PoolEditor; dispatch: Dispatch<PoolEditorAction> }) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const show = () => { setText(JSON.stringify(state.curve, null, 2)); setErrors([]); };
  const apply = () => {
    let raw: unknown;
    try { raw = JSON.parse(text); } catch (e) { setErrors([String(e)]); return; }
    const parsed = parseCurve(raw);
    const found = parsed.ok ? curveRuleErrors(state.mode, parsed.value) : parsed.errors;
    if (!parsed.ok || found.length) { setErrors(found); return; }
    setErrors([]);
    dispatch({ type: 'load', curve: parsed.value, basis: 'pasted JSON' });
  };
  return (
    <details onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open && !text) show(); }}>
      <summary>JSON</summary>
      <textarea className={styles.json} value={text} onChange={e => setText(e.target.value)} aria-label="curve JSON" spellCheck={false} />
      {!!errors.length && <ul className={styles.errors}>{errors.map(e => <li key={e}>{e}</li>)}</ul>}
      <div className={styles.actions}>
        <Button size="mini" variant="secondary" onClick={show}>Show the draft</Button>
        <Button size="mini" variant="mint" onClick={apply}>Use this JSON</Button>
      </div>
    </details>
  );
}
