import { useState } from 'react';
import { Button, cx } from '../../ui';
import { Info } from './Info';
import { encodeParams, type PlaygroundParams } from './params';
import { useVariety } from './useVariety';
import { VarietyChart } from './VarietyChart';
import styles from './Variety.module.css';

const SAMPLES = [100, 500, 2000, 10000];
const pct = (v: number) => Math.round(v * 100) + '%';

/** How many genuinely different levels do these settings produce? Runs a
    sweep of consecutive seeds and counts distinct graphs and drawings. */
export function VarietyPanel({ params, onLoadSeed }: { params: PlaygroundParams; onLoadSeed: (seed: number) => void }) {
  const { run, start, stop } = useVariety();
  const [samples, setSamples] = useState(500);
  const s = run.summary;
  const running = run.status === 'running';
  const stale = !!s && run.paramsKey !== encodeParams(params);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <h3>Variety <Info k="variety" /></h3>
        <select value={samples} onChange={e => setSamples(Number(e.target.value))} aria-label="seeds to try" disabled={running}>
          {SAMPLES.map(n => <option key={n} value={n}>{n.toLocaleString()} seeds</option>)}
        </select>
        {running
          ? <Button size="mini" variant="muted" onClick={stop}>Stop</Button>
          : <Button size="mini" onClick={() => start(params, samples)}>{s ? 'Run again' : 'Run'}</Button>}
        {s && <span className={styles.progress}>
          {s.tried.toLocaleString()} / {run.samples.toLocaleString()} · {(run.ms / 1000).toFixed(1)}s
          {run.status === 'stopped' && ' · stopped'}
        </span>}
      </div>
      {running && s && <div className={styles.bar}><i style={{ width: pct(s.tried / run.samples) }} /></div>}
      {!s && !running && <p className={styles.note}>Generates levels from seed {params.seed} onwards under the current settings (time budget off) and counts how many are actually different.</p>}
      {run.error && <p className={styles.warn}>{run.error}</p>}
      {stale && <p className={styles.warn}>Settings changed since this run: the numbers below are for the old settings.</p>}

      {s && <div className={cx(styles.body, stale && styles.stale)}>
        <div className={styles.tiles}>
          <Tile value={s.shapes} label="distinct graphs" sub={`≈ ${s.estShapes.toLocaleString()} in total`} help="varietyGraphs" />
          <Tile value={s.drawings} label="distinct drawings" sub={`≈ ${s.estDrawings.toLocaleString()} in total`} help="varietyDrawings" />
          <Tile value={pct(s.repeatShapes)} label="repeat chance" sub={`${pct(s.repeatDrawings)} for drawings`} help="varietyRepeat" />
          <Tile value={s.found.toLocaleString()} label="levels found" sub={`${(s.tried - s.found).toLocaleString()} seeds gave none`} help="varietyFound" />
        </div>
        {s.approx > 0 && <p className={styles.note}>{s.approx} graph(s) were too symmetric to identify exactly; their count may be slightly low.</p>}
        <VarietyChart curve={s.curve} />
        <h4>Most common graphs <Info k="varietyTop" /></h4>
        <ol className={styles.top}>
          {s.top.map(t => (
            <li key={t.key}>
              <span className={styles.share}><i style={{ width: pct(t.count / Math.max(1, s.found)) }} /></span>
              <span className={styles.topText}>
                <b>{pct(t.count / Math.max(1, s.found))}</b> · {t.count}× · {t.nodes} nodes, {t.edges} edges · par {t.par} · {'★'.repeat(t.stars)}
                {t.drawings > 1 && ` · ${t.drawings} drawings`}
              </span>
              <Button size="mini" variant="secondary" onClick={() => onLoadSeed(t.seed)}>seed {t.seed}</Button>
            </li>
          ))}
        </ol>
      </div>}
    </section>
  );
}

function Tile({ value, label, sub, help }: { value: string | number; label: string; sub: string; help: Parameters<typeof Info>[0]['k'] }) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileValue}>{value}</div>
      <div className={styles.tileLabel}>{label}<Info k={help} /></div>
      <div className={styles.tileSub}>{sub}</div>
    </div>
  );
}
