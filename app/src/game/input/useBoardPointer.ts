import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { Point } from '../../domain/types';
import {
  cameraAtPoint, clampZoom, hitRadius, pickNode, pinchZoom, unitsPerPx, wheelZoom, zoomBounds, type Camera,
} from '../camera/camera';
import type { CameraControls } from '../camera/useCamera';
import { TAP_MAX_MOVE, TAP_MAX_MS } from '../constants';
import type { Layout } from '../layout/layout';

interface Drag { x: number; y: number; t: number; moved: number; cam: Camera; u: number }
interface Pinch { d: number; z: number; wp: Point | null }

const span = (a: Point, b: Point) => ({ d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 });

interface Options {
  svgRef: RefObject<SVGSVGElement | null>;
  layout: Layout;
  camera: CameraControls;
  onPickNode: (node: number) => void;
}

/* Drag to pan, wheel/pinch to zoom, short press to tap a pad. Positions are
   mapped client -> world through the SVG's own CTM, which is why the camera
   lives in the viewBox rather than an inner transform. */
export function useBoardPointer({ svgRef, layout, camera, onPickNode }: Options) {
  const pointers = useRef(new Map<number, Point>());
  const drag = useRef<Drag | null>(null);
  const pinch = useRef<Pinch | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  const toWorld = useCallback((cx: number, cy: number): Point | null => {
    const svg = svgRef.current; if (!svg) return null;
    const m = svg.getScreenCTM(); if (!m) return null;
    const p = svg.createSVGPoint(); p.x = cx; p.y = cy;
    const q = p.matrixTransform(m.inverse());
    return { x: q.x, y: q.y };
  }, [svgRef]);

  const rect = () => (svgRef.current as SVGSVGElement).getBoundingClientRect();

  useEffect(() => {
    const svg = svgRef.current; if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = camera.read(), zb = zoomBounds(layout, camera.camW);
      const wp = toWorld(e.clientX, e.clientY); if (!wp) return;
      const z = clampZoom(wheelZoom(c.z, e.deltaY), zb);
      if (z === c.z) return;
      camera.halt();
      camera.set(cameraAtPoint(wp, e.clientX, e.clientY, z, rect(), camera.camW));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rect() only reads the ref
  }, [svgRef, layout, camera, toWorld]);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    camera.halt();
    if (pointers.current.size === 1) {
      const cam = camera.read();
      drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, cam: { ...cam }, u: unitsPerPx(cam.z, rect(), camera.camW) };
      setGrabbing(true);
    } else if (pointers.current.size === 2) {
      drag.current = null;
      const [a, b] = [...pointers.current.values()];
      const s = span(a, b);
      pinch.current = { d: s.d, z: camera.read().z, wp: toWorld(s.mx, s.my) };
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = pinch.current;
    if (p && p.wp && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const s = span(a, b);
      const z = clampZoom(pinchZoom(p.z, p.d, s.d), zoomBounds(layout, camera.camW));
      return camera.set(cameraAtPoint(p.wp, s.mx, s.my, z, rect(), camera.camW));
    }
    const d = drag.current; if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    d.moved = Math.max(d.moved, Math.hypot(dx, dy));
    camera.set({ x: d.cam.x - dx * d.u, y: d.cam.y - dy * d.u, z: d.cam.z });
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const d = drag.current;
    drag.current = null;
    setGrabbing(false);
    if (d && d.moved < TAP_MAX_MOVE && performance.now() - d.t < TAP_MAX_MS) {
      const q = toWorld(e.clientX, e.clientY);
      const node = q ? pickNode(layout.pos, q, hitRadius(layout.sp)) : -1;
      if (node >= 0) onPickNode(node);
    }
  };

  return { grabbing, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
