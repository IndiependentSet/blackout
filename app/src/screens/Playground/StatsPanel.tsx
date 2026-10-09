import type { HelpKey } from './help';
import { Info } from './Info';
import type { Outcome } from './runGeneration';
import styles from './Playground.module.css';

function Line({ k, v, help }: { k: string; v: string | number; help?: HelpKey }) {
  return <div className={styles.stat}><span>{k}{help && <Info k={help} />}</span><b>{v}</b></div>;
}

/** What came out, and how hard the generator had to work for it. */
export function StatsPanel({ outcome, wallMs }: { outcome: Outcome; wallMs: number }) {
  const { level, stats, report, greedy, bound } = outcome;
  const maxBar = stats ? Math.max(1, ...stats.degrees) : 1;
  return (
    <div className={styles.panel}>
      {level && stats && (
        <section>
          <h3>Graph</h3>
          <Line k="Nodes / edges" v={`${stats.nodes} / ${stats.edges}`} />
          <Line k="Par (min cover)" v={level.k} help="stat.par" />
          <Line k="Optimal covers" v={report.optima} help="stat.optima" />
          <Line k="Stars" v={'★'.repeat(level.stars)} help="stat.stars" />
          {greedy !== null && <Line k="Greedy cover" v={greedy === level.k ? `${greedy} (solves it)` : `${greedy} (+${greedy - level.k})`} help="stat.greedy" />}
          {bound !== null && <Line k="Matching bound" v={bound === level.k ? `${bound} (tight)` : `${bound} (gap ${level.k - bound})`} help="stat.bound" />}
          <Line k="Degree min · mean · max" v={`${stats.minDegree} · ${stats.meanDegree.toFixed(2)} · ${stats.maxDegree}`} help="stat.degree" />
          <Line k="Crossings" v={stats.crossings} help="stat.crossings" />
          <Line k="Planar by Euler?" v={stats.eulerNonPlanar ? 'no (m > 3n−6)' : 'not ruled out'} help="stat.euler" />
          <Line k="Bipartite" v={stats.bipartite ? 'yes' : 'no'} help="stat.bipartite" />
          <Line k="Triangles" v={stats.triangles} help="stat.triangles" />
          <Line k="Components" v={stats.components} help="stat.components" />
          <div className={styles.hist} aria-label="degree histogram">
            {stats.degrees.map((c, d) => (
              <div key={d} title={`${c} node(s) of degree ${d}`}>
                <i style={{ height: (c / maxBar) * 100 + '%' }} />
                <span>{d}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <h3>Search</h3>
        {report.fallback && <p className={styles.warn}>Nothing met every rule — showing the closest miss.</p>}
        {!level && <p className={styles.warn}>No level found.</p>}
        <Line k="Attempts" v={report.attempts} help="stat.attempts" />
        <Line k="Repairs" v={report.repairs} help="stat.repairs" />
        <Line k="Solver visits" v={report.visits.toLocaleString()} help="stat.visits" />
        <Line k="Time (gen / wall)" v={`${report.ms} / ${wallMs} ms`} help="stat.time" />
        <h4>Rejected <Info k="stat.rejected" /></h4>
        {Object.entries(report.rejected).map(([k, v]) => <Line key={k} k={k} v={v} />)}
      </section>
    </div>
  );
}
