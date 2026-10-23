import { useCallback, useReducer, useState } from 'react';
import { dayNumber } from '../../domain/calendar';
import { GAME_MODE_LABEL, GAME_MODES, type GameMode } from '../../domain/gameModes';
import { earliestEffectiveDay, resolveSchedule } from '../../domain/generationConfig';
import { useResource } from '../../hooks/useResource';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import { listConfigs } from '../../services/repositories/generationConfigs';
import { figureOf } from '../../domain/nights';
import { Button } from '../../themes/stargazer/kit/Button';
import { cx } from '../../themes/stargazer/kit/cx';
import { Info } from '../Playground/Info';
import { useRecipes } from '../Recipes/useRecipes';
import { editorReducer, initialEditor } from './editor';
import { ManualDays } from './ManualDays';
import { newDraft, pinnedSites } from './manualDays';
import { usePinnedSkies } from './usePinnedSkies';
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
  /* the week's rules, or skies drawn by hand and pinned to one night */
  const [view, setView] = useState<'schedule' | 'drawn'>('schedule');
  const [draft, setDraft] = useState(() => newDraft(earliestEffectiveDay(today)));
  const pinned = usePinnedSkies();
  /* drawing: preview the draft's night, so its generated sky can be the starting point */
  const shownDay = view === 'drawn' ? draft.day : previewDay;
  const preview = useSchedulePreview(state.schedule, shownDay);
  const recipes = useRecipes();
  useUnsavedGuard(state.dirty || draft.dirty);
  const drawnHere = pinnedSites(pinned.list, previewDay);
  const generated = preview.sites?.[draft.idx]?.level;

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
        <div className={styles.title}>
          <span className={styles.eyebrow}>Generation · the daily week</span>
          <h1>Tonight</h1>
        </div>
        {GAME_MODES.length > 1 && <span className={pg.toolbar}><select value={mode} aria-label="game mode" onChange={e => setMode(e.target.value as GameMode)}>
          {GAME_MODES.map(m => <option key={m} value={m}>{GAME_MODE_LABEL[m]}</option>)}
        </select></span>}
        <span className={styles.views} role="group" aria-label="what to edit">
          <Button size="xs" kind={view === 'schedule' ? 'primary' : 'soft'} aria-pressed={view === 'schedule'} onClick={() => setView('schedule')}>Generated week</Button>
          <Button size="xs" kind={view === 'drawn' ? 'primary' : 'soft'} aria-pressed={view === 'drawn'} onClick={() => setView('drawn')}>Hand-drawn days</Button>
        </span>
        <span className={styles.basis}>
          Today is day {today}.{view === 'schedule' && <> Editing {state.basis}{state.dirty && <span className={styles.dirty}> · edited</span>}</>}
        </span>
        <span className={cx(pg.status, preview.running && pg.busy)}>{preview.running ? 'generating…' : preview.error ? 'error' : 'ready'}</span>
      </header>
      {view === 'drawn' ? (
        <ManualDays today={today} draft={draft} setDraft={setDraft} pinned={pinned}
          startFrom={generated && !preview.running ? figureOf(generated) : null} />
      ) : <div className={pg.layout}>
        <SchedulePanel state={state} dispatch={dispatch} recipes={recipes} />
        <main className={pg.main}>
          <div className={pg.toolbar}>
            <label className={pg.toggle}>Preview day&nbsp;
              <input className={pg.num} type="number" min={1} value={previewDay}
                onChange={e => { const n = Math.round(Number(e.target.value)); if (n >= 1) setPreviewDay(n); }} />
            </label>
            <Info k="previewDay" />
            <span className={styles.basis}>{dayLabel(previewDay)}</span>
            {drawnHere.length > 0 && <span className={styles.pinnedNote}>
              Hand-drawn on this night: sky {drawnHere.map(i => i + 1).join(', ')} (they replace the generated ones)
            </span>}
          </div>
          <WeekPreview sites={preview.sites} running={preview.running} error={preview.error} previewKey={preview.previewKey}
            tab={state.tab} onTab={tab => dispatch({ type: 'tab', tab })} />
        </main>
        <div className={styles.side}>
          <SavePanel key={mode} mode={mode} today={today} state={state} dispatch={dispatch}
            rows={configs.data ?? []} rowsError={configs.error} writes={writes} />
        </div>
      </div>}
    </div>
  );
}
