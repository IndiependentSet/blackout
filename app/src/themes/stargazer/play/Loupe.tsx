import type { CSSProperties } from 'react';
import { LOUPE_PX, LOUPE_ZOOM, loupePlacement, loupeViewBox, type Pt } from './loupe';
import { Reticle } from './Reticle';
import type { Box } from './sky';
import type { Touch } from './useLoupe';
import styles from './Loupe.module.css';

interface Props {
  /** the board's drawing, shown again through `<use>` rather than drawn twice */
  artId: string;
  touch: Touch;
  /** the star lifting the finger would light, if any */
  pick: Pt | null;
  /** the stars' scale and px per world unit on the board */
  scale: number;
  ppu: number;
  board: Box;
}

/** The eyepiece over a held finger: the sky around it magnified, the star it would light ringed. Drawing only. */
export function Loupe({ artId, touch, pick, scale, ppu, board }: Props) {
  const at = loupePlacement(touch.finger, board);
  /* the ring sits just round the star's glow; its line is 2px in the loupe, whatever the zoom */
  const px = 1 / (ppu * LOUPE_ZOOM);
  const place: CSSProperties = { left: at.x, top: at.y, width: LOUPE_PX, height: LOUPE_PX };
  return (
    <div className={styles.loupe} style={place} aria-hidden="true">
      <svg className={styles.view} viewBox={loupeViewBox(touch.world, ppu)}>
        <use href={'#' + artId} />
        {pick && <circle className={styles.pick} cx={pick.x} cy={pick.y} r={16 * scale} strokeWidth={2 * px} />}
      </svg>
      <Reticle className={styles.reticle} />
    </div>
  );
}
