import type { Thing } from '../assets/things';
import { THING_D, THING_FOOT, THING_TOP } from './geometry';
import { CONTACT_SHADOW } from './SpriteDefs';
import { PATH_RIM } from './theme';

/* a surveyor's mark around a fixture: four corner ticks, so a target can never
   be read as one of the room's own drawn lamps or books */
const MARK = 'M -26 -24 L -26 -30 L -20 -30 M 20 -30 L 26 -30 L 26 -24'
  + ' M 26 10 L 26 16 L 20 16 M -20 16 L -26 16 L -26 10';

const POSES = ['idle', 'wobble', 'hit', 'broken'] as const;

interface Props {
  thing: Thing;
  /** a cat has got to it */
  smashed: boolean;
  /** which smashable this is on its board, to stagger the teeter */
  index: number;
  /** draw the surveyor's bracket around it */
  marked?: boolean;
  shadow?: string;
}

/* A smashable at the origin of its own coordinate space. Untouched, it
   teeters; smashed, it plays idle -> wobble -> hit -> broken once and holds
   the wreckage. */
export function ThingSprite({ thing, smashed, index, marked = true, shadow = CONTACT_SHADOW }: Props) {
  const body = smashed
    ? 'cc-tumble .5s ease-out forwards'
    : `cc-teeter 4.2s ease-in-out ${(-0.7 * (index % 6)).toFixed(1)}s infinite`;
  return (
    <>
      <ellipse cx={0} cy={11} rx={19} ry={7} fill={shadow} />
      {marked && (
        <path d={MARK} fill="none" stroke={PATH_RIM} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round"
          opacity={smashed ? 0 : 0.72} style={{ transition: 'opacity 320ms ease-out' }} />
      )}
      <g style={{ animation: body, transformOrigin: `0px ${THING_FOOT}px` }}>
        {POSES.map((pose, k) => (
          <image key={pose} href={thing[pose]} x={-THING_D / 2} y={THING_TOP} width={THING_D} height={THING_D}
            opacity={k === 0 && !smashed ? 1 : 0}
            style={{ animation: smashed ? `cc-break-${k} .5s steps(1, end) forwards` : 'none' }}>
            {k === 0 && <title>{thing.label}</title>}
          </image>
        ))}
      </g>
      <g opacity={smashed ? 1 : 0}>
        <circle cx={-13} cy={6} r={2.6} fill="#FFE9C4" style={{ animation: 'cc-dust 1.4s ease-out infinite' }} />
        <circle cx={12} cy={4} r={2.2} fill="#FFE9C4" style={{ animation: 'cc-dust 1.4s .5s ease-out infinite' }} />
        <path d="M 0 -18 l 2 4 l 4 1 l -4 1.6 l -2 4 l -2 -4 l -4 -1.6 l 4 -1 Z" fill="#FFEFAF"
          style={{ animation: 'cc-spark 1.1s ease-in-out infinite' }} />
      </g>
    </>
  );
}
