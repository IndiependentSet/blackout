/* The puzzle layer is drawn two-tone — a cream rim outside a dark casing — so
   it keeps its edge over a dark study floor and a pale bathroom tile alike,
   without either layer having to know what it is sitting on. The art's
   brightest pixels (lamp cores, window bays) sit around luminance 234, so the
   dash has to clear that: #FFF3D8 is 244 and warm. */
export const PATH_INK = '#241409';
export const PATH_RIM = '#F6EAD3';
export const PATH_DASH = '#FFF3D8';
export const PATH_SCRIM = '#150C06';

/* stroke widths at board scale; smaller boards pass a `scale` */
export const W_SCRIM = 34, W_RIM = 21, W_INK = 15, W_DASH = 6.5;
export const W_GLOW = 26, W_LIT = 13, W_CORE = 4.4;
export const DASH_ON = '13 9', FLOW = '5 16';

export const PATH_LIT = '#C64BE8';
export const PATH_GLOW = '#F06BFF';
export const PATH_CORE = '#FFEFFF';
