import { useState, type Dispatch } from 'react';
import type { GameMode } from '../../domain/gameModes';
import { DEFAULT_SCHEDULE } from '../../domain/generation';
import { checkGameSchedule, configForDay, earliestEffectiveDay, resolveSchedule, type StoredConfig } from '../../domain/generationConfig';
import { Button, Message } from '../../ui';
import { Num, Row } from '../Playground/controls';
import { HistoryList } from './HistoryList';
import { JsonBox } from './JsonBox';
import type { EditorAction, EditorState } from './editor';
import type { useConfigWrites } from './useConfigWrites';
import { dayLabel } from './week';
import pg from '../Playground/Playground.module.css';
import styles from './GenerationConfig.module.css';

interface Props {
  mode: GameMode;
  today: number;
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  rows: StoredConfig[];
  rowsError: string | null;
  writes: ReturnType<typeof useConfigWrites>;
}

/** Save the draft from a day on, start again from the default or what's in force, and the saved history. */
export function SavePanel({ mode, today, state, dispatch, rows, rowsError, writes }: Props) {
  const earliest = earliestEffectiveDay(today);
  const [day, setDay] = useState(earliest);
  const [note, setNote] = useState('');
  const [savedDay, setSavedDay] = useState<number | null>(null);
  const check = checkGameSchedule(state.schedule);
  const inForce = configForDay(rows, today);
  const replaces = rows.find(r => r.effectiveFromDay === day);

  const save = async () => {
    if (!check.ok || day < earliest) return;
    setSavedDay(null);
    if (await writes.save(mode, day, check.value, note.trim())) {
      setSavedDay(day);
      dispatch({ type: 'saved', basis: `day ${day}’s config` });
    }
  };
  const load = (row: StoredConfig) => {
    const r = resolveSchedule(row);
    if (r.source === 'saved') dispatch({ type: 'load', schedule: r.schedule, basis: `day ${row.effectiveFromDay}’s config` });
  };
  const cancel = (row: StoredConfig) => {
    if (window.confirm(`Cancel the config due to start on day ${row.effectiveFromDay}?`)) void writes.remove(row.id);
  };

  return (
    <div className={pg.panel}>
      <section>
        <h3>Save</h3>
        <Row label="Effective from day" help="effectiveDay">
          <Num v={day} min={earliest} on={n => setDay(Math.max(earliest, Math.round(n)))} />
        </Row>
        <div className={styles.basis}>{dayLabel(day)}{replaces ? ' · replaces the config saved for that day' : ''}</div>
        <label className={styles.field}>
          <span className={styles.basis}>Note</span>
          <input value={note} maxLength={200} onChange={e => setNote(e.target.value)} placeholder="what changed, and why" />
        </label>
        {!check.ok && <ul className={styles.errors}>{check.errors.map(e => <li key={e}>{e}</li>)}</ul>}
        {writes.error && <Message tone="error">{writes.error}</Message>}
        {savedDay !== null && !state.dirty && <div className={styles.ok}>Saved: from day {savedDay} on, the game generates with this.</div>}
        <div className={styles.actions}>
          <Button size="mini" variant="primary" disabled={!check.ok || writes.busy} onClick={() => void save()}>
            {writes.busy ? 'Saving…' : 'Save'}
          </Button>
          <Button size="mini" variant="muted" onClick={() => dispatch({ type: 'load', schedule: DEFAULT_SCHEDULE, basis: 'the default' })}>Default</Button>
          {inForce && <Button size="mini" variant="secondary" disabled={resolveSchedule(inForce).source !== 'saved'}
            onClick={() => load(inForce)}>In force today</Button>}
        </div>
        <JsonBox schedule={state.schedule} onApply={schedule => dispatch({ type: 'load', schedule, basis: 'pasted JSON' })} />
      </section>
      {rowsError ? <Message tone="error">{rowsError}</Message>
        : <HistoryList rows={rows} today={today} busy={writes.busy} onLoad={load} onCancel={cancel} />}
    </div>
  );
}
