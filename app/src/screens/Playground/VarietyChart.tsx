import { useState, type PointerEvent } from 'react';
import type { CurvePoint } from './variety';
import styles from './Variety.module.css';

const W = 560, H = 180, PAD = { l: 40, r: 104, t: 10, b: 26 };
const SERIES = [
  { key: 'drawings', label: 'drawings', cls: styles.s2 },
  { key: 'shapes', label: 'graphs', cls: styles.s1 },
] as const;

const niceMax = (v: number) => {
  const p = 10 ** Math.floor(Math.log10(Math.max(1, v)));
  return [1, 2, 2.5, 5, 10].map(m => m * p).find(m => m >= v) ?? v;
};

/** Distinct graphs and drawings found against seeds tried. A curve that
    flattens means the settings have little more to give. */
export function VarietyChart({ curve }: { curve: CurvePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (curve.length < 2) return null;
  const xMax = curve.at(-1)?.tried ?? 1;
  const yMax = niceMax(Math.max(...curve.map(p => p.drawings)));
  const x = (v: number) => PAD.l + (v / xMax) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / yMax) * (H - PAD.t - PAD.b);
  const path = (k: 'shapes' | 'drawings') => curve.map((p, i) => `${i ? 'L' : 'M'}${x(p.tried).toFixed(1)},${y(p[k]).toFixed(1)}`).join('');
  const last = curve[curve.length - 1];
  const ticks = [0, yMax / 2, yMax];

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    curve.forEach((p, i) => { if (Math.abs(x(p.tried) - vx) < Math.abs(x(curve[best].tried) - vx)) best = i; });
    setHover(best);
  };
  const h = hover === null ? null : curve[hover];

  return (
    <div className={styles.chartWrap}>
      <div className={styles.legend}>
        {SERIES.map(s => <span key={s.key}><i className={s.cls} />distinct {s.label}</span>)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img"
        aria-label={`Distinct graphs and drawings against seeds tried: ${last.shapes} graphs and ${last.drawings} drawings after ${last.tried} seeds`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className={styles.grid} />
            <text x={PAD.l - 6} y={y(t)} className={styles.tickY}>{Math.round(t)}</text>
          </g>
        ))}
        <text x={PAD.l} y={H - 6} className={styles.tickX}>0</text>
        <text x={W - PAD.r} y={H - 6} className={styles.tickXEnd}>{xMax} seeds</text>
        {SERIES.map(s => <path key={s.key} d={path(s.key)} className={`${styles.line} ${s.cls}`} />)}
        {/* direct labels at the line ends */}
        {SERIES.map(s => (
          <text key={s.key} x={x(last.tried) + 6} y={y(last[s.key])} className={styles.endLabel}>{last[s.key]} {s.label}</text>
        ))}
        {h && <>
          <line x1={x(h.tried)} x2={x(h.tried)} y1={PAD.t} y2={H - PAD.b} className={styles.cross} />
          {SERIES.map(s => <circle key={s.key} cx={x(h.tried)} cy={y(h[s.key])} r={4} className={`${styles.dot} ${s.cls}`} />)}
        </>}
      </svg>
      {h && <div className={styles.tip}>after <b>{h.tried}</b> seeds: <b>{h.shapes}</b> graphs · <b>{h.drawings}</b> drawings</div>}
    </div>
  );
}
