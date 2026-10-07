import { Button } from '../../ui';
import { Info } from './Info';
import { describeParams, type PlaygroundParams } from './params';
import type { CompareRow } from './useVariety';
import styles from './Variety.module.css';

const pct = (v: number) => Math.round(v * 100) + '%';

/** The last few sweeps side by side: variety, success rate and cost, per strategy and settings. */
export function VarietyCompare({ rows, onLoad }: { rows: CompareRow[]; onLoad: (p: PlaygroundParams) => void }) {
  if (!rows.length) return null;
  return (
    <>
      <h4>Compare runs <Info k="varietyCompare" /></h4>
      <div className={styles.compareWrap}>
        <table className={styles.compare}>
          <thead>
            <tr>
              <th>settings</th><th>seeds</th><th>graphs</th><th>≈ total</th><th>repeat</th><th>met rules</th><th>ms / level</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ id, params, summary: s, stopped }) => (
              <tr key={id}>
                <td className={styles.label}>{describeParams(params)}</td>
                <td>{s.tried.toLocaleString()}{stopped && '*'}</td>
                <td>{s.shapes.toLocaleString()}</td>
                <td>{s.estShapes.toLocaleString()}</td>
                <td>{pct(s.repeatShapes)}</td>
                <td>{pct(s.tried ? s.met / s.tried : 0)}</td>
                <td>{Math.round(s.msPerLevel)}</td>
                <td><Button size="mini" variant="secondary" onClick={() => onLoad(params)}>Load</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.some(r => r.stopped) && <p className={styles.note}>* stopped early</p>}
    </>
  );
}
