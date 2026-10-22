import type { ReactNode } from 'react';
import type { AvatarIconId } from '../../../domain/avatar';
import styles from './kit.module.css';

/* The drawn avatars: small cartoon faces and things from the night sky on a 48×48 board, painted only with the
   theme's own tokens (the `art*` classes in kit.module.css). */

const Face = ({ x = 24, y = 24, ink = 'artInk' }: { x?: number; y?: number; ink?: string }) => (
  <g>
    <circle cx={x - 4.5} cy={y} r="1.7" className={styles[ink]} />
    <circle cx={x + 4.5} cy={y} r="1.7" className={styles[ink]} />
    <path d={`M${x - 3} ${y + 4}q3 3 6 0`} className={styles.artSmile} />
  </g>
);

const ART: Record<AvatarIconId, { bg: string; body: ReactNode }> = {
  moon: { bg: 'artBgNight2', body: (
    <>
      <circle cx="24" cy="25" r="14" className={styles.artMoon} />
      <circle cx="31" cy="19" r="3" className={styles.artMoonShade} />
      <circle cx="31" cy="32" r="2" className={styles.artMoonShade} />
      <Face y={25} />
      <path d="m10 10 1.3 3 3 1.3-3 1.3L10 18.6l-1.3-3-3-1.3 3-1.3z" className={styles.artGold} />
    </>
  ) },
  sun: { bg: 'artBgDusk', body: (
    <>
      <g className={styles.artRays}>
        {Array.from({ length: 8 }, (_, i) => <path key={i} d="M24 6v6" transform={`rotate(${i * 45} 24 24)`} />)}
      </g>
      <circle cx="24" cy="24" r="11" className={styles.artGold} />
      <Face />
    </>
  ) },
  comet: { bg: 'artBgNight1', body: (
    <>
      <path d="M34 14 8 36c-2 2 0 4 3 3l22-12z" className={styles.artMintSoft} />
      <path d="M33 17 14 33" className={styles.artTrail} />
      <circle cx="31" cy="19" r="9" className={styles.artCream} />
      <Face x={31} y={18} />
    </>
  ) },
  saturn: { bg: 'artBgNight2', body: (
    <>
      <circle cx="24" cy="24" r="11" className={styles.artSaturn} />
      <Face />
      <ellipse cx="24" cy="26" rx="19" ry="5.5" transform="rotate(-18 24 26)" className={styles.artRing} />
    </>
  ) },
  rocket: { bg: 'artBgDusk', body: (
    <>
      <path d="M24 5c7 5 9 13 8 24H16C15 18 17 10 24 5z" className={styles.artCream} />
      <path d="M16 22 9 31l7-1zM32 22l7 9-7-1z" className={styles.artMars} />
      <circle cx="24" cy="19" r="4" className={styles.artNeptune} />
      <path d="M20 31h8l-4 11z" className={styles.artGold} />
    </>
  ) },
  astronaut: { bg: 'artBgNight1', body: (
    <>
      <path d="M8 44c1-8 7-12 16-12s15 4 16 12z" className={styles.artSoft} />
      <circle cx="24" cy="21" r="14" className={styles.artCream} />
      <rect x="13" y="14" width="22" height="15" rx="7.5" className={styles.artVisor} />
      <path d="M17 18q3-2 6-1" className={styles.artShine} />
      <Face y={23} ink="artMintInk" />
    </>
  ) },
  alien: { bg: 'artBgDuel', body: (
    <>
      <path d="M24 12V7" className={styles.artStem} />
      <circle cx="24" cy="6" r="2.5" className={styles.artMint} />
      <path d="M24 10c11 0 15 9 13 16-2 7-8 12-13 12s-11-5-13-12c-2-7 2-16 13-16z" className={styles.artMint} />
      <path d="M13 22q4-3 7 3-4 4-7-3zM35 22q-4-3-7 3 4 4 7-3z" className={styles.artInk} />
      <path d="M21 33q3 2 6 0" className={styles.artSmile} />
    </>
  ) },
  star: { bg: 'artBgNight3', body: (
    <>
      <path d="m24 5 5.2 11 12 1.6-8.8 8.3 2.2 11.9L24 31.9 13.4 37.8l2.2-11.9L6.8 17.6 18.8 16z" className={styles.artGold} />
      <Face y={22} />
    </>
  ) },
  ufo: { bg: 'artBgNight1', body: (
    <>
      <path d="M17 26a7 7 0 0 1 14 0z" className={styles.artMintSoft} />
      <ellipse cx="24" cy="27" rx="16" ry="5.5" className={styles.artSoft} />
      <circle cx="14" cy="27.5" r="1.6" className={styles.artGold} />
      <circle cx="24" cy="29" r="1.6" className={styles.artGold} />
      <circle cx="34" cy="27.5" r="1.6" className={styles.artGold} />
      <path d="M20 33h8l4 10H16z" className={styles.artBeam} />
    </>
  ) },
  telescope: { bg: 'artBgDusk', body: (
    <>
      <path d="M24 28 15 43M24 28l9 15M24 28v15" className={styles.artLegs} />
      <g transform="rotate(-32 24 22)">
        <rect x="8" y="17" width="26" height="10" rx="3" className={styles.artGoldDim} />
        <rect x="31" y="15" width="8" height="14" rx="2" className={styles.artGold} />
        <rect x="6" y="19" width="5" height="6" rx="1.5" className={styles.artMars} />
      </g>
      <path d="m38 7 1.2 2.8L42 11l-2.8 1.2L38 15l-1.2-2.8L34 11l2.8-1.2z" className={styles.artCream} />
    </>
  ) },
  robot: { bg: 'artBgNight2', body: (
    <>
      <path d="M24 11V6" className={styles.artStem} />
      <circle cx="24" cy="5.5" r="2.5" className={styles.artMars} />
      <rect x="9" y="11" width="30" height="27" rx="8" className={styles.artSoft} />
      <rect x="14" y="18" width="7" height="7" rx="2" className={styles.artMint} />
      <rect x="27" y="18" width="7" height="7" rx="2" className={styles.artMint} />
      <path d="M17 31h14" className={styles.artGrill} />
    </>
  ) },
  cat: { bg: 'artBgDusk', body: (
    <>
      <path d="M9 22 10 6l10 7zM39 22 38 6l-10 7z" className={styles.artGold} />
      <ellipse cx="24" cy="27" rx="16" ry="14" className={styles.artGold} />
      <circle cx="18" cy="25" r="2" className={styles.artInk} />
      <circle cx="30" cy="25" r="2" className={styles.artInk} />
      <path d="m22 30 2 2 2-2z" className={styles.artMars} />
      <path d="M24 32v2m-3 1q3 2 6 0M13 30l-6-1M13 33l-6 2M35 30l6-1M35 33l6 2" className={styles.artSmile} />
      <path d="m24 14 1.5 3 3 .5-2.2 2 .6 3-2.9-1.6-2.9 1.6.6-3-2.2-2 3-.5z" className={styles.artMars} />
    </>
  ) },
};

/** One of the drawn avatars, filling the round frame it sits in. */
export function AvatarArt({ id }: { id: AvatarIconId }) {
  const { bg, body } = ART[id];
  return (
    <svg viewBox="0 0 48 48" className={styles.artSvg} aria-hidden="true">
      <rect width="48" height="48" className={styles[bg]} />
      {body}
    </svg>
  );
}
