import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SCHEDULE, levelForSite } from '../../domain/generation';
import type { AccessoryArt, Loadout } from '../../domain/types';
import { layoutFor } from '../layout/layout';

/* Stand-in art, so this checks the wiring without needing any drawn PNG. */
vi.mock('../../assets/cosmetics', () => ({
  accessoryFor: (loadout: Loadout | undefined, breedKey: string): AccessoryArt | undefined =>
    loadout?.head ? { wakeA: [`${loadout.head}-${breedKey}-wakeA`], wakeB: [`${loadout.head}-${breedKey}-wakeB`] } : undefined,
}));

const { buildScene } = await import('./buildScene');

const lv = levelForSite(DEFAULT_SCHEDULE, 12, 2);
const layout = layoutFor(lv);
const input = { layout, siteIdx: 2, placed: [0, 3] as number[], hint: null, focus: 0, kbd: false };
const worn: Loadout = { head: 'hard-hat', neck: null };

const stripAccessory = (sprites: ReturnType<typeof buildScene>['sprites']) =>
  sprites.map(s => { if (s.kind !== 'pad') return s; const { accessory: _a, ...rest } = s; return rest; });

describe('buildScene with a loadout', () => {
  it('draws exactly what it drew before when nothing is worn', () => {
    const before = buildScene(input);
    expect(buildScene({ ...input, loadout: undefined })).toStrictEqual(before);
    expect(buildScene({ ...input, loadout: { head: null, neck: null } })).toStrictEqual(before);
  });

  it('gives every pad its own breed\'s art and changes nothing else', () => {
    const bare = buildScene(input);
    const dressed = buildScene({ ...input, loadout: worn });
    expect(dressed.paths).toStrictEqual(bare.paths);
    expect(dressed.proof).toStrictEqual(bare.proof);
    expect(stripAccessory(dressed.sprites)).toStrictEqual(stripAccessory(bare.sprites));
    for (const s of dressed.sprites) {
      if (s.kind === 'pad') expect(s.accessory).toEqual({ wakeA: [`hard-hat-${s.breed.key}-wakeA`], wakeB: [`hard-hat-${s.breed.key}-wakeB`] });
      else expect('accessory' in s).toBe(false);
    }
  });

  it('keeps the breed line-up and the depth order', () => {
    const bare = buildScene(input);
    const dressed = buildScene({ ...input, loadout: worn });
    expect(dressed.sprites.map(s => s.key)).toEqual(bare.sprites.map(s => s.key));
    expect(dressed.sprites.filter(s => s.kind === 'pad').map(s => s.kind === 'pad' && s.breed.key))
      .toEqual(bare.sprites.filter(s => s.kind === 'pad').map(s => s.kind === 'pad' && s.breed.key));
  });
});
