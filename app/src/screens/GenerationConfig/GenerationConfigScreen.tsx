import { useCallback, useReducer, useState } from 'react';
import { dayNumber } from '../../domain/calendar';
import { GAME_MODE_LABEL, GAME_MODES, type GameMode } from '../../domain/gameModes';
import { earliestEffectiveDay, resolveSchedule } from '../../domain/generationConfig';
import { useResource } from '../../hooks/useResource';
import { listConfigs } from '../../services/repositories/generationConfigs';
import { cx } from '../../ui';
import { Info } from '../Playground/Info';
import { editorReducer, initialEditor } from './editor';
import { SavePanel } from './SavePanel';
import { SchedulePanel } from './SchedulePanel';
import { useConfigWrites } from './useConfigWrites';
import { useSchedulePreview } from './useSchedulePreview';
import { WeekPreview } from './WeekPreview';
import { dayLabel } from './week';
import pg from '../Playground/Playground.module.css';
import styles from './GenerationConfig.module.css';

/** Admin-only: the rules a game mode's levels are generated with, saved from a future day on. */
export function GenerationConfigScreen() {
  const [today] = useState(() => dayNumber());
  const [mode, setMode] = useState<GameMode>('daily');
  const load = useCallback(() => listConfigs(mode), [mode]);
  const configs = useResource('configs:' + mode, load);
  const writes = useConfigWrites(configs.reload);
  const [state, dispatch] = useReducer(editorReducer, undefined, () => initialEditor());
  const [previewDay, setPreviewDay] = useState(() => earliestEffectiveDay(today));
  const preview = useSchedulePreview(state.schedule, previewDay);

  /* the first time the list arrives, start from the newest config (what the
     days ahead will play) rather than the default, unless editing has begun */
  const [started, setStarted] = useState(false);
  if (configs.data && !started) {
    setStarted(true);
    const newest = configs.data[0];
    const r = newest ? resolveSchedule(newest) : null;
    if (newest && r?.source === 'saved' && !state.dirty) {
      dispatch({ type: 'load', schedule: r.schedule, basis: `day ${newest.effectiveFromDay}’s config` });
    }
  }

  return (
    <div className={pg.page}>
      <header className={pg.header}>
        <h1>Generation config</h1>
        <span className={pg.toolbar}><select value={mode} aria-label="game mode" onChange={e => setMode(e.target.value as GameMode)}>
          {GAME_MODES.map(m => <option key={m} value={m}>{GAME_MODE_LABEL[m]}</option>)}
        </select></span>
        <span className={styles.basis}>
          Today is day {today}. Editing {state.basis}{state.dirty && <span className={styles.dirty}> · edited</span>}
        </span>
        <span className={cx(pg.status, preview.running && pg.busy)}>{preview.running ? 'generating…' : preview.error ? 'error' : 'ready'}</span>
      </header>
      <div className={pg.layout}>
        <SchedulePanel state={state} dispatch={dispatch} />
        <main className={pg.main}>
          <div className={pg.toolbar}>
            <label className={pg.toggle}>Preview day&nbsp;
              <input className={pg.num} type="number" min={1} value={previewDay}
                onChange={e => { const n = Math.round(Number(e.target.value)); if (n >= 1) setPreviewDay(n); }} />
            </label>
            <Info k="previewDay" />
            <span className={styles.basis}>{dayLabel(previewDay)}</span>
          </div>
          <WeekPreview sites={preview.sites} running={preview.running} error={preview.error} previewKey={preview.previewKey}
            tab={state.tab} onTab={tab => dispatch({ type: 'tab', tab })} />
        </main>
        <div className={styles.side}>
          <SavePanel key={mode} mode={mode} today={today} state={state} dispatch={dispatch}
            rows={configs.data ?? []} rowsError={configs.error} writes={writes} />
        </div>
      </div>
    </div>
  );
}
