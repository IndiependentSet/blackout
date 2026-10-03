import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SHOT_EASE_MS, SHOT_HOLD_MS, Z_PLAY } from '../constants';
import { prefersReducedMotion } from '../env';
import type { Layout } from '../layout/layout';
import {
  camWidth, clampCamera, easeOutCubic, establishingShot, followCamera, lerpCamera, wholeCamera, zoomBounds,
  type Camera,
} from './camera';

export interface CameraControls {
  /** frame width in world units */
  camW: number;
  /** the latest camera, without waiting for a render — for gesture handlers */
  read: () => Camera;
  /** move there now (clamped to the world) */
  set: (to: Camera) => void;
  /** ease there; also cancels any tween or pending establishing shot in flight */
  tween: (to: Camera, ms: number) => void;
  /** stop any tween or pending shot — the player has taken the controls */
  halt: () => void;
  /** entering a house: the whole place, then in to play zoom */
  frame: () => void;
  /** frame the whole building */
  fit: () => void;
  zoomBy: (k: number) => void;
  /** nudge the camera just enough to bring a node back into the safe box */
  follow: (node: number) => void;
}

/* The camera over the world. It owns its own animation (rAF tween + the pause
   before the establishing shot's ease-in), cancels both on unmount, and keeps
   a ref to the latest value so gesture handlers never read a stale frame. */
export function useCamera(layout: Layout, aspect: number): { cam: Camera; controls: CameraControls } {
  const camW = camWidth(aspect);
  const [cam, setCam] = useState<Camera>({ x: layout.cx, y: layout.cy, z: Z_PLAY });
  const camRef = useRef(cam);
  const raf = useRef(0);
  const shot = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const commit = useCallback((c: Camera) => { camRef.current = c; setCam(c); }, []);
  const halt = useCallback(() => { cancelAnimationFrame(raf.current); clearTimeout(shot.current); }, []);
  useEffect(() => halt, [halt]);

  /* the controls only change with the layout or frame width, not on every
     frame of a pan, so gesture effects don't resubscribe as the camera moves */
  const controls = useMemo<CameraControls>(() => {
    const set = (to: Camera) => commit(clampCamera(to, layout, camW));

    const tween = (to: Camera, ms: number) => {
      cancelAnimationFrame(raf.current);
      const target = clampCamera(to, layout, camW);
      if (ms <= 0 || prefersReducedMotion()) return commit(target);
      const from = { ...camRef.current }, t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / ms);
        commit(lerpCamera(from, target, easeOutCubic(p)));
        if (p < 1) raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    };

    return {
      camW, read: () => camRef.current, set, tween, halt,
      frame() {
        halt();
        const s = establishingShot(layout, camW, prefersReducedMotion());
        if (s.kind === 'cut') return set(s.to);
        set(s.from);
        shot.current = setTimeout(() => tween(s.to, SHOT_EASE_MS), SHOT_HOLD_MS);
      },
      fit() {
        clearTimeout(shot.current);
        tween(wholeCamera(layout, camW), 320);
      },
      zoomBy(k) {
        clearTimeout(shot.current);
        const c = camRef.current;
        tween({ x: c.x, y: c.y, z: c.z * k }, 180);
      },
      follow(node) {
        const next = followCamera(camRef.current, layout.pos[node], camW);
        if (next) tween(next, 240);
      },
    };
  }, [camW, layout, commit, halt]);

  return { cam, controls };
}

/** The zoom range for a layout at the current frame width. */
export const zoomRange = (layout: Layout, camW: number) => zoomBounds(layout, camW);
