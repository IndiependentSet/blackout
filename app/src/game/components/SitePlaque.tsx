import type { Level, SiteResult } from '../../domain/types';
import { GradeBadge, Tag } from '../../ui';
import styles from './SitePlaque.module.css';

/** The plaque above the board: which site, its difficulty, and your best run on it. */
export function SitePlaque({ siteNo, level, name, best }: {
  siteNo: number; level: Level | null; name: string; best: SiteResult | null | undefined;
}) {
  return (
    <div className={styles.wrap}>
      <Tag size="lg" className={styles.tag}>SITE {siteNo} <span className={styles.stars}>{level ? '✦'.repeat(level.stars) : ''}</span></Tag>
      <div className={styles.plaque}>
        <div className={styles.name}>{level ? name : 'DISPATCHING CREW…'}</div>
        {best && (
          <div className={styles.best}>
            <GradeBadge grade={best.grade} />
            <span className={styles.score}>{best.score.toLocaleString()} PTS</span>
            <span className={styles.note}>BEST RUN · {best.used}/{best.par} CATS</span>
          </div>
        )}
      </div>
    </div>
  );
}
