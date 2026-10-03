import { BREEDS } from '../../../assets/cats';
import { CatFlipbook, CAT_FOOT, CONTACT_SHADOW, SpriteDefs } from '../../../sprites';
import { thing } from '../lookup';
import { MiniThing } from '../MiniBoard';
import { Floor } from '../primitives';
import styles from '../Demos.module.css';

const ITEMS = ['vase', 'lamp', 'fishbowl', 'mug', 'clock', 'plant'];
const LABEL = { fontFamily: 'Luckiest Guy, cursive', fontSize: 12, letterSpacing: 2 } as const;

/** Meet the crew, and the client's belongings. */
export function CrewDemo() {
  return (
    <Floor>
      <svg viewBox="0 0 330 150" width="100%" role="img" aria-label="the crew, and the client's belongings" className={styles.svg}>
        <defs><SpriteDefs /></defs>
        <text x={8} y={16} {...LABEL} fill="#F06BFF">THE CREW</text>
        {BREEDS.map((b, i) => (
          <g key={b.name} transform={`translate(${30 + i * 54} 48)`}>
            <ellipse cx={0} cy={CAT_FOOT + 2} rx={20} ry={6} fill={CONTACT_SHADOW} />
            <CatFlipbook breed={b} pounceDelay={-i * 0.13} frameDelay={-i * 0.2} />
          </g>
        ))}
        <text x={8} y={94} {...LABEL} fill="#FFD469">THE CLIENT’S STUFF</text>
        {ITEMS.map((n, i) => <MiniThing key={n} i={i} t={thing(n)} smashed={false} x={30 + i * 54} y={128} />)}
      </svg>
    </Floor>
  );
}
