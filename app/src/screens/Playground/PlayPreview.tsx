import type { Level } from '../../domain/types';
import { SkyBoard } from '../../themes/stargazer/play/SkyBoard';
import styles from './Playground.module.css';

const noop = () => {};

/** The level as the game draws it, to feel how it plays. The lit stars are
    owned by the screen, so they carry over to and from the schematic. */
export function PlayPreview({ level, placed, onTapNode }: {
  level: Level; placed: number[]; onTapNode?: (node: number) => void;
}) {
  return (
    <div className={styles.sky}>
      <SkyBoard level={level} placed={placed} sweep={false} ring={null} focus={null} onTapStar={onTapNode ?? noop} />
    </div>
  );
}
