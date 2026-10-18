import type { Breed } from '../assets/cats';
import type { AccessoryArt } from '../domain/types';
import { CAT_D, CAT_FOOT, CAT_TOP } from './geometry';

/** A cat out causing chaos: two sticker poses flipped back and forth while it pounces. */
export function CatFlipbook({ breed, title, pounceDelay = 0, frameDelay = 0, accessory }: {
  breed: Breed; title?: string; pounceDelay?: number; frameDelay?: number;
  /** what the cat wears: one image per slot and frame, drawn over the cat and flipped in step with it */
  accessory?: AccessoryArt;
}) {
  const origin = `0px ${CAT_FOOT}px`;
  return (
    <g style={{ animation: `cc-pounce .7s ${pounceDelay}s ease-in-out infinite`, transformOrigin: origin }}>
      <image href={breed.wakeA} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D} opacity={0}
        style={{ animation: `cc-frame-a .7s ${frameDelay}s steps(1, end) infinite` }}>
        {title && <title>{title}</title>}
      </image>
      {accessory?.wakeA.map((href, i) => (
        <image key={'a' + i} href={href} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D} opacity={0}
          style={{ animation: `cc-frame-a .7s ${frameDelay}s steps(1, end) infinite` }} />
      ))}
      <image href={breed.wakeB} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D} opacity={0}
        style={{ animation: `cc-frame-b .7s ${frameDelay}s steps(1, end) infinite` }} />
      {accessory?.wakeB.map((href, i) => (
        <image key={'b' + i} href={href} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D} opacity={0}
          style={{ animation: `cc-frame-b .7s ${frameDelay}s steps(1, end) infinite` }} />
      ))}
    </g>
  );
}
