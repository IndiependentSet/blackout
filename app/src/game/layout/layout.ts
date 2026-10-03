import { THINGS } from '../../assets/things';
import { ROOM_CATALOGUE } from '../../assets/rooms';
import { buildHouse, houseSeed } from '../../domain/house';
import type { HousePlan, Level, Point, Rect } from '../../domain/types';
import { CONTENT_PAD, SPACING, WORLD_MARGIN } from '../constants';

/** A level placed in world space, plus the building it sits in. */
export interface Layout {
  lv: Level;
  /** world units per lattice step */
  sp: number;
  /** centre of the pads' bounding box */
  cx: number;
  cy: number;
  plan: HousePlan;
  /** world position of every node */
  pos: Point[];
  /** the puzzle and the building around it: what Fit frames */
  content: Rect;
  /** the ground you can pan into */
  world: Rect;
}

const THING_NAMES = THINGS.map(t => t.name);
const cache = new WeakMap<Level, Layout>();

/* lattice -> world, at one fixed scale for every house, plus the building that
   lattice implies. Memoized per level object: queueing site N+1 frames it
   while site N is still rendering, so one cache slot would thrash. */
export function layoutFor(lv: Level): Layout {
  const hit = cache.get(lv);
  if (hit) return hit;

  const cs = lv.nodes.map(n => n.c), rs = lv.nodes.map(n => n.r);
  const c0 = Math.min(...cs), r0 = Math.min(...rs);
  const w = (Math.max(...cs) - c0) * SPACING, h = (Math.max(...rs) - r0) * SPACING;
  /* seeded off the level's own coordinates — layoutFor() runs during render,
     so it must not reach for the day or the site index */
  const plan = buildHouse(lv, houseSeed(lv), SPACING, THING_NAMES, ROOM_CATALOGUE);
  const O = plan.outer;

  /* content is the whole building, so its outer walls never get cropped */
  const x = Math.min(-CONTENT_PAD, O.x), y = Math.min(-CONTENT_PAD, O.y);
  const x1 = Math.max(w + CONTENT_PAD, O.x + O.w), y1 = Math.max(h + CONTENT_PAD, O.y + O.h);

  const layout: Layout = {
    lv, sp: SPACING, cx: w / 2, cy: h / 2, plan,
    pos: lv.nodes.map(n => ({ x: (n.c - c0) * SPACING, y: (n.r - r0) * SPACING })),
    content: { x, y, w: x1 - x, h: y1 - y },
    world: { x: O.x - WORLD_MARGIN, y: O.y - WORLD_MARGIN, w: O.w + 2 * WORLD_MARGIN, h: O.h + 2 * WORLD_MARGIN },
  };
  cache.set(lv, layout);
  return layout;
}
