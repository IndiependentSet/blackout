import { CHAPTERS, chapterName, chapterProgress, unlockedUpTo, type CampaignClears, type Chapter } from '../../domain/campaign';
import { Panel, cx } from '../../ui';
import styles from './Campaign.module.css';

interface Props {
  clears: CampaignClears;
  onOpenLevel: (levelNo: number) => void;
}

const starGlyphs = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);

function Levels({ ch, clears, unlocked, onOpenLevel }: { ch: Chapter; clears: CampaignClears; unlocked: number } & Pick<Props, 'onOpenLevel'>) {
  return (
    <div className={styles.levels}>
      {Array.from({ length: ch.to - ch.from + 1 }, (_, i) => ch.from + i).map(n => {
        const clear = clears.get(n);
        const locked = n > unlocked;
        const label = locked ? `level ${n}, locked` : clear ? `level ${n}, ${clear.campaignStars} of 3 stars` : `level ${n}`;
        return (
          <button key={n} type="button" className={cx(styles.level, clear && styles.cleared, !clear && !locked && styles.next)}
            disabled={locked} aria-label={label} onClick={() => onOpenLevel(n)}>
            <span aria-hidden="true">{n}</span>
            {!locked && <span className={styles.stars} aria-hidden="true">{starGlyphs(clear ? clear.campaignStars : 0)}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* The seven chapters and their levels: a level opens when the one before it is cleared, a chapter when the last of the previous one is. */
export function ChapterList({ clears, onOpenLevel }: Props) {
  const unlocked = unlockedUpTo(clears);
  return (
    <div className={styles.chapters}>
      {CHAPTERS.map(ch => {
        const p = chapterProgress(clears, ch);
        const shut = ch.from > unlocked;
        return (
          <div key={ch.index} className={cx(styles.chapter, shut && styles.chapterShut)}>
            <Panel tab={`CHAPTER ${ch.index + 1} · ${chapterName(ch)}`}>
              <div className={styles.head}>
                <span className={styles.progress}>{p.cleared}/{p.total} CLEARED · {p.stars}/{p.maxStars} ★</span>
                {shut && <span className={styles.shut}>LOCKED · CLEAR CHAPTER {ch.index} FIRST</span>}
              </div>
              <Levels ch={ch} clears={clears} unlocked={unlocked} onOpenLevel={onOpenLevel} />
            </Panel>
          </div>
        );
      })}
    </div>
  );
}
