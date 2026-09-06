/*
 * The rooms the house is built out of.
 *
 * Each tile is a complete drawn room — its own four walls, its own floor, its
 * own furniture — cropped exactly to the outer wall so tiles butt together
 * without a seam (see README.md and ../../../tools/prep-rooms.py).
 *
 * Loaded by glob rather than an import line per room: the file name *is* the
 * contract, `<type>.png` or `<type>-<n>.png` for a second version of a type.
 * Drop a new tile in and the generator starts using it; drop none in and the
 * board falls back to drawing plain rooms.
 */
const urls = import.meta.glob('./*.png', { eager: true, query: '?url', import: 'default' });

/* the types house.js knows how to furnish and stock with smashables */
const KNOWN = ['living', 'kitchen', 'bedroom', 'bath', 'study', 'nursery', 'hall', 'storage'];

/* type -> every version of it we have, in a stable order */
export const ROOM_ART = (() => {
  const by = {};
  Object.keys(urls).sort().forEach(path => {
    const name = path.replace(/^\.\//, '').replace(/\.png$/i, '').toLowerCase();
    const type = name.replace(/-\d+$/, '');
    if (!KNOWN.includes(type)) return;
    (by[type] = by[type] || []).push(urls[path]);
  });
  return by;
})();

export const ROOM_TYPES = Object.keys(ROOM_ART);

/* which picture a tile shows; null while a type has no art yet */
export function roomArt(type, variant) {
  const list = ROOM_ART[type];
  return list && list.length ? list[variant % list.length] : null;
}
