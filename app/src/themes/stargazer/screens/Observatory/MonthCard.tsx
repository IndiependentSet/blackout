import type { CSSProperties } from 'react';
import type { Night } from '../../../../domain/types';
import { Moon } from '../../kit/Moon';
import { cx } from '../../kit/cx';
import { monthOf, WEEK_LETTERS } from '../../copy';
import styles from './MonthCard.module.css';

const LEGEND: { label: string; night: Night | undefined }[] = [
  { label: 'Perfect night', night: { day: 0, charted: 7, perfect: 7 } },
  { label: 'Some at par', night: { day: 0, charted: 7, perfect: 3 } },
  { label: 'Not played', night: undefined },
];

/** This month as moons, Monday first, with day 1 under its real weekday. `wide` is the desktop's larger card; `fill`
    takes the height a phone page has left, the moons sized to it, so the page never scrolls. */
export function MonthCard({ today, month, wide = false, fill = false }: { today: number; month: Night[]; wide?: boolean; fill?: boolean }) {
  const m = monthOf(today);
  const weeks = Math.ceil((m.lead + m.days.length) / 7);
  const played = month.filter(n => n.charted > 0 && n.day >= m.days[0] && n.day <= today).length;
  const soFar = today - m.days[0] + 1;
  return (
    <section className={cx(styles.card, wide && styles.wide, fill && styles.fill)}>
      <div className={styles.head}>
        <h2 className={styles.title}>{m.name}</h2>
        <span className={styles.summary}>{played} of {soFar} nights played</span>
      </div>
      <div className={styles.moons} style={{ '--weeks': weeks } as CSSProperties}>
        <div className={styles.grid}>
          {WEEK_LETTERS.map((l, i) => <span key={i} className={styles.letter} aria-hidden="true">{l}</span>)}
          {Array.from({ length: m.lead }, (_, i) => <span key={'blank' + i} aria-hidden="true" />)}
          {m.days.map((d, i) => <Moon key={d} night={month.find(n => n.day === d)} size={wide ? 56 : 28} today={d === today} future={d > today} day={i + 1} />)}
        </div>
      </div>
      <ul className={styles.legend} aria-label="What the moons mean">
        {LEGEND.map(l => <li key={l.label}><Moon night={l.night} size={16} /><span>{l.label}</span></li>)}
      </ul>
    </section>
  );
}
