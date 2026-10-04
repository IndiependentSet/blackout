/*
 * The smashables, cut from the CAT COVER destructible-items sheet.
 *
 * Each item ships the sheet's four states — `idle`, `wobble`, `hit`,
 * `broken` — on a shared 128x128 canvas, all at one scale with their base on
 * the same line (`THING_BASELINE`), so an item can play through the four
 * frames without shifting on the floor.
 *
 * Loaded by glob rather than 72 import lines: the file name *is* the
 * contract, `<name>-<pose>.png`. Add an item by dropping its four frames in
 * here and adding it to ITEMS.
 */
const urls = import.meta.glob<string>('./*.png', { eager: true, query: '?url', import: 'default' });

/* where an item's base sits on the sprite canvas, as a fraction of its side */
export const THING_BASELINE = 158 / 168;

const POSES = ['idle', 'wobble', 'hit', 'broken'] as const;

export interface Thing {
  name: string;
  label: string;
  idle: string; wobble: string; hit: string; broken: string;
}

const ITEMS: [string, string][] = [
  ['toilet-paper', 'toilet paper'], ['vase', 'vase of flowers'], ['mug', 'mug of coffee'],
  ['can', 'tin of fish'], ['ball', 'bouncy ball'], ['pot', 'terracotta pot'],
  ['lamp', 'lamp'], ['fishbowl', 'fish bowl'], ['box', 'cardboard box'],
  ['petbed', 'pet bed'], ['mouse', 'plush mouse'], ['clock', 'wall clock'],
  ['plant', 'house plant'], ['yarn', 'ball of yarn'], ['books', 'stack of books'],
  ['pillow', 'pillow'], ['crate', 'wooden crate'], ['fishtoy', 'rubber fish'],
];

function poseUrl(name: string, pose: (typeof POSES)[number]): string {
  const url = urls['./' + name + '-' + pose + '.png'];
  if (!url) throw new Error('missing thing sprite: ' + name + '-' + pose + '.png');
  return url;
}

export const THINGS: Thing[] = ITEMS.map(([name, label]) => ({
  name, label,
  idle: poseUrl(name, 'idle'), wobble: poseUrl(name, 'wobble'),
  hit: poseUrl(name, 'hit'), broken: poseUrl(name, 'broken'),
}));
