import {
  DASH_ON, FLOW, PATH_CORE, PATH_DASH, PATH_GLOW, PATH_INK, PATH_LIT, PATH_RIM, PATH_SCRIM,
  W_CORE, W_DASH, W_GLOW, W_INK, W_LIT, W_RIM, W_SCRIM,
} from './theme';

interface WebProps {
  /** SVG path data; the board passes every path joined into one `d` */
  d: string;
  /** stroke-width multiplier, for boards drawn smaller than the game's */
  scale?: number;
  /** id for the rim layer, so an opening sweep can animate it */
  rimId?: string;
}

/* Four layers — scrim, cream rim, dark casing, bright dash — drawn together
   so every unlit layer of every path sits below every lit one. */
export function PathWeb({ d, scale = 1, rimId }: WebProps) {
  return (
    <g>
      <path d={d} fill="none" stroke={PATH_SCRIM} strokeWidth={W_SCRIM * scale} strokeOpacity={.24} strokeLinecap="round" />
      <path id={rimId} d={d} fill="none" stroke={PATH_RIM} strokeWidth={W_RIM * scale} strokeLinecap="round" opacity={.8} />
      <path d={d} fill="none" stroke={PATH_INK} strokeWidth={W_INK * scale} strokeLinecap="round" />
      <path d={d} fill="none" stroke={PATH_DASH} strokeWidth={W_DASH * scale} strokeLinecap="round" strokeDasharray={DASH_ON} opacity={.95} />
    </g>
  );
}

const DRAW = 'cubic-bezier(.15,.85,.25,1)';

/* The magenta that runs along a path once a cat covers it. It "draws" in from
   the covering pad by sliding the dash offset; `flip` is left to the caller,
   who orders the endpoints of `d`. */
export function PathLit({ d, on, scale = 1 }: { d: string; on: boolean; scale?: number }) {
  const off = on ? 0 : 1;
  const layer = (stroke: string, width: number, ms: number, extra?: { strokeOpacity: number }) => (
    <path d={d} pathLength="1" fill="none" stroke={stroke} strokeWidth={width * scale} strokeLinecap="round"
      strokeDasharray="1 1" strokeDashoffset={off} {...extra}
      style={{ transition: `stroke-dashoffset ${ms}ms ${DRAW}` }} />
  );
  return (
    <g>
      {layer(PATH_GLOW, W_GLOW, 500, { strokeOpacity: .22 })}
      {layer(PATH_LIT, W_LIT, 420)}
      {layer(PATH_CORE, W_CORE, 360)}
      {on && (
        <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={W_CORE * scale} strokeLinecap="round"
          strokeDasharray={FLOW} style={{ animation: 'cc-dash 800ms linear infinite' }} />
      )}
    </g>
  );
}
