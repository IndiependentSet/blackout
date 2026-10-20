import { SpriteDefs } from '../../sprites';

/* Everything the board's SVG refers to by id: one floor pattern per room
   material (all world-anchored, so they stay put under the camera instead of
   swimming), the pool of light every room gets, and the void outside the house. */
export function BoardDefs() {
  return (
    <defs>
      <pattern id="cc-planks" width={96} height={430} patternUnits="userSpaceOnUse" patternTransform="rotate(6)">
        <rect width={96} height={430} fill="#6B4730" />
        <rect x={46} width={2} height={430} fill="#5A3A24" />
        <rect x={48} width={46} height={430} fill="#6E4A32" />
        <rect x={94} width={2} height={430} fill="#563623" />
        <rect y={150} width={46} height={2} fill="#553622" opacity={.75} />
        <rect x={48} y={318} width={46} height={2} fill="#553622" opacity={.75} />
        <rect x={20} width={7} height={430} fill="#71503A" opacity={.5} />
        <rect x={66} width={5} height={430} fill="#654327" opacity={.5} />
      </pattern>
      {/* objectBoundingBox by default, so this one def gives every room its
          own pool of light and its own dark corners */}
      <radialGradient id="cc-pool" cx="50%" cy="42%" r="66%">
        <stop offset="0%" stopColor="#FFD9A0" stopOpacity={.20} />
        <stop offset="55%" stopColor="#FFB870" stopOpacity={.07} />
        <stop offset="100%" stopColor="#1A0E06" stopOpacity={.30} />
      </radialGradient>
      <SpriteDefs />
      <pattern id="cc-tile" width={52} height={52} patternUnits="userSpaceOnUse">
        <rect width={52} height={52} fill="#8C7B63" />
        <rect width={25} height={25} fill="#9C8B71" />
        <rect x={27} y={27} width={25} height={25} fill="#9C8B71" />
      </pattern>
      <pattern id="cc-checker" width={44} height={44} patternUnits="userSpaceOnUse">
        <rect width={44} height={44} fill="#7E8A92" />
        <rect width={21} height={21} fill="#93A0A8" />
        <rect x={23} y={23} width={21} height={21} fill="#93A0A8" />
      </pattern>
      <pattern id="cc-carpet" width={26} height={26} patternUnits="userSpaceOnUse">
        <rect width={26} height={26} fill="#6E5348" />
        <circle cx={7} cy={7} r={2.2} fill="#7A5C50" />
        <circle cx={19} cy={17} r={2.2} fill="#7A5C50" />
        <circle cx={13} cy={23} r={1.6} fill="#654A40" />
      </pattern>
      <pattern id="cc-concrete" width={38} height={38} patternUnits="userSpaceOnUse">
        <rect width={38} height={38} fill="#5E5147" />
        <circle cx={9} cy={12} r={1.8} fill="#6A5C51" />
        <circle cx={28} cy={26} r={2.2} fill="#544840" />
        <circle cx={20} cy={6} r={1.4} fill="#6A5C51" />
      </pattern>
      <radialGradient id="cc-void" cx="50%" cy="45%" r="70%">
        <stop offset="0%" stopColor="#241531" />
        <stop offset="100%" stopColor="#120A18" />
      </radialGradient>
    </defs>
  );
}
