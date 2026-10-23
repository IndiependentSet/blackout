import { useState, type Dispatch } from 'react';
import { POOL_MODE_LABEL } from '../../domain/gameModes';
import { DEFAULT_CURVES, curveRuleErrors, parseCurve, poolSlots } from '../../domain/generation';
import { Button } from '../../themes/stargazer/kit/Button';
import { Num, Row } from '../Playground/controls';
import type { PoolEditor, PoolEditorAction } from './poolEditor';
import pg from '../Playground/Playground.module.css';
import styles from './LevelPools.module.css';

/** The curve as a whole: its seed, the retries every level gets, how many levels it makes, what the mode refuses about
    it, and the JSON. The tiers themselves are edited in the tier panel. */
export function CurvePanel({ state, dispatch }: { state: PoolEditor; dispatch: Dispatch<PoolEditorAction> }) {
  const { mode, curve } = state;
  const total = poolSlots(mode, curve).length;
  const errors = curveRuleErrors(mode, curve);

  return (
    <div className={pg.panel}>
      <section>
        <h3>{POOL_MODE_LABEL[mode]} curve</h3>
        <div className={styles.basis}>
          {mode === 'campaign' ? 'Tier order is level order: levels 1 to 100.'
            : mode === 'survival' ? 'A run plays tier 1 first and deepens by one tier per sky.' : 'A duel picks a tier: tier 1 is the easier one.'}
        </div>
        {mode === 'match' && <p className={styles.dirty}>
          Every night at 00:30 GMT a job republishes the Star Duel pool from the built-in default curve, with the day as its
          seed. A pool published here lasts until then.
        </p>}
        <Row label="Seed" help="seed"><Num v={curve.seed} min={0} max={1_000_000} on={seed => dispatch({ type: 'meta', patch: { seed } })} /></Row>
        <Row label="Retries" help="retries"><Num v={curve.retries} min={1} max={20} on={retries => dispatch({ type: 'meta', patch: { retries } })} /></Row>
        <div className={styles.basis}>{total} level{total === 1 ? '' : 's'} in all, from {curve.tiers.length} tier{curve.tiers.length === 1 ? '' : 's'}</div>
        {!!errors.length && <ul className={styles.errors}>{errors.map(e => <li key={e}>{e}</li>)}</ul>}
        <div className={styles.actions}>
          <Button size="xs" kind="outline" onClick={() => dispatch({ type: 'load', curve: DEFAULT_CURVES[mode], basis: 'the default' })}>Back to the default</Button>
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
        <Button size="xs" kind="soft" onClick={show}>Show the draft</Button>
        <Button size="xs" kind="mint" onClick={apply}>Use this JSON</Button>
      </div>
    </details>
  );
}
