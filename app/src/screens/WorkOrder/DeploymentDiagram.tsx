import { BREEDS } from '../../assets/cats';
import { THINGS } from '../../assets/things';
import { CAT_D, CAT_FOOT, CAT_TOP, PawStencil, THING_D, THING_FOOT, THING_TOP } from '../../sprites';

/* the work-order diagram uses the same sticker art as the game board, not a
   hand-drawn stand-in, so the "how it works" illustration matches play */
const CAT = BREEDS.find(b => b.name === 'TROUBLE') || BREEDS[0];
const THING = THINGS.find(t => t.name === 'mug') || THINGS[0];
const LABEL = { fontFamily: 'Luckiest Guy, cursive', fontSize: 13, letterSpacing: 2 } as const;

/** Empty pad → cat on it → fixture in pieces. */
export function DeploymentDiagram() {
  return (
    <svg viewBox="0 0 300 210" width="100%" aria-label="how a deployment works" style={{ display: 'block' }}>
      <text x={14} y={22} {...LABEL} fill="#FFD469">EMPTY PAD</text>
      <text x={176} y={22} {...LABEL} fill="#F06BFF">CAT ON IT</text>

      <g transform="translate(62 110)">
        <ellipse cx={0} cy={20} rx={28} ry={9} fill="#000" opacity={.3} />
        <circle cx={0} cy={8} r={26} fill="rgba(0,0,0,.35)" stroke="#FFD469" strokeWidth={3} strokeDasharray="9 8" opacity={.85} />
        <PawStencil fill="#FFD469" opacity={.6} transform="translate(0 8) scale(1.25)" />
      </g>

      <g transform="translate(126 116)">
        <path d="M -10 0 L 22 0" stroke="#2A1524" strokeWidth={9} strokeLinecap="round" />
        <path d="M -10 0 L 22 0" stroke="#FFF6E4" strokeWidth={4} strokeLinecap="round" />
        <path d="M 14 -9 L 26 0 L 14 9 Z" fill="#FFF6E4" stroke="#2A1524" strokeWidth={2.4} strokeLinejoin="round" />
      </g>

      <g transform="translate(228 118)">
        <ellipse cx={0} cy={CAT_FOOT + 8} rx={26} ry={8} fill="#000" opacity={.3} />
        <circle cx={0} cy={10} r={26} fill="#F06BFF" opacity={.18} />
        <ellipse cx={0} cy={CAT_FOOT + 6} rx={22} ry={7} fill="none" stroke="#F06BFF" strokeWidth={3.4} />
        <image href={CAT.wakeA} x={-CAT_D / 2} y={CAT_TOP} width={CAT_D} height={CAT_D}>
          <title>{CAT.name} — on site</title>
        </image>
      </g>

      <g transform="translate(228 180)">
        <ellipse cx={0} cy={THING_FOOT + 2} rx={16} ry={5} fill="#000" opacity={.3} />
        <image href={THING.broken} x={-THING_D / 2} y={THING_TOP} width={THING_D} height={THING_D}>
          <title>{THING.label} — smashed</title>
        </image>
        <circle cx={-16} cy={0} r={2.6} fill="#FFE9C4" opacity={.8} />
        <circle cx={15} cy={-3} r={2.2} fill="#FFE9C4" opacity={.6} />
      </g>
    </svg>
  );
}
