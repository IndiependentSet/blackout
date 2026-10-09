import { useMemo, useState } from 'react';
import { crossingPairs } from '../../domain/graphStats';
import type { SlotResult } from '../../services/generation/poolClient';
import { Button, cx } from '../../ui';
import { playStatus } from '../Playground/play';
import { PlayBar } from '../Playground/PlayBar';
import { SchematicView } from '../Playground/SchematicView';
import { usePlacement } from '../Playground/usePlacement';
import type { Build } from './usePoolBuild';
import pg from '../Playground/Playground.module.css';
import styles from './LevelPools.module.css';

interface Props {
  build: Build | null;
  /** the build still matches the draft */
  current: boolean;
  onGenerate: () => void;
  onStop: () => void;
}

/** Generating the pool, then every level of it: click one to look at it and play-test it against par. */
export function PoolPreview({ build, current, onGenerate, onStop }: Props) {
  const [open, setOpen] = useState(0);
  const [showSol, setShowSol] = useState(false);
  const running = build?.status === 'running';
  const shown: SlotResult | null = build?.results[open] ?? null;
  const play = usePlacement((build?.key ?? '') + '#' + open);
  const crossings = useMemo(() => (shown ? crossingPairs(shown.level) : []), [shown]);
  const placed = shown && showSol ? shown.level.sol : play.placed;

  return (
    <>
      <div className={pg.toolbar}>
        {running
          ? <Button size="mini" variant="secondary" onClick={onStop}>Stop</Button>
          : <Button size="mini" variant="primary" onClick={onGenerate}>{build ? 'Generate again' : 'Generate the pool'}</Button>}
        {build && <span className={styles.basis}>{build.results.length} / {build.total} made{build.status === 'stopped' ? ' · stopped' : ''}</span>}
        {build && !current && <span className={pg.warn}>the curve changed since this build</span>}
        {build?.error && <span className={pg.warn}>{build.error}</span>}
        <span className={pg.toggle}><label><input type="checkbox" checked={showSol} onChange={e => setShowSol(e.target.checked)} /> solution</label></span>
      </div>
      {build && (
        <div className={cx(styles.grid, !current && pg.stale)} aria-label="the pool">
          {build.results.map((r, i) => (
            <button key={r.slot} type="button" className={cx(styles.cell, i === open && styles.cellOpen, !r.unique && styles.bad)}
              onClick={() => setOpen(i)}>
              <b>#{r.slot}</b>
              <span>tier {r.tier} · {r.level.nodes.length} nodes</span>
              <span>par {r.level.k} · {'★'.repeat(r.level.stars)}</span>
              <span className={cx((r.salt === null || !r.unique) && styles.slow)}>
                {r.unique ? (r.salt === null ? 'fallback' : 'retry ' + r.salt) : 'NOT UNIQUE'} · {r.ms} ms
              </span>
            </button>
          ))}
        </div>
      )}
      <div className={cx(pg.stage, !current && pg.stale)}>
        {!build && <p className={pg.muted}>Generate the pool to see its levels.</p>}
        {shown && <>
          <SchematicView level={shown.level} alt={null} crossings={crossings} placed={placed} dimRest={showSol}
            labels="degree" onTapNode={showSol ? undefined : play.toggle} />
          <PlayBar status={playStatus(shown.level, placed)} showSol={showSol} onClear={play.clear} />
        </>}
      </div>
    </>
  );
}
