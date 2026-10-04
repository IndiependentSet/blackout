import type { Thing } from '../../assets/things';
import { PadSprite, PathLit, PathWeb, SpriteDefs, ThingSprite, PAD_HIT_R, THING_D } from '../../sprites';
import { breed, thing, type MiniEdge, type MiniNode } from './lookup';
import styles from './Demos.module.css';

/* the smashables are drawn a touch smaller on these little boards, and the paths thinner */
const THING_SCALE = 46 / THING_D;
const PATH_SCALE = 0.6;

export function MiniThing({ x, y, t, smashed, i = 0 }: { x: number; y: number; t: Thing; smashed: boolean; i?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${THING_SCALE})`}>
      <ThingSprite thing={t} smashed={smashed} index={i} marked={false} />
    </g>
  );
}

function MiniPad({ x, y, hired, b, pulse, onTap }: { x: number; y: number; hired: boolean; b: number; pulse: boolean; onTap?: () => void }) {
  return (
    <g transform={`translate(${x} ${y})`} onClick={onTap} style={{ cursor: onTap ? 'pointer' : 'default' }}>
      <PadSprite breed={breed(b)} hired={hired} pulsing={pulse} />
      {/* a fat invisible target, so a thumb never misses the pad */}
      {onTap && <circle cx={0} cy={0} r={PAD_HIT_R} fill="transparent" />}
    </g>
  );
}

/* a whole little site: pads, paths, and a fixture in the middle of each path */
export function MiniBoard({ nodes, edges, placed, onTap, pulse, viewBox, label }: {
  nodes: MiniNode[]; edges: MiniEdge[]; placed: number[]; viewBox: string; label: string;
  onTap?: (i: number) => void; pulse?: number;
}) {
  const on = new Set(placed);
  const covered = ([u, v]: MiniEdge) => on.has(u) || on.has(v);
  return (
    <svg viewBox={viewBox} width="100%" role="img" aria-label={label} className={styles.board}>
      <defs><SpriteDefs /></defs>
      {edges.map((e, i) => {
        const [a, b] = [nodes[e[0]], nodes[e[1]]];
        const d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
        return <g key={'e' + i}><PathWeb d={d} scale={PATH_SCALE} /><PathLit d={d} on={covered(e)} scale={PATH_SCALE} /></g>;
      })}
      {edges.map((e, i) => (
        <MiniThing key={'t' + i} i={i} t={thing(e[2])} smashed={covered(e)}
          x={(nodes[e[0]].x + nodes[e[1]].x) / 2} y={(nodes[e[0]].y + nodes[e[1]].y) / 2} />
      ))}
      {nodes.map((n, i) => (
        <MiniPad key={'n' + i} x={n.x} y={n.y} b={n.b ?? i} hired={on.has(i)} pulse={pulse === i} onTap={onTap && (() => onTap(i))} />
      ))}
    </svg>
  );
}
