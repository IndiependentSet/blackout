import type { KeyboardEvent } from 'react';
import type { Recipe } from '../../domain/generation';
import { cx } from '../../themes/stargazer/kit/cx';
import { Info } from '../Playground/Info';
import { tierLevels, type PoolEditor, type PoolTab } from './poolEditor';
import { barHeights, recipeBands } from './strip';
import pg from '../Playground/Playground.module.css';
import styles from './LevelPools.module.css';

const levelsLabel = (first: number, last: number) => (first === last ? `level ${first}` : `levels ${first}–${last}`);

/** The whole curve at a glance: a bar per tier (as wide as its levels, as tall as its size, coloured by difficulty),
    and under it which recipe each stretch matches. Picking a bar opens that tier in the settings panel. */
export function TierStrip({ state, recipes, onTab }: { state: PoolEditor; recipes: readonly Recipe[]; onTab: (tab: PoolTab) => void }) {
  const { curve, tab } = state;
  const heights = barHeights(curve.tiers);
  const bands = recipeBands(curve.tiers, recipes);
  const last = curve.tiers.length - 1;
  const first = tierLevels(state, 0).first, end = tierLevels(state, last).last;

  /* one tab stop for the whole strip; the arrow keys walk it */
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = typeof tab === 'number' ? tab : last;
    const to = e.key === 'ArrowRight' ? at + 1 : e.key === 'ArrowLeft' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (to === null) return;
    e.preventDefault();
    const next = Math.min(last, Math.max(0, to));
    onTab(next);
    e.currentTarget.querySelectorAll('button')[next]?.focus();
  };

  return (
    <div className={pg.panel}>
      <section>
        <h3>The curve <Info k="tierStrip" /></h3>
        <div className={styles.bars} role="group" aria-label="tiers" onKeyDown={onKey}>
          {curve.tiers.map((t, i) => {
            const { first: a, last: b } = tierLevels(state, i);
            return (
              <button key={i} type="button" tabIndex={i === (typeof tab === 'number' ? tab : 0) ? 0 : -1}
                className={cx(styles.bar, i === tab && styles.barOn, state.scope === 'all' && typeof tab === 'number' && styles.barAll, t.manual && styles.barManual)} style={{ flexGrow: t.count }}
                aria-pressed={i === tab} aria-label={t.manual ? `Tier ${i + 1}, ${levelsLabel(a, b)}, hand-drawn` : `Tier ${i + 1}, ${levelsLabel(a, b)}, ${t.size} stars, ${t.diff} of 3`}
                title={t.manual ? `Tier ${i + 1} · ${levelsLabel(a, b)} · hand-drawn` : `Tier ${i + 1} · ${levelsLabel(a, b)} · ${t.size} stars · ${'★'.repeat(t.diff)}`} onClick={() => onTab(i)}>
                <i className={styles['diff' + t.diff]} style={{ height: `${heights[i] * 100}%` }} />
              </button>
            );
          })}
        </div>
        <div className={styles.bands} aria-hidden="true">
          {bands.map(b => (
            <span key={b.from} className={cx(styles.band, b.name === null && styles.bandCustom)} style={{ flexGrow: b.levels }}
              title={`${b.name ?? 'Custom shape'} · tiers ${b.from + 1}–${b.to + 1}`}>{b.name ?? 'custom'}</span>
          ))}
        </div>
        <div className={styles.axis}>
          <span>{state.mode === 'campaign' ? 'level' : 'slot'} {first}</span>
          <span className={styles.legend}><i className={styles.diff1} />★ <i className={styles.diff2} />★★ <i className={styles.diff3} />★★★ <i className={styles.legendManual} />hand-drawn</span>
          <span>{end}</span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={cx(styles.chip, tab === 'fallback' && styles.chipOn)} aria-pressed={tab === 'fallback'}
            onClick={() => onTab('fallback')}>Fallback</button>
          <span className={styles.basis}>{curve.tiers.length} tier{curve.tiers.length === 1 ? '' : 's'} · the fallback is what a level settles for when every retry fails</span>
        </div>
      </section>
    </div>
  );
}
