import { useState } from 'react';
import type { Level } from '../../domain/types';
import { Board } from '../../game/components/Board';

/** The level on the real board, to feel how it plays. The cats placed are
    owned by the screen, so they carry over to and from the schematic. */
export function PlayPreview({ level, placed, onTapNode }: {
  level: Level; placed: number[]; onTapNode?: (node: number) => void;
}) {
  const [dim, setDim] = useState(false);
  return (
    <Board level={level} siteIdx={0} placed={placed} hint={null} focus={-1} kbd={false} dim={dim} expanded={false}
      onTapNode={onTapNode ?? (() => {})} onToggleExpand={() => {}} onToggleDim={() => setDim(d => !d)} />
  );
}
