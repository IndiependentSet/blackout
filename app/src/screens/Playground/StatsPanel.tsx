import type { Outcome } from './runGeneration';
import styles from './Playground.module.css';

const REJECT_NOTES: Record<string, string> = {
  degenerate: 'grew into fewer than 2 edges or an isolated node',
  blowup: 'solver hit its visit cap',
  unresolved: 'tie could not be broken / no repair possible',
  filter: 'rejected by an accept filter',
  minDegree: 'unique, but a node stayed under the min degree',
  stars: 'unique, but solved with a different technique',
  size: 'unique, but too small or grown too large',
};

function Line({ k, v, note }: { k: string; v: string | number; note?: string }) {
  return <div className={styles.stat} title={note}><span>{k}</span><b>{v}</b></div>;
}

/** What came out, and how hard the generator had to work for it. */
export function StatsPanel({ outcome, wallMs }: { outcome: Outcome; wallMs: number }) {
  const { level, stats, report } = outcome;
  const maxBar = stats ? Math.max(1, ...stats.degrees) : 1;
  return (
    <div className={styles.panel}>
      {level && stats && (
        <section>
          <h3>Graph</h3>
          <Line k="Nodes / edges" v={`${stats.nodes} / ${stats.edges}`} />
          <Line k="Par (min cover)" v={level.k} note="size of the minimum vertex cover" />
          <Line k="Optimal covers" v={report.optima} />
          <Line k="Stars" v={'★'.repeat(level.stars)} note="1: leaf rule clears it · 2: + degree-2 folding · 3: needs more" />
          <Line k="Degree min · mean · max" v={`${stats.minDegree} · ${stats.meanDegree.toFixed(2)} · ${stats.maxDegree}`} />
          <Line k="Crossings" v={stats.crossings} />
          <Line k="Planar by Euler?" v={stats.eulerNonPlanar ? 'no (m > 3n−6)' : 'not ruled out'} />
          <Line k="Bipartite" v={stats.bipartite ? 'yes' : 'no'} note="bipartite: König — min cover = max matching" />
          <Line k="Triangles" v={stats.triangles} />
          <Line k="Components" v={stats.components} />
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
        <Line k="Attempts" v={report.attempts} />
        <Line k="Repairs" v={report.repairs} />
        <Line k="Solver visits" v={report.visits.toLocaleString()} />
        <Line k="Time (gen / wall)" v={`${report.ms} / ${wallMs} ms`} />
        <h4>Rejected</h4>
        {Object.entries(report.rejected).map(([k, v]) => <Line key={k} k={k} v={v} note={REJECT_NOTES[k]} />)}
      </section>
    </div>
  );
}
