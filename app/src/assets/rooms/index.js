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

const urls = import.meta.glob('./*.png', { eager: true, query: '?url', import: 'default' });

const byKey = {};
Object.keys(urls).forEach(path => {
  byKey[path.replace(/^\.\//, '').replace(/\.png$/i, '').toLowerCase()] = urls[path];
});

/* what the generator gets to choose from: only rooms that have both a picture
   and a measured shape */
export const ROOM_CATALOGUE = Object.keys(manifest)
  .filter(key => byKey[key] && manifest[key].h > 0)
  .sort()
  .map(key => ({
    key, type: manifest[key].type,
    aspect: manifest[key].w / manifest[key].h,
    url: byKey[key],
  }));

const ART = {};
ROOM_CATALOGUE.forEach(e => { ART[e.key] = e.url; });

/* the picture a room shows; null while there is no art for it */
export function roomArt(key) {
  return ART[key] || null;
}
