#!/usr/bin/env python3
"""
Normalise the drawn rooms the house is built from.

Rooms are laid out edge to edge, so a room has to be cropped exactly to its
outer wall: any backdrop left around the art shows up as a seam between
neighbouring rooms. This trims that border, caps the resolution, and writes
the room next to index.js along with a manifest of its type and its trimmed
shape — the generator picks art whose shape matches the room it has to fill,
so those numbers matter.

    pip install pillow
    python3 app/tools/prep-rooms.py [--max 512]

Reads  app/src/assets/rooms/raw/<type>[-<n>].png    (a leading _ is skipped)
Writes app/src/assets/rooms/<type>[-<n>].png
       app/src/assets/rooms/manifest.json
"""
import json
import argparse
import pathlib
import sys

from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
ROOMS = HERE.parent / 'src' / 'assets' / 'rooms'
RAW = ROOMS / 'raw'
# the board's own backdrop, which the art tends to sit on
BACKDROP = (42, 27, 61)
TOL = 26          # how far off the backdrop a pixel can be and still be border
ROW_FRAC = 0.985  # a row this uniformly background is trimmed


def near(px, ref, tol):
    return abs(px[0] - ref[0]) <= tol and abs(px[1] - ref[1]) <= tol and abs(px[2] - ref[2]) <= tol


def border_colour(im):
    """The backdrop actually used, sampled from the outermost ring."""
    w, h = im.size
    px = im.load()
    ring = []
    for x in range(0, w, max(1, w // 64)):
        ring += [px[x, 0], px[x, h - 1]]
    for y in range(0, h, max(1, h // 64)):
        ring += [px[0, y], px[w - 1, y]]
    ring = [p[:3] for p in ring]
    best, hits = BACKDROP, -1
    for cand in ring:
        n = sum(1 for p in ring if near(p, cand, 12))
        if n > hits:
            best, hits = cand, n
    return best if hits > len(ring) * 0.5 else BACKDROP


def content_box(im):
    """Bounding box of everything that isn't backdrop (or transparent)."""
    w, h = im.size
    px = im.load()
    ref = border_colour(im.convert('RGB'))
    has_alpha = im.mode == 'RGBA'

    def bg(x, y):
        p = px[x, y]
        if has_alpha and p[3] < 24:
            return True
        return near(p, ref, TOL)

    def row_bg(y):
        n = sum(1 for x in range(w) if bg(x, y))
        return n >= w * ROW_FRAC

    def col_bg(x):
        n = sum(1 for y in range(h) if bg(x, y))
        return n >= h * ROW_FRAC

    top = 0
    while top < h - 1 and row_bg(top):
        top += 1
    bot = h - 1
    while bot > top and row_bg(bot):
        bot -= 1
    left = 0
    while left < w - 1 and col_bg(left):
        left += 1
    right = w - 1
    while right > left and col_bg(right):
        right -= 1
    return (left, top, right + 1, bot + 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--max', type=int, default=512, help='longest output side in px')
    ap.add_argument('--no-trim', action='store_true', help='square up without trimming')
    args = ap.parse_args()

    if not RAW.is_dir():
        sys.exit('no raw/ directory at ' + str(RAW))
    srcs = sorted(p for p in RAW.iterdir() if p.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'))
    if not srcs:
        sys.exit('nothing to prepare in ' + str(RAW))

    manifest = {}
    for src in srcs:
        if src.stem.startswith('_'):
            print('%-22s skipped' % src.name)
            continue
        im = Image.open(src).convert('RGBA')
        box = (0, 0) + im.size if args.no_trim else content_box(im)
        cut = im.crop(box)
        w, h = cut.size
        k = min(1.0, args.max / max(w, h))
        if k < 1.0:
            cut = cut.resize((round(w * k), round(h * k)), Image.LANCZOS)
        key = src.stem.lower().replace(' ', '-')
        dst = ROOMS / (key + '.png')
        cut.save(dst, optimize=True)
        manifest[key] = {'type': key.rsplit('-', 1)[0] if key[-1].isdigit() else key,
                         'w': cut.size[0], 'h': cut.size[1]}
        print('%-22s %sx%s -> %sx%s  %-9s %.2f  %.0f kB' % (
            src.name, im.size[0], im.size[1], cut.size[0], cut.size[1],
            manifest[key]['type'], cut.size[0] / cut.size[1], dst.stat().st_size / 1024))

    (ROOMS / 'manifest.json').write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n')
    print('%d rooms -> manifest.json' % len(manifest))


if __name__ == '__main__':
    main()
