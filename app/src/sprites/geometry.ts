import { CAT_BASELINE } from '../assets/cats';
import { THING_BASELINE } from '../assets/things';

/* how big a sticker cat is drawn, and where its feet land, in node units */
export const CAT_D = 56;
export const CAT_FOOT = 18;
export const CAT_TOP = CAT_FOOT - CAT_D * CAT_BASELINE;

/* the same, for the smashable sitting on the middle of a cable */
export const THING_D = 52;
export const THING_FOOT = 11;
export const THING_TOP = THING_FOOT - THING_D * THING_BASELINE;

/** The "tap me" target around a pad, in node units. */
export const PAD_HIT_R = 32;
