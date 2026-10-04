import { useEffect, useReducer, useState } from 'react';
import { Button, cx } from '../../ui';
import { useWindowKey } from '../../hooks/useWindowKey';
import { ParamsPanel } from './ParamsPanel';
import { decodeParams, encodeParams, paramsReducer } from './params';
import { PlayPreview } from './PlayPreview';
import { SchematicView, type LabelMode } from './SchematicView';
import { StatsPanel } from './StatsPanel';
import { useGenerator } from './useGenerator';
import styles from './Playground.module.css';

type View = 'schematic' | 'board';
/* UI-only randomness: picking the next seed, never inside generation */
const randomSeed = () => Math.floor(Math.random() * 1e6);

/** Dev-only: bend the level generator's rules and see what comes out. */
export function PlaygroundScreen() {
  const [params, dispatch] = useReducer(paramsReducer, undefined, () => decodeParams(window.location.hash));
  const [view, setView] = useState<View>('schematic');
  const [showSol, setShowSol] = useState(false);
  const [showAlt, setShowAlt] = useState(true);
  const [labels, setLabels] = useState<LabelMode>('degree');
  const { running, outcome, error, wallMs, outcomeKey } = useGenerator(params);
  const reroll = () => dispatch({ type: 'set', patch: { seed: randomSeed() } });

  /* the hash is the permalink: settings survive a reload and can be pasted */
  useEffect(() => { window.history.replaceState(null, '', '#' + encodeParams(params)); }, [params]);
  useWindowKey(e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === 'r') reroll();
    if (e.key === 's') setShowSol(s => !s);
  });

  const level = outcome?.level ?? null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Generator playground</h1>
        <span className={styles.hint}>dev only · <kbd>r</kbd> new seed · <kbd>s</kbd> solution</span>
        <span className={cx(styles.status, running && styles.busy)}>{running ? 'generating…' : error ? 'error' : 'ready'}</span>
      </header>
      <div className={styles.layout}>
        <ParamsPanel p={params} dispatch={dispatch} onReroll={reroll} />
        <main className={styles.main}>
          <div className={styles.toolbar}>
            <Button size="mini" variant={view === 'schematic' ? 'primary' : 'secondary'} onClick={() => setView('schematic')}>Schematic</Button>
            <Button size="mini" variant={view === 'board' ? 'primary' : 'secondary'} onClick={() => setView('board')}>Board</Button>
            <label><input type="checkbox" checked={showSol} onChange={e => setShowSol(e.target.checked)} /> solution</label>
            {view === 'schematic' && <>
              <label title="Dashed: in a second optimal cover but not the first. Dotted: the reverse">
                <input type="checkbox" checked={showAlt} onChange={e => setShowAlt(e.target.checked)} /> 2nd optimum</label>
              <select value={labels} onChange={e => setLabels(e.target.value as LabelMode)}>
                <option value="degree">label: degree</option>
                <option value="index">label: index</option>
                <option value="none">no labels</option>
              </select>
            </>}
            {level && <Button size="mini" variant="muted" title="copy the level as JSON"
              onClick={() => navigator.clipboard?.writeText(JSON.stringify(level))}>Copy JSON</Button>}
          </div>
          <div className={cx(styles.stage, running && styles.stale)}>
            {error && <p className={styles.warn}>{error}</p>}
            {level && view === 'schematic' && outcome && (
              <SchematicView level={level} alt={outcome.alt} crossings={outcome.crossings}
                showSol={showSol} showAlt={showAlt} labels={labels} />
            )}
            {level && view === 'board' && <PlayPreview key={outcomeKey} level={level} showSol={showSol} />}
            {!level && !running && !error && <p className={styles.warn}>No level satisfied these rules. See the rejection counts.</p>}
          </div>
        </main>
        {outcome && <StatsPanel outcome={outcome} wallMs={wallMs} />}
      </div>
    </div>
  );
}
