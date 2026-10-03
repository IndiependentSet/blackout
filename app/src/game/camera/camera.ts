import type { Point, Rect } from '../../domain/types';
import { CAM_H, Z_KEEP, Z_MAX, Z_PLAY } from '../constants';
import type { Layout } from '../layout/layout';

/** The camera: where it looks (world units) and how far in. */
export interface Camera { x: number; y: number; z: number }

/** The frame's width follows the board's real aspect, so it never letterboxes. */
export const camWidth = (aspect: number) => CAM_H * aspect;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface ZoomBounds { fit: number; min: number; max: number }

export function zoomBounds(L: Pick<Layout, 'content'>, camW: number): ZoomBounds {
  const fit = Math.min(camW / L.content.w, CAM_H / L.content.h);
  return { fit, min: Math.min(fit, Z_PLAY), max: Z_MAX };
}

export function clampZoom(z: number, zb: ZoomBounds): number {
  return clamp(z, zb.min, zb.max);
}

/** Keep the camera inside the ground you can pan into (centred if the world is smaller than the frame). */
export function clampCamera(c: Camera, L: Pick<Layout, 'content' | 'world'>, camW: number): Camera {
  const z = clampZoom(c.z, zoomBounds(L, camW));
  const W = L.world;
  const hw = camW / (2 * z), hh = CAM_H / (2 * z);
  return {
    z,
    x: W.w <= 2 * hw ? W.x + W.w / 2 : clamp(c.x, W.x + hw, W.x + W.w - hw),
    y: W.h <= 2 * hh ? W.y + W.h / 2 : clamp(c.y, W.y + hh, W.y + W.h - hh),
  };
}

/** The part of the world the camera currently shows, as the SVG viewBox. */
export function viewOf(cam: Camera, camW: number): Rect {
  const w = camW / cam.z, h = CAM_H / cam.z;
  return { x: cam.x - w / 2, y: cam.y - h / 2, w, h };
}

export const playCamera = (L: Pick<Layout, 'cx' | 'cy'>): Camera => ({ x: L.cx, y: L.cy, z: Z_PLAY });

/** The whole building in frame. */
export function wholeCamera(L: Pick<Layout, 'content'>, camW: number): Camera {
  const C = L.content;
  return { x: C.x + C.w / 2, y: C.y + C.h / 2, z: zoomBounds(L, camW).fit };
}

export type Shot =
  | { kind: 'cut'; to: Camera }
  | { kind: 'sweep'; from: Camera; to: Camera };

/* Entering a house: an establishing shot of the whole place, then in to play
   zoom. A site that fits at play zoom just plays; one that all but fits stays
   framed whole; anything bigger sweeps in, so a cat is the same size from
   site 1 to site 7. */
export function establishingShot(L: Layout, camW: number, reducedMotion: boolean): Shot {
  const { fit } = zoomBounds(L, camW);
  const play = playCamera(L), whole = wholeCamera(L, camW);
  if (fit >= Z_PLAY) return { kind: 'cut', to: play };
  if (fit >= Z_KEEP) return { kind: 'cut', to: whole };
  if (reducedMotion) return { kind: 'cut', to: play };
  return { kind: 'sweep', from: whole, to: play };
}

/** The nudge that brings a node back inside the camera's safe box, or null if it is already there. */
export function followCamera(cam: Camera, p: Point, camW: number): Camera | null {
  const sx = (camW / (2 * cam.z)) * 0.7, sy = (CAM_H / (2 * cam.z)) * 0.7;
  const dx = p.x - cam.x, dy = p.y - cam.y;
  let nx = cam.x, ny = cam.y;
  if (dx > sx) nx = p.x - sx; else if (dx < -sx) nx = p.x + sx;
  if (dy > sy) ny = p.y - sy; else if (dy < -sy) ny = p.y + sy;
  return nx !== cam.x || ny !== cam.y ? { x: nx, y: ny, z: cam.z } : null;
}

export const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

export function lerpCamera(from: Camera, to: Camera, e: number): Camera {
  return { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, z: from.z + (to.z - from.z) * e };
}

/* ---- screen <-> world ---- */

/** The on-screen box of the board (what getBoundingClientRect returns). */
export interface ScreenRect { left: number; top: number; width: number; height: number }

/** World units per client pixel — max(), because the viewBox is letterboxed on whichever axis doesn't bind. */
export function unitsPerPx(z: number, r: ScreenRect, camW: number): number {
  return Math.max((camW / z) / r.width, (CAM_H / z) / r.height);
}

/** The camera that puts world point `wp` under client point (cx, cy) at zoom `z`. */
export function cameraAtPoint(wp: Point, cx: number, cy: number, z: number, r: ScreenRect, camW: number): Camera {
  const u = unitsPerPx(z, r, camW);
  return { x: wp.x - (cx - (r.left + r.width / 2)) * u, y: wp.y - (cy - (r.top + r.height / 2)) * u, z };
}

/** Wheel / pinch zoom factors. */
export const wheelZoom = (z: number, deltaY: number) => z * Math.exp(-deltaY * 0.0015);
export const pinchZoom = (startZ: number, startSpan: number, span: number) => startZ * (span / (startSpan || 1));

/** The node nearest a world point, if it lies within `hitRadius`. */
export function pickNode(pos: Point[], q: Point, hitRadius: number): number {
  let best = -1, bd = Infinity;
  pos.forEach((n, i) => {
    const d = Math.hypot(n.x - q.x, n.y - q.y);
    if (d < bd) { bd = d; best = i; }
  });
  return best >= 0 && bd <= hitRadius ? best : -1;
}

/** Tap target: the sticker cats stand above their node point, so keep it generous. */
export const hitRadius = (spacing: number) => Math.max(26, spacing * 0.46);
