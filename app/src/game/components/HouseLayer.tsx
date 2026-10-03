import { memo } from 'react';
import { roomArt } from '../../assets/rooms';
import { HOUSE } from '../../domain/house';
import type { HousePlan, PlanRoom } from '../../domain/types';

const FLOOR_FILL: Record<string, string> = {
  living: 'url(#cc-planks)', study: 'url(#cc-planks)', hall: 'url(#cc-planks)',
  kitchen: 'url(#cc-tile)', bath: 'url(#cc-checker)',
  bedroom: 'url(#cc-carpet)', nursery: 'url(#cc-carpet)', storage: 'url(#cc-concrete)',
};
const WALL_INK = '#D9C39B', WALL_SHADOW = '#160B06', WALL_T = 15;

/* a room with no picture yet: floor, a wall frame, and a gap for a doorway */
function PlainRoom({ r }: { r: PlanRoom }) {
  const t = WALL_T, { w, h } = r, gap = w * 0.22;
  return (
    <g>
      <rect x={r.x} y={r.y} width={w} height={h} fill={FLOOR_FILL[r.type] || FLOOR_FILL.living} />
      <rect x={r.x} y={r.y} width={w} height={h} fill="url(#cc-pool)" />
      <rect x={r.x} y={r.y} width={w} height={t} fill={WALL_INK} />
      <rect x={r.x} y={r.y} width={t} height={h} fill={WALL_INK} />
      <rect x={r.x + w - t} y={r.y} width={t} height={h} fill={WALL_INK} />
      <rect x={r.x} y={r.y + h - t} width={(w - gap) / 2} height={t} fill={WALL_INK} />
      <rect x={r.x + (w + gap) / 2} y={r.y + h - t} width={(w - gap) / 2} height={t} fill={WALL_INK} />
      <rect x={r.x + t} y={r.y + t} width={w - 2 * t} height={3} fill={WALL_SHADOW} opacity={.32} />
    </g>
  );
}

function Room({ r }: { r: PlanRoom }) {
  const url = roomArt(r.art);
  if (!url) return <PlainRoom r={r} />;
  /* overdrawn by a hair, or neighbouring tiles show a seam; mirrored about the tile's own centre line */
  const o = HOUSE.SEAM;
  return (
    <image href={url} x={r.x - o} y={r.y - o} width={r.w + 2 * o} height={r.h + 2 * o} preserveAspectRatio="none"
      transform={r.flip ? `translate(${2 * r.cx} 0) scale(-1 1)` : undefined} />
  );
}

/* The building: one drawn room per tile, under the paths and dimmed as one
   group so the puzzle stays loud. The rooms were all built once per level, so
   a frame only ever hands this the ones in view. */
export const HouseLayer = memo(function HouseLayer({ outer, rooms, opacity }: {
  outer: HousePlan['outer']; rooms: PlanRoom[]; opacity: number;
}) {
  return (
    <g opacity={opacity} style={{ pointerEvents: 'none', transition: 'opacity 220ms ease-out' }}>
      <rect x={outer.x} y={outer.y} width={outer.w} height={outer.h} fill="#241610" />
      {rooms.map(r => <Room key={r.id} r={r} />)}
    </g>
  );
});
