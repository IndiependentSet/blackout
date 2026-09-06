# Room art

The house is a grid of drawn rooms: one image per room tile, walls and
furniture baked in. `index.js` picks the tiles up by glob, so the **file name
is the contract**:

    <type>.png            e.g. living.png, kitchen.png
    <type>-<n>.png        a second, third, ... version of the same type

Recognised types (anything else is ignored):

    living  kitchen  bedroom  bath  study  nursery  hall  storage

More versions of a type mean more varied houses — `bedroom.png`,
`bedroom-2.png` and `bedroom-3.png` are drawn from at random (seeded), and
every tile may also be mirrored horizontally.

## Preparing a new tile

Drop the original into `raw/` and run:

    pip install pillow
    python3 app/tools/prep-rooms.py

It trims the dark background from around the room's outer walls, squares the
tile up and writes a normalised PNG next to `index.js`. Tiles have to be
trimmed exactly to the outer wall, or neighbouring rooms show a dark seam
between them.
