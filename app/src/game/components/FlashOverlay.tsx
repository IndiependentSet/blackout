import { FLASH_ID } from '../fx';

/** A full-screen white-pink wash; `flashScreen()` fades it out when a site is cleared. */
export function FlashOverlay() {
  return <div id={FLASH_ID} style={{ position: 'fixed', inset: 0, background: '#FFE9FF', opacity: 0, pointerEvents: 'none', zIndex: 30 }} />;
}
