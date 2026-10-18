import { useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import type { Hint, Level, Loadout } from '../../domain/types';
import { cx } from '../../ui';
import { viewOf, zoomBounds } from '../camera/camera';
import { useCamera } from '../camera/useCamera';
import { CAM_A, HOUSE_DIM, HOUSE_DIM_LOW, Z_PLAY } from '../constants';
import { pulseWeb } from '../fx';
import { useBoardPointer } from '../input/useBoardPointer';
import { layoutFor } from '../layout/layout';
import { buildMinimap, buildScene, viewCoversContent } from '../scene/buildScene';
import { inView, makeSeen } from '../scene/view';
import { useCulled } from '../../hooks/useCulled';
import { ZOOM_IN, ZOOM_OUT } from '../input/keymap';
import { BoardDefs } from './BoardDefs';
import { BoardToolbar } from './BoardToolbar';
import { HouseLayer } from './HouseLayer';
import { Minimap } from './Minimap';
import { PathLayer } from './PathLayer';
import { SpriteLayer } from './SpriteLayer';
import styles from './Board.module.css';

/** What the screen can ask of the board from outside (keyboard shortcuts, site changes). */
export interface BoardHandle {
  fit: () => void;
  zoomBy: (k: number) => void;
  /** bring a node back into the safe box */
  follow: (node: number) => void;
}

interface Props {
  ref?: Ref<BoardHandle>;
  level: Level;
  /** which site this is (0-based) */
  siteIdx: number;
  placed: number[];
  hint: Hint | null;
  focus: number;
  kbd: boolean;
  dim: boolean;
  expanded: boolean;
  /** what the cats wear (cosmetic only) */
  loadout?: Loadout;
  onTapNode: (node: number) => void;
  onToggleExpand: () => void;
  onToggleDim: () => void;
}

/* The overlays are sized in screen px, so they shrink with the board. */
const uiScale = (boardW: number) => Math.max(0.52, Math.min(1, boardW / 620));

/* The playing field: the house, the paths and the cats, seen through a camera.
   It owns the camera and the pointer, so a pan re-renders only this — the
   scene is rebuilt when the game changes, and each frame just culls it. */
export function Board({
  ref, level, siteIdx, placed, hint, focus, kbd, dim, expanded, loadout, onTapNode, onToggleExpand, onToggleDim,
}: Props) {
  const layout = useMemo(() => layoutFor(level), [level]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [frameSize, setFrameSize] = useState({ aspect: CAM_A, width: 640 });

  /* the camera's width follows the board's real aspect, so it never letterboxes */
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !window.ResizeObserver) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const aspect = r.width / r.height;
      setFrameSize(s => (Math.abs(aspect - s.aspect) < 0.005 && Math.abs(r.width - s.width) < 2 ? s : { aspect, width: r.width }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { cam, controls } = useCamera(layout, frameSize.aspect);
  const { grabbing, handlers } = useBoardPointer({ svgRef, layout, camera: controls, onPickNode: onTapNode });

  /* re-clamp when the frame changes shape */
  useEffect(() => { controls.set(controls.read()); }, [controls]);
  /* entering a house: the establishing shot, and one sweep of the web */
  useEffect(() => { controls.frame(); pulseWeb(); }, [layout]); // eslint-disable-line react-hooks/exhaustive-deps -- only when the site changes

  useImperativeHandle(ref, () => ({
    fit: controls.fit,
    zoomBy: controls.zoomBy,
    follow: controls.follow,
  }), [controls]);

  const scene = useMemo(
    () => buildScene({ layout, siteIdx, placed, hint, focus, kbd, loadout }),
    [layout, siteIdx, placed, hint, focus, kbd, loadout]);
  const map = useMemo(() => buildMinimap(layout, placed), [layout, placed]);

  /* this frame: the camera as a viewBox, and only what is in it */
  const view = viewOf(cam, controls.camW);
  const seen = makeSeen(view);
  const rooms = useCulled(layout.plan.rooms, r => seen(r.x, r.y, r.x + r.w, r.y + r.h), r => r.id);
  const paths = useCulled(scene.paths, p => inView(seen, p.bounds), p => p.key);
  const sprites = useCulled(scene.sprites, s => inView(seen, s.bounds), s => s.key);

  /* the minimap only earns its space when the house doesn't fit in the frame */
  const showMap = zoomBounds(layout, controls.camW).fit < Z_PLAY && !viewCoversContent(view, layout.content);
  const k = uiScale(frameSize.width);
  const ground = { x: view.x - view.w * 0.1, y: view.y - view.h * 0.1, w: view.w * 1.2, h: view.h * 1.2 };

  return (
    <div className={styles.frame} style={{ aspectRatio: CAM_A, ['--k' as string]: k }}>
      <div className={styles.vignette} />
      <svg ref={svgRef} className={cx(styles.svg, grabbing && styles.grabbing)}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} width="100%" height="100%"
        role="application" tabIndex={0} aria-label="cat cover grid" {...handlers}>
        <BoardDefs />
        {/* the ground the building stands on */}
        <rect x={ground.x} y={ground.y} width={ground.w} height={ground.h} fill="url(#cc-void)" />
        <HouseLayer outer={layout.plan.outer} rooms={rooms} opacity={dim ? HOUSE_DIM_LOW : HOUSE_DIM} />
        <PathLayer paths={paths} proof={scene.proof} />
        <SpriteLayer sprites={sprites} />
      </svg>
      <BoardToolbar expanded={expanded} dim={dim}
        onZoomOut={() => controls.zoomBy(ZOOM_OUT)} onZoomIn={() => controls.zoomBy(ZOOM_IN)}
        onFit={controls.fit} onToggleExpand={onToggleExpand} onToggleDim={onToggleDim} />
      {showMap && (
        <Minimap map={map} view={view} scale={k}
          onJump={w => { controls.halt(); controls.set({ x: w.x, y: w.y, z: controls.read().z }); }} />
      )}
    </div>
  );
}
