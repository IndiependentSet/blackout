import { useState } from 'react';
import type { PoolMode } from '../../domain/gameModes';
import { poolSlots, type LevelCurve } from '../../domain/generation';
import type { PoolInfo } from '../../services/repositories/levelPools';
import { Button, Message, cx } from '../../ui';
import { publishBlockers, type Build } from './usePoolBuild';
import pg from '../Playground/Playground.module.css';
import styles from './LevelPools.module.css';

interface Props {
  mode: PoolMode;
  curve: LevelCurve;
  build: Build | null;
  current: boolean;
  /** why the curve itself cannot be used (the mode's rules) */
  curveErrors: string[];
  pools: PoolInfo[];
  poolsError: string | null;
  busy: boolean;
  error: string | null;
  publishedVersion: number | null;
  onPublish: (note: string) => void;
}

/** Publish the build as the mode's next version, and the versions already published. */
export function PublishPanel({ mode, curve, build, current, curveErrors, pools, poolsError, busy, error, publishedVersion, onPublish }: Props) {
  const [note, setNote] = useState('');
  const blockers = [...curveErrors, ...publishBlockers(build, current)];
  const count = poolSlots(mode, curve).length;
  const publish = () => {
    if (window.confirm(`Publish ${count} ${mode} levels as version ${(pools[0]?.version ?? 0) + 1}? Players get them at once.`)) onPublish(note.trim());
  };

  return (
    <div className={pg.panel}>
      <section>
        <h3>Publish</h3>
        <p className={styles.basis}>
          A published pool goes live at once for new campaign levels, new survival runs and new challenges.
          Levels a player has already cleared keep the version they cleared them on; matches and runs under way keep theirs.
        </p>
        <label className={styles.field}>
          <span className={styles.basis}>Note</span>
          <input value={note} maxLength={200} onChange={e => setNote(e.target.value)} placeholder="what changed, and why" />
        </label>
        {!!blockers.length && <ul className={styles.errors}>{blockers.map(b => <li key={b}>{b}</li>)}</ul>}
        {error && <Message tone="error">{error}</Message>}
        {publishedVersion !== null && !error && <div className={styles.ok}>Published as version {publishedVersion}.</div>}
        <div className={styles.actions}>
          <Button size="mini" variant="primary" disabled={!!blockers.length || busy} onClick={publish}>{busy ? 'Publishing…' : 'Publish'}</Button>
        </div>
      </section>
      <section>
        <h3>Published</h3>
        {poolsError ? <Message tone="error">{poolsError}</Message>
          : !pools.length ? <p className={styles.basis}>Nothing published for {mode} yet: players see “no levels published”.</p>
          : (
            <ul className={styles.history}>
              {pools.map((p, i) => (
                <li key={p.id}>
                  <div className={styles.histHead}>
                    <b>v{p.version}</b>
                    <span className={cx(styles.status, i === 0 ? styles.live : styles.past)}>{i === 0 ? 'live' : 'past'}</span>
                    <span className={styles.basis}>{p.levelCount} levels · {new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                  {p.note && <div className={styles.note}>{p.note}</div>}
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}
