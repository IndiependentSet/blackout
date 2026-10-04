/** SVG defs the sprites refer to. Render once inside any <svg> that draws sprites. */
export function SpriteDefs() {
  return (
    <radialGradient id="cc-contact">
      <stop offset="0%" stopColor="#12060B" stopOpacity={.62} />
      <stop offset="60%" stopColor="#12060B" stopOpacity={.34} />
      <stop offset="100%" stopColor="#12060B" stopOpacity={0} />
    </radialGradient>
  );
}

export const CONTACT_SHADOW = 'url(#cc-contact)';
