import { useRef, type PointerEvent } from 'react';
import type { Rect } from '../../domain/types';
import type { Minimap as MinimapModel } from '../scene/buildScene';
import styles from './Minimap.module.css';

const PAD = 6;
const MAP_OFF = '#F4E4C4', MAP_ON = '#FFD469', MAP_LIT = '#C64BE8';

/* The whole house in miniature, with the camera's frame on it. Drag the frame
   to move the camera; the board shows this only when the house overflows. */
export function Minimap({ map, view, scale, onJump }: {
  map: MinimapModel;
  /** the camera's frame in world units */
  view: Rect;
  /** the board's UI scale, so overlays shrink with it */
  scale: number;
  onJump: (world: { x: number; y: number }) => void;
}) {
  const dragging = useRef(false);

  const jump = (e: PointerEvent<SVGSVGElement>) => {
    const el = e.currentTarget, m = el.getScreenCTM(); if (!m) return;
    const p = el.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(m.inverse());
    onJump(map.toWorld(q.x, q.y));
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    jump(e);
  };
  const move = (e: PointerEvent<SVGSVGElement>) => { if (dragging.current) { e.stopPropagation(); jump(e); } };
  const up = (e: PointerEvent<SVGSVGElement>) => { e.stopPropagation(); dragging.current = false; };

  const v = map.rect(view);
  return (
    <svg className={styles.map} width={(map.w + 2 * PAD) * scale} height={(map.h + 2 * PAD) * scale}
      viewBox={`${-PAD} ${-PAD} ${map.w + 2 * PAD} ${map.h + 2 * PAD}`} role="img" aria-label="house overview"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      {map.rooms.map(r => (
        <rect key={'r' + r.key} x={r.x} y={r.y} width={r.w} height={r.h} fill="rgba(244,228,196,.07)" stroke="rgba(244,228,196,.22)" strokeWidth={1} />
      ))}
      {map.edges.map(e => (
        <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.on ? MAP_LIT : MAP_OFF}
          strokeWidth={e.on ? 2.6 : 1.7} opacity={e.on ? 1 : .55} strokeLinecap="round" />
      ))}
      {map.nodes.map(n => (
        <circle key={n.key} cx={n.x} cy={n.y} r={n.on ? 3.4 : 2.3} fill={n.on ? MAP_ON : MAP_OFF} opacity={n.on ? 1 : .5} />
      ))}
      <rect x={v.x} y={v.y} width={v.w} height={v.h} rx={2} fill="rgba(255,212,105,.13)" stroke={MAP_ON} strokeWidth={1.8} />
    </svg>
  );
}
