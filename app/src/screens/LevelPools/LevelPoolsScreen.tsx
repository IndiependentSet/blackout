import { useCallback, useReducer, useState } from 'react';
import { POOL_MODE_LABEL, POOL_MODES, type PoolMode } from '../../domain/gameModes';
import { curveRuleErrors, poolSlots } from '../../domain/generation';
import { useResource } from '../../hooks/useResource';
import { listPools, publishPool } from '../../services/repositories/levelPools';
import { cx } from '../../ui';
import { CurvePanel } from './CurvePanel';
import { initialPoolEditor, poolEditorReducer } from './poolEditor';
import { PoolPreview } from './PoolPreview';
import { PublishPanel } from './PublishPanel';
import { usePoolBuild } from './usePoolBuild';
import pg from '../Playground/Playground.module.css';
import styles from './LevelPools.module.css';

/** Admin-only: the curve a mode's level pool is generated from, the pool it makes, and publishing it. */
export function LevelPoolsScreen() {
  const [state, dispatch] = useReducer(poolEditorReducer, undefined, () => initialPoolEditor());
  const { mode, curve } = state;
  const load = useCallback(() => listPools(mode), [mode]);
  const pools = useResource('pools:' + mode, load);
  const { build, current, start, stop } = usePoolBuild(mode, curve);
  const [write, setWrite] = useState<{ busy: boolean; error: string | null; version: number | null }>({ busy: false, error: null, version: null });

  const publish = async (note: string) => {
    if (!build) return;
    setWrite({ busy: true, error: null, version: null });
    const entries = build.results.map(r => ({ slot: r.slot, tier: r.tier, level: r.level }));
    const r = await publishPool(mode, curve, entries, note);
    setWrite({ busy: false, error: r.ok ? null : r.error, version: r.ok ? r.data : null });
    if (r.ok) pools.reload();
  };

  const running = build?.status === 'running';
  return (
    <div className={pg.page}>
      <header className={pg.header}>
        <h1>Level pools</h1>
        <span className={pg.toolbar}>
          <select value={mode} aria-label="game mode" onChange={e => { setWrite({ busy: false, error: null, version: null }); dispatch({ type: 'mode', mode: e.target.value as PoolMode }); }}>
            {POOL_MODES.map(m => <option key={m} value={m}>{POOL_MODE_LABEL[m]}</option>)}
          </select>
        </span>
        <span className={styles.basis}>
          Editing {state.basis}{state.dirty && <span className={styles.dirty}> · edited</span>} · {poolSlots(mode, curve).length} levels
        </span>
        <span className={cx(pg.status, running && pg.busy)}>{running ? 'generating…' : build?.status === 'error' ? 'error' : 'ready'}</span>
      </header>
      <div className={pg.layout}>
        <div className={styles.left}><CurvePanel state={state} dispatch={dispatch} /></div>
        <main className={pg.main}><PoolPreview build={build} current={current} onGenerate={() => void start()} onStop={stop} /></main>
        <div className={styles.side}>
          <PublishPanel key={mode} mode={mode} curve={curve} build={build} current={current} curveErrors={curveRuleErrors(mode, curve)}
            pools={pools.data ?? []} poolsError={pools.error} busy={write.busy} error={write.error} publishedVersion={write.version}
            onPublish={note => void publish(note)} />
        </div>
      </div>
    </div>
  );
}
