import { useEffect, useState } from 'react';
import { chapterSize, type Chapter } from '../../domain/campaign';
import type { Level } from '../../domain/types';
import { levelSource } from '../../services/levels';
import type { LevelSource } from '../../services/levels';
import { logger } from '../../services/logger';

interface Loaded { chapter: number; levels: (Level | null)[] }

/* Every level of a chapter, `null` until the source has answered for it. Each
   request is its own; an answer that lands after the chapter has changed or
   the screen has gone is dropped. */
export function useChapterLevels(chapter: Chapter, source: LevelSource = levelSource): (Level | null)[] {
  const [loaded, setLoaded] = useState<Loaded>({ chapter: -1, levels: [] });

  useEffect(() => {
    let live = true;
    const size = chapterSize(chapter);
    for (let i = 0; i < size; i++) {
      source.getLevel({ mode: 'campaign', levelNo: chapter.from + i }).then(r => {
        if (!live) return;
        if (!r.ok) return logger.error('campaign level ' + (chapter.from + i), r.error);
        setLoaded(prev => {
          const levels = prev.chapter === chapter.index ? prev.levels.slice() : Array<Level | null>(size).fill(null);
          levels[i] = r.data;
          return { chapter: chapter.index, levels };
        });
      });
    }
    return () => { live = false; };
  }, [chapter, source]);

  return loaded.chapter === chapter.index ? loaded.levels : Array(chapterSize(chapter)).fill(null);
}
