# Room art

The house is cut into rooms and each one is filled with a picture from here:
walls, floor and furniture are all baked into the art, so the game draws one
`<image>` per room and nothing else.

## The contract

    <type>.png            e.g. living.png
    <type>-<n>.png        another version of the same type

Types the generator knows how to stock with smashables (`ROOM_THINGS` in
`../../house.js`):

    living  kitchen  dining  bedroom  nursery  bath  study
    music   plants   laundry  workshop  hall  storage

`manifest.json` is generated, not hand-written: it records each room's type
and its trimmed pixel size. The shape matters — `house.js` picks a picture
whose proportions match the room it has to fill, so a tall room gets a tall
picture instead of a square one stretched to fit. A room may be stretched up
to `HOUSE.SHAPE_TOL`, and is mirrored left-to-right half the time.

More versions of a type, and more shapes, both make houses less samey. Tall
rooms are the scarcest — art around 2:3 is the most useful thing to add.

## Adding a room

Drop the original in `raw/` and run:

    pip install pillow
    python3 app/tools/prep-rooms.py

That trims the backdrop from around the outer wall, caps the resolution and
rewrites `manifest.json`. Trimming is the part that matters: art left
untrimmed shows as a dark seam between rooms.

Prefix a raw file with `_` to keep it out of the game — `_bedroom-3.png` is
held back because its outline is L-shaped, and a non-rectangular room leaves a
hole in the floorplan.
