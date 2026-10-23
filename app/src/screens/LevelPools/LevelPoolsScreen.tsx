import { useCallback, useReducer, useState } from 'react';
import { POOL_MODE_LABEL, type PoolMode } from '../../domain/gameModes';
import { curveRuleErrors } from '../../domain/generation';
import { useResource } from '../../hooks/useResource';
import { useUnsavedGuard } from '../../hooks/useUnsavedGuard';
import { listPools, publishPool } from '../../services/repositories/levelPools';
import { cx } from '../../themes/stargazer/kit/cx';
import { useRecipes } from '../Recipes/useRecipes';
import { CurvePanel } from './CurvePanel';
import { initialPoolEditor, poolEditorReducer } from './poolEditor';
import { PoolPreview } from './PoolPreview';
import { PublishPanel } from './PublishPanel';
import { TierPanel } from './TierPanel';
import { TierStrip } from './TierStrip';
import { usePoolBuild } from './usePoolBuild';
import pg from '../Playground/Playground.module.css';
import styles from './LevelPools.module.css';

/** Admin-only: one pool mode's page. The open tier with every generator setting on the left; the whole curve, then
    the pool it makes, in the middle; the curve's own settings and publishing on the right. */
export function LevelPoolsScreen({ mode }: { mode: PoolMode }) {
  const [state, dispatch] = useReducer(poolEditorReducer, mode, initialPoolEditor);
  const { curve } = state;
  const load = useCallback(() => listPools(mode), [mode]);
  const pools = useResource('pools:' + mode, load);
  const recipes = useRecipes();
  const { build, current, start, stop } = usePoolBuild(mode, curve);
  const [write, setWrite] = useState<{ busy: boolean; error: string | null; version: number | null }>({ busy: false, error: null, version: null });
  useUnsavedGuard(state.dirty);

  const publish = async (note: string) => {
    if (!build) return;
    setWrite({ busy: true, error: null, version: null });
    const entries = build.results.map(r => ({ slot: r.slot, tier: r.tier, level: r.level }));
    const r = await publishPool(mode, curve, entries, note);
    setWrite({ busy: false, error: r.ok ? null : r.error, version: r.ok ? r.data : null });
    if (r.ok) pools.reload();
  };

  const live = pools.data?.[0]?.version;
  const running = build?.status === 'running';
  return (
    <div className={pg.page}>
      <header className={pg.header}>
        <div className={styles.title}>
          <span className={styles.eyebrow}>Pool · {pools.data ? (live ? `version ${live} live` : 'nothing published yet') : '…'}</span>
          <h1>{POOL_MODE_LABEL[mode]}</h1>
        </div>
        <span className={styles.basis}>
          Editing {state.basis}{state.dirty && <span className={styles.dirty}> · edited</span>}
        </span>
        <span className={cx(pg.status, running && pg.busy)}>{running ? 'generating…' : build?.status === 'error' ? 'error' : 'ready'}</span>
      </header>
      <div className={pg.layout}>
        <TierPanel state={state} dispatch={dispatch} recipes={recipes} />
        <main className={pg.main}>
          <TierStrip state={state} recipes={recipes.data ?? []} onTab={tab => dispatch({ type: 'tab', tab })} />
          <PoolPreview build={build} current={current} onGenerate={() => void start()} onStop={stop} />
        </main>
        <div className={styles.side}>
          <CurvePanel state={state} dispatch={dispatch} />
          <PublishPanel mode={mode} curve={curve} build={build} current={current} curveErrors={curveRuleErrors(mode, curve)}
            pools={pools.data ?? []} poolsError={pools.error} busy={write.busy} error={write.error} publishedVersion={write.version}
            onPublish={note => void publish(note)} />
        </div>
      </div>
    </div>
  );
}
