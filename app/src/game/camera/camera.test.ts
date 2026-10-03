import { describe, expect, it } from 'vitest';
import { CAM_H, Z_MAX } from '../constants';
import {
  cameraAtPoint, camWidth, clampCamera, establishingShot, followCamera, hitRadius, pickNode,
  unitsPerPx, viewOf, zoomBounds,
} from './camera';
import type { Layout } from '../layout/layout';

const camW = camWidth(640 / 520);
const mk = (w: number, h: number): Layout => ({
  lv: {} as Layout['lv'], sp: 130, cx: w / 2, cy: h / 2, plan: {} as Layout['plan'], pos: [],
  content: { x: 0, y: 0, w, h }, world: { x: -140, y: -140, w: w + 280, h: h + 280 },
});

describe('zoomBounds', () => {
  it('fits the content in the frame', () => {
    const zb = zoomBounds(mk(1280, 1040), camW);
    expect(zb.fit).toBeCloseTo(0.5);
    expect(zb.min).toBeCloseTo(0.5);
    expect(zb.max).toBe(Z_MAX);
  });
  it('never forces a small house to zoom out past play zoom', () => {
    expect(zoomBounds(mk(200, 200), camW).min).toBe(1);
  });
});

describe('clampCamera', () => {
  const L = mk(1600, 1200);
  it('keeps the frame inside the world', () => {
    const c = clampCamera({ x: -5000, y: 9000, z: 1 }, L, camW);
    const v = viewOf(c, camW);
    expect(v.x).toBeCloseTo(L.world.x);
    expect(v.y + v.h).toBeCloseTo(L.world.y + L.world.h);
  });
  it('clamps zoom to the bounds', () => {
    expect(clampCamera({ x: 0, y: 0, z: 99 }, L, camW).z).toBe(Z_MAX);
  });
  it('centres a world smaller than the frame', () => {
    const small = mk(100, 100);
    const c = clampCamera({ x: 999, y: 999, z: 1 }, small, camW);
    expect(c.x).toBeCloseTo(small.world.x + small.world.w / 2);
  });
});

describe('establishingShot', () => {
  it('just plays when the site fits at play zoom', () => {
    expect(establishingShot(mk(300, 300), camW, false).kind).toBe('cut');
  });
  it('keeps a near-fit site framed whole', () => {
    const shot = establishingShot(mk(camW / 0.85, CAM_H / 0.85), camW, false);
    expect(shot.kind).toBe('cut');
    expect(shot.to.z).toBeCloseTo(0.85);
  });
  it('sweeps from the whole house in to play zoom on a big site', () => {
    const shot = establishingShot(mk(3000, 2400), camW, false);
    expect(shot.kind).toBe('sweep');
    if (shot.kind === 'sweep') { expect(shot.from.z).toBeLessThan(shot.to.z); expect(shot.to.z).toBe(1); }
  });
  it('skips the sweep for reduced motion', () => {
    expect(establishingShot(mk(3000, 2400), camW, true)).toMatchObject({ kind: 'cut', to: { z: 1 } });
  });
});

describe('followCamera', () => {
  const cam = { x: 0, y: 0, z: 1 };
  it('does nothing for a node already in the safe box', () => {
    expect(followCamera(cam, { x: 10, y: 10 }, camW)).toBeNull();
  });
  it('pulls the camera just far enough to the edge of the box', () => {
    const next = followCamera(cam, { x: 1000, y: 0 }, camW)!;
    expect(next.x).toBeCloseTo(1000 - (camW / 2) * 0.7);
    expect(next.y).toBe(0);
  });
});

describe('screen <-> world', () => {
  const rect = { left: 100, top: 50, width: camW, height: CAM_H };
  it('maps 1:1 at zoom 1 when the board is the camera size', () => {
    expect(unitsPerPx(1, rect, camW)).toBeCloseTo(1);
  });
  it('keeps the world point under the cursor', () => {
    const wp = { x: 300, y: 200 };
    const c = cameraAtPoint(wp, 100 + camW / 2 + 40, 50 + CAM_H / 2 - 20, 1, rect, camW);
    expect(c.x).toBeCloseTo(260);
    expect(c.y).toBeCloseTo(220);
  });
});

describe('pickNode', () => {
  const pos = [{ x: 0, y: 0 }, { x: 130, y: 0 }];
  it('picks the nearest node within reach', () => expect(pickNode(pos, { x: 120, y: 5 }, hitRadius(130))).toBe(1));
  it('misses when nothing is close enough', () => expect(pickNode(pos, { x: 65, y: 100 }, hitRadius(130))).toBe(-1));
});
