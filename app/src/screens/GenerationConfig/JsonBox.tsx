import { useState } from 'react';
import type { GenerationSchedule } from '../../domain/generation';
import { checkGameSchedule } from '../../domain/generationConfig';
import { Button } from '../../ui';
import styles from './GenerationConfig.module.css';

/** The draft as JSON: to copy out, or to paste a schedule in (checked as the game would). */
export function JsonBox({ schedule, onApply }: { schedule: GenerationSchedule; onApply: (s: GenerationSchedule) => void }) {
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const show = () => { setText(JSON.stringify(schedule, null, 2)); setErrors([]); };
  const apply = () => {
    let raw: unknown;
    try { raw = JSON.parse(text); } catch (e) { setErrors([String(e)]); return; }
    const r = checkGameSchedule(raw);
    if (!r.ok) { setErrors(r.errors); return; }
    setErrors([]);
    onApply(r.value);
  };

  return (
    <details onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open && !text) show(); }}>
      <summary>JSON</summary>
      <textarea className={styles.json} value={text} onChange={e => setText(e.target.value)} aria-label="schedule JSON" spellCheck={false} />
      {!!errors.length && <ul className={styles.errors}>{errors.map(e => <li key={e}>{e}</li>)}</ul>}
      <div className={styles.actions}>
        <Button size="mini" variant="secondary" onClick={show}>Show the draft</Button>
        <Button size="mini" variant="mint" onClick={apply}>Use this JSON</Button>
      </div>
    </details>
  );
}
