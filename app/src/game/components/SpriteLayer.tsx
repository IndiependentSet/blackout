import { memo } from 'react';
import { PadSprite, ThingSprite } from '../../sprites';
import { bloomId } from '../fx';
import type { SpriteItem } from '../scene/buildScene';

/* Cats and smashables share one depth-sorted pass, so whoever stands in front
   overlaps whoever stands behind. */
export const SpriteLayer = memo(function SpriteLayer({ sprites }: { sprites: SpriteItem[] }) {
  return (
    <>
      {sprites.map(s => (
        <g key={s.key} transform={`translate(${s.x} ${s.y}) scale(${s.scale})`}>
          {s.kind === 'thing'
            ? <ThingSprite thing={s.thing} smashed={s.smashed} index={s.index} />
            : <PadSprite breed={s.breed} hired={s.hired} pulsing={s.pulsing} focused={s.focused} bloomId={bloomId(s.node)} accessory={s.accessory} />}
        </g>
      ))}
    </>
  );
});
