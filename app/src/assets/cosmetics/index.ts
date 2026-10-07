/*
 * The accessories cats can wear (see README.md in this folder for the art contract).
 *
 * Loaded by glob: the file name *is* the contract, `<item>-<breed>-<pose>.png`,
 * where <item> is a cosmetic id from domain/cosmetics.ts, <breed> a breed key
 * from assets/cats and <pose> is `wakeA` or `wakeB`. Every file is a 192x192
 * canvas with the same baseline as the cats (CAT_BASELINE), so it is drawn at
 * exactly the cat's own size and position.
 *
 * Art that hasn't been drawn yet is simply absent: the cat is drawn bare and
 * nothing breaks.
 */
import type { AccessoryArt, Loadout } from '../../domain/types';

const urls = import.meta.glob<string>('./*.png', { eager: true, query: '?url', import: 'default' });

const url = (item: string, breedKey: string, pose: 'wakeA' | 'wakeB'): string | undefined =>
  urls['./' + item + '-' + breedKey + '-' + pose + '.png'];

/** Is there any art at all for this accessory? The wardrobe says "ART COMING" when not. */
export const hasArt = (item: string): boolean => Object.keys(urls).some(k => k.startsWith('./' + item + '-'));

/* Back to front: the neck piece is drawn first so a hat sits over a scarf's top. */
const DRAW_ORDER: (keyof Loadout)[] = ['neck', 'head'];

/** The art a cat of this breed wears for a loadout, or undefined when none of it exists yet. */
export function accessoryFor(loadout: Loadout | undefined, breedKey: string): AccessoryArt | undefined {
  if (!loadout) return undefined;
  const art: AccessoryArt = { wakeA: [], wakeB: [] };
  for (const slot of DRAW_ORDER) {
    const item = loadout[slot];
    if (!item) continue;
    const a = url(item, breedKey, 'wakeA'), b = url(item, breedKey, 'wakeB');
    if (a && b) { art.wakeA.push(a); art.wakeB.push(b); }
  }
  return art.wakeA.length ? art : undefined;
}
