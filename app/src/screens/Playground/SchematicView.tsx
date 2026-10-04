import { useMemo } from 'react';
import type { Level } from '../../domain/types';
import { cx } from '../../ui';
import styles from './Playground.module.css';

export type LabelMode = 'index' | 'degree' | 'none';
const U = 48;           // px per lattice step
const PAD = 0.8;        // lattice steps of margin

/** The bare graph: nodes, edges, crossings and the optimal cover(s), no art. */
export function SchematicView({ level, alt, crossings, showSol, showAlt, labels }: {
  level: Level; alt: number[] | null; crossings: [number, number][];
  showSol: boolean; showAlt: boolean; labels: LabelMode;
}) {
  const view = useMemo(() => {
    const cs = level.nodes.map(n => n.c), rs = level.nodes.map(n => n.r);
    const x0 = Math.min(...cs) - PAD, y0 = Math.min(...rs) - PAD;
    return { x0, y0, w: Math.max(...cs) - x0 + PAD, h: Math.max(...rs) - y0 + PAD };
  }, [level]);
  const crossed = useMemo(() => new Set(crossings.flat()), [crossings]);
  const sol = useMemo(() => new Set(level.sol), [level]);
  const altSet = useMemo(() => new Set(alt ?? []), [alt]);
  const P = (i: number) => ({ x: level.nodes[i].c * U, y: level.nodes[i].r * U });

  return (
    <svg className={styles.schematic} viewBox={`${view.x0 * U} ${view.y0 * U} ${view.w * U} ${view.h * U}`}
      role="img" aria-label="graph schematic">
      {level.edges.map(([a, b], i) => {
        const A = P(a), B = P(b);
        const covered = showSol && (sol.has(a) || sol.has(b));
        return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
          className={cx(styles.edge, crossed.has(i) && styles.crossed, covered && styles.covered)} />;
      })}
      {level.nodes.map((_, i) => {
        const { x, y } = P(i);
        const inSol = showSol && sol.has(i), inAlt = showAlt && altSet.has(i) && !sol.has(i);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={U * 0.3} className={cx(styles.node, inSol && styles.inSol, showSol && !sol.has(i) && styles.outSol)} />
            {inAlt && <circle cx={x} cy={y} r={U * 0.4} className={styles.inAlt} />}
            {showAlt && alt && sol.has(i) && !altSet.has(i) && <circle cx={x} cy={y} r={U * 0.4} className={styles.notAlt} />}
            {labels !== 'none' && (
              <text x={x} y={y} className={styles.nodeLabel}>{labels === 'index' ? i : level.adj[i].length}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
