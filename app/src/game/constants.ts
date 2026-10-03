/* ---- world + camera ----
   Every house is laid out at the same lattice spacing, so a cat is exactly the
   same size in house 7 as in house 1 and a big graph costs navigation instead
   of legibility. The board is a camera over that world, driven by the SVG's
   viewBox (an inner transform would break getScreenCTM hit-testing). */
export const SPACING = 130;        // world units between neighbouring junctions
export const WORLD_MARGIN = 140;   // ground you can pan into, around the building
export const CONTENT_PAD = 46;     // what "the whole house" means when fitting it
export const CAM_H = 520;          // camera frame height in world units; the width
export const CAM_A = 640 / 520;    // follows the board's real aspect, so it never letterboxes
export const Z_PLAY = 1;           // the zoom every house settles at
export const Z_KEEP = 0.78;        // ...unless the whole site is within a whisker of
                                   // fitting, in which case show all of it
export const Z_MAX = 1.8;
export const CAT_S = 1;            // sprite scales are constants now that spacing is
export const THING_S = 1.15;       // fixed — nothing left to compensate for
export const MAP_W = 152, MAP_H = 118;   // minimap, shown only when a house overflows

/** the establishing shot: hold on the whole house, then ease in to play zoom */
export const SHOT_HOLD_MS = 420;
export const SHOT_EASE_MS = 700;

/** a tap is a press shorter than this (px, ms) */
export const TAP_MAX_MOVE = 6;
export const TAP_MAX_MS = 400;

/* ---- the building ---- */
export const HOUSE_DIM = 0.95;
export const HOUSE_DIM_LOW = 0.42;   // what the DIM button drops the house to

/* the opening sweep: three slow breaths of the whole web, deep enough to see
   over a busy room and long enough to outlast the establishing shot */
export const PULSE_MS = 900, PULSE_N = 3, PULSE_GROW = 1.55;

/** one cat over par is allowed (and scores less); a second is refused */
export const OVER_PAR_ALLOWANCE = 1;
