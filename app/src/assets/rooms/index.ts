/*
 * The drawn rooms the house is built from.
 *
 * Each picture is a complete room — its own four walls, its own floor, its own
 * furniture — cropped exactly to the outer wall so rooms butt together without
 * a seam. Rooms come in different shapes, and `manifest.json` (written by
 * ../../../tools/prep-rooms.py) carries each one's type and trimmed size, so
 * house.js can hand a tall room a tall picture instead of stretching a square
 * one to fit.
 *
 * The file name is the contract: `<type>.png`, or `<type>-<n>.png` for another
 * version of the same type. Drop a room in, re-run prep-rooms.py, and the
 * generator starts dealing it out.
 */
import manifest from './manifest.json';
import type { CatalogueEntry } from '../../domain/types';

interface ManifestEntry { type: string; w: number; h: number }
const entries = manifest as Record<string, ManifestEntry>;

const urls = import.meta.glob<string>('./*.png', { eager: true, query: '?url', import: 'default' });

const byKey: Record<string, string> = {};
Object.keys(urls).forEach(path => {
  byKey[path.replace(/^\.\//, '').replace(/\.png$/i, '').toLowerCase()] = urls[path];
});

/* what the generator gets to choose from: only rooms that have both a picture
   and a measured shape */
export const ROOM_CATALOGUE: CatalogueEntry[] = Object.keys(entries)
  .filter(key => byKey[key] && entries[key].h > 0)
  .sort()
  .map(key => ({
    key, type: entries[key].type,
    aspect: entries[key].w / entries[key].h,
    url: byKey[key],
  }));

const ART: Record<string, string> = {};
ROOM_CATALOGUE.forEach(e => { ART[e.key] = e.url as string; });

/* the picture a room shows; null while there is no art for it */
export function roomArt(key: string): string | null {
  return ART[key] || null;
}
