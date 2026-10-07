import type { Breed } from '../assets/cats';
import type { AccessoryArt } from '../domain/types';
import { CatFlipbook } from './CatFlipbook';
import { CAT_FOOT } from './geometry';
import { PawStencil } from './PawStencil';
import { CONTACT_SHADOW } from './SpriteDefs';

const FADE = 'opacity 160ms ease-out';

interface Props {
  breed: Breed;
  /** a cat has been hired onto this pad */
  hired: boolean;
  /** a hint is pointing here */
  pulsing?: boolean;
  /** keyboard focus is here */
  focused?: boolean;
  /** id of the circle the hire "bloom" animation targets */
  bloomId?: string;
  /** fill for the shadow under the pad */
  shadow?: string;
  /** what the hired cat wears */
  accessory?: AccessoryArt;
}

/* A deployment pad at the origin of its own coordinate space: a slowly-turning
   dashed ring with a paw stencil while empty, which fades out under the cat
   that drops onto it. The caller positions and scales it. */
export function PadSprite({ breed, hired, pulsing, focused, bloomId, shadow = CONTACT_SHADOW, accessory }: Props) {
  const emptyO = hired ? 0 : 0.9;
  return (
    <>
      <circle cx={0} cy={-8} r={26} fill="none" stroke="#FFD469" strokeWidth={3} opacity={pulsing ? 1 : 0}
        style={{ animation: pulsing ? 'cc-pulse 1.15s ease-in-out infinite' : 'none' }} />
      <ellipse cx={0} cy={CAT_FOOT} rx={25} ry={9} fill={shadow} />
      <circle cx={0} cy={4} r={23.5} fill="none" stroke="#1A0E06" strokeWidth={4.5} opacity={emptyO} style={{ transition: FADE }} />
      <circle cx={0} cy={4} r={20} fill="rgba(10,5,3,.62)" stroke="#FFD469" strokeWidth={3.4} strokeDasharray="9 8"
        opacity={emptyO}
        style={{ animation: hired ? 'none' : 'cc-slotspin 3.6s linear infinite', transformOrigin: '0px 4px', transition: FADE }} />
      <PawStencil opacity={emptyO} transform="translate(0 4)" style={{ transition: FADE }} />

      <circle cx={0} cy={-2} r={27} fill="#F06BFF" opacity={hired ? 0.2 : 0}
        style={{ animation: hired ? 'cc-glow 1.8s ease-in-out infinite' : 'none' }} />
      <ellipse cx={0} cy={17} rx={22} ry={7} fill="none" stroke="#F06BFF" strokeWidth={3.5} opacity={hired ? 1 : 0} />
      {bloomId && <circle id={bloomId} cx={0} cy={0} r={8} fill="none" stroke="#FFEFFF" strokeWidth={3} opacity={0} />}

      {hired && (
        <g style={{ animation: 'cc-drop 480ms cubic-bezier(.2,1.2,.3,1) both', transformOrigin: `0px ${CAT_FOOT}px` }}>
          <CatFlipbook breed={breed} title={breed.name + ' — on site'} accessory={accessory} />
        </g>
      )}
      <g opacity={hired ? 1 : 0}>
        <path d="M -26 -18 l 3.6 1.4 l 1.4 3.6 l 1.4 -3.6 l 3.6 -1.4 l -3.6 -1.4 l -1.4 -3.6 l -1.4 3.6 Z" fill="#FFD469"
          style={{ animation: 'cc-spark 1.2s ease-in-out infinite' }} />
        <path d="M 19 -30 l 3 1.2 l 1.2 3 l 1.2 -3 l 3 -1.2 l -3 -1.2 l -1.2 -3 l -1.2 3 Z" fill="#F06BFF"
          style={{ animation: 'cc-spark 1.5s .3s ease-in-out infinite' }} />
      </g>
      <rect x={-29} y={-34} width={58} height={56} rx={15} fill="none" stroke="#FFD469" strokeWidth={3} strokeDasharray="7 6"
        opacity={focused ? 0.9 : 0} />
    </>
  );
}
