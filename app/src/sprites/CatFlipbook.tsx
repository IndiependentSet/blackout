import type { Breed } from '../assets/cats';
import { CAT_D, CAT_FOOT, CAT_TOP } from './geometry';

/** A cat out causing chaos: two sticker poses flipped back and forth while it pounces. */
export function CatFlipbook({ breed, title, pounceDelay = 0, frameDelay = 0 }: {
  breed: Breed; title?: string; pounceDelay?: number; frameDelay?: number;
}) {
  const origin = `0px ${CAT_FOOT}px`;
  return (
    <g style={{ animation: `cc-pounce .7s ${pounceDelay}s ease-in-out infinite`, transformOrigin: origin }}>
      <image href={breed.wakeA} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D} opacity={0}
        style={{ animation: `cc-frame-a .7s ${frameDelay}s steps(1, end) infinite` }}>
        {title && <title>{title}</title>}
      </image>
      <image href={breed.wakeB} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D} opacity={0}
        style={{ animation: `cc-frame-b .7s ${frameDelay}s steps(1, end) infinite` }} />
    </g>
  );
}
