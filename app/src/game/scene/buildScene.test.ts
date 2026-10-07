import { describe, expect, it } from 'vitest';
import { makeLevelForDay } from '../../domain/engine';
import { layoutFor } from '../layout/layout';
import { buildMinimap, buildScene, viewCoversContent } from './buildScene';
import { cable } from './cable';
import { makeSeen } from './view';

const lv = makeLevelForDay(12, 2);
const layout = layoutFor(lv);
const input = { layout, siteIdx: 2, placed: [] as number[], hint: null, focus: 0, kbd: false };

describe('layoutFor', () => {
  it('is memoized per level', () => expect(layoutFor(lv)).toBe(layout));
  it('places every node and frames the building', () => {
    expect(layout.pos).toHaveLength(lv.nodes.length);
    expect(layout.content.w).toBeGreaterThan(0);
    expect(layout.world.w).toBeGreaterThan(layout.content.w - 1);
  });
});

describe('buildScene', () => {
  it('draws one path + one smashable per edge and one pad per node', () => {
    const s = buildScene(input);
    expect(s.paths).toHaveLength(lv.edges.length);
    expect(s.sprites.filter(x => x.kind === 'thing')).toHaveLength(lv.edges.length);
    expect(s.sprites.filter(x => x.kind === 'pad')).toHaveLength(lv.nodes.length);
  });
  it('depth-sorts cats and smashables together', () => {
    const bases = buildScene(input).sprites.map(x => x.base);
    expect(bases).toEqual([...bases].sort((a, b) => a - b));
  });
  it('lights the paths a cat covers and smashes their fixtures', () => {
    const s = buildScene({ ...input, placed: [0] });
    const lit = s.paths.filter(p => p.lit).map(p => p.key);
    expect(lit).toEqual(lv.edges.flatMap(([u, v], i) => (u === 0 || v === 0 ? [i] : [])));
    const smashed = s.sprites.filter(x => x.kind === 'thing' && x.smashed).length;
    expect(smashed).toBe(lit.length);
  });
  it('marks hired pads, the hinted pad and (only with the keyboard) the focus ring', () => {
    const hint = { kind: 'reveal', node: 1 } as const;
    const s = buildScene({ ...input, placed: [0], hint, focus: 2, kbd: true });
    const pad = (n: number) => s.sprites.find(x => x.kind === 'pad' && x.node === n)!;
    expect(pad(0)).toMatchObject({ hired: true });
    expect(pad(1)).toMatchObject({ pulsing: true });
    expect(pad(2)).toMatchObject({ focused: true });
    expect(buildScene({ ...input, focus: 2, kbd: false }).sprites.some(x => x.kind === 'pad' && x.focused)).toBe(false);
  });
  it('draws the matching for an estimate hint', () => {
    expect(buildScene({ ...input, hint: { kind: 'proof', edges: [0] } }).proof).toHaveLength(1);
    expect(buildScene(input).proof).toHaveLength(0);
  });
  it('is deterministic', () => {
    expect(JSON.stringify(buildScene(input).paths)).toBe(JSON.stringify(buildScene(input).paths));
  });
});

describe('cable', () => {
  it('sags below the straight line and parks the smashable on it', () => {
    const c = cable({ x: 0, y: 0 }, { x: 100, y: 0 });
    expect(c.mx).toBe(50);
    expect(c.my).toBeGreaterThan(0);
    expect(c.d.startsWith('M 0 0 Q 50')).toBe(true);
  });
});

describe('culling and the minimap', () => {
  it('sees what is in the frame (grown 30%) and nothing past it', () => {
    const seen = makeSeen({ x: 0, y: 0, w: 100, h: 100 });
    expect(seen(10, 10, 20, 20)).toBe(true);
    expect(seen(120, 0, 130, 10)).toBe(true);     // inside the 30% margin
    expect(seen(200, 0, 210, 10)).toBe(false);
  });
  it('maps minimap points back to the world', () => {
    const m = buildMinimap(layout, []);
    const w = m.toWorld(m.w / 2, m.h / 2);
    expect(w.x).toBeCloseTo(layout.content.x + layout.content.w / 2);
    expect(m.nodes).toHaveLength(lv.nodes.length);
  });
  it('knows when the frame already shows the whole building', () => {
    expect(viewCoversContent({ x: -1e4, y: -1e4, w: 2e4, h: 2e4 }, layout.content)).toBe(true);
    expect(viewCoversContent({ x: 0, y: 0, w: 10, h: 10 }, layout.content)).toBe(false);
  });
});

describe('buildScene with a loadout but no art drawn yet', () => {
  it('is identical to the bare scene: the accessory simply is not there', () => {
    const bare = buildScene(input);
    expect(buildScene({ ...input, loadout: { head: 'hard-hat', neck: 'scarf' } })).toStrictEqual(bare);
  });
});
