#!/usr/bin/env python3
"""
Normalise room tiles for the house grid.

The board lays rooms out edge to edge, so a tile has to be cropped exactly to
its outer wall: any dark background left around the art shows up as a seam
between neighbouring rooms. This trims that border, squares the tile up and
writes it next to index.js under the name the game globs for.

    pip install pillow
    python3 app/tools/prep-rooms.py [--size 512]

Reads  app/src/assets/rooms/raw/*.png|jpg
Writes app/src/assets/rooms/<name>.png
"""
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
    ap.add_argument('--size', type=int, default=512, help='output tile side in px')
    ap.add_argument('--no-trim', action='store_true', help='square up without trimming')
    args = ap.parse_args()

    if not RAW.is_dir():
        sys.exit('no raw/ directory at ' + str(RAW))
    srcs = sorted(p for p in RAW.iterdir() if p.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'))
    if not srcs:
        sys.exit('nothing to prepare in ' + str(RAW))

    for src in srcs:
        im = Image.open(src).convert('RGBA')
        box = (0, 0) + im.size if args.no_trim else content_box(im)
        cut = im.crop(box)
        out = cut.resize((args.size, args.size), Image.LANCZOS)
        dst = ROOMS / (src.stem.lower().replace(' ', '-') + '.png')
        out.save(dst, optimize=True)
        print('%-22s %sx%s -> trim %s -> %s (%.0f kB)' % (
            src.name, im.size[0], im.size[1], box, dst.name, dst.stat().st_size / 1024))


if __name__ == '__main__':
    main()
