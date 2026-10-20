import { useMediaQuery } from '../../../hooks/useMediaQuery';

/** Wide enough for the desktop layouts (1m, 1n). */
export const WIDE = '(min-width: 1024px)';
export const useWide = () => useMediaQuery(WIDE);
