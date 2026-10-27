import { useMediaQuery } from '../../../hooks/useMediaQuery';

/** Wide enough for the desktop layouts (1m, 1n). */
export const WIDE = '(min-width: 1024px)';
export const useWide = () => useMediaQuery(WIDE);
/** A touch phone held upright: a big sky's first message suggests turning it. */
export const UPRIGHT_PHONE = '(orientation: portrait) and (pointer: coarse) and (max-width: 1023px)';
