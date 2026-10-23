import type { Dispatch, SetStateAction } from 'react';
import type { SkyFigure } from '../../domain/types';
import { Button } from '../../themes/stargazer/kit/Button';
import { cx } from '../../themes/stargazer/kit/cx';
import { FigureStatus } from '../SkyEditor/FigureStatus';
import { SkyEditor } from '../SkyEditor/SkyEditor';
import { useFigureCheck } from '../SkyEditor/useFigureCheck';
import { newDraft, openSlot, pinnedAt, type ManualDraft } from './manualDays';
import type { usePinnedSkies } from './usePinnedSkies';
import { dayLabel } from './week';
import pg from '../Playground/Playground.module.css';
import styles from './GenerationConfig.module.css';

const SKIES = [0, 1, 2, 3, 4, 5, 6];

/** Tonight's hand-drawn days: draw a sky and pin it to one site of one future day, in place of the generated one. */
export function ManualDays({ today, draft, setDraft, pinned, startFrom }: {
  today: number;
  draft: ManualDraft;
  setDraft: Dispatch<SetStateAction<ManualDraft>>;
  pinned: ReturnType<typeof usePinnedSkies>;
  /** the generated sky for the draft's day and site (the preview), to start from */
  startFrom: SkyFigure | null;
}) {
  const check = useFigureCheck(draft.figure);
  const there = pinnedAt(pinned.list, draft.day, draft.idx);
  const open = (day: number, idx: number) => {
    if (draft.dirty && !window.confirm('Drop the drawing you have not pinned?')) return;
    setDraft(openSlot(pinned.list, day, idx));
  };
  const future = draft.day > today;
  const pin = async () => {
    if (await pinned.pin(draft.day, draft.idx, draft.figure)) setDraft(d => ({ ...d, dirty: false }));
  };
  const unpin = async () => {
    if (window.confirm(`Unpin sky ${draft.idx + 1} of day ${draft.day}? It will be generated again.`) && await pinned.unpin(draft.day, draft.idx)) {
      setDraft(newDraft(draft.day, draft.idx));
    }
  };

  return (
    <div className={pg.layout}>
      <div className={styles.side}>
        <div className={pg.panel}>
          <section>
            <h3>Pinned skies</h3>
            <p className={pg.muted}>Each replaces one generated sky on its night. The daily job publishes it at 00:00 GMT that day.</p>
            {pinned.loadError && <p className={pg.warn}>{pinned.loadError}</p>}
            {!pinned.loading && !pinned.list.length && <p className={pg.muted}>Nothing pinned yet.</p>}
            <ul className={styles.pinned} aria-label="pinned skies">
              {pinned.list.map(p => (
                <li key={`${p.day}:${p.idx}`}>
                  <button type="button" className={cx(styles.pinnedRow, p.day === draft.day && p.idx === draft.idx && styles.pinnedOpen)}
                    onClick={() => open(p.day, p.idx)}>
                    <b>Day {p.day}</b> · sky {p.idx + 1} <span>{dayLabel(p.day)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <Button size="xs" kind="outline" onClick={() => open(Math.max(draft.day, today + 1), draft.idx)}>New drawing</Button>
          </section>
        </div>
      </div>
      <main className={pg.main}>
        <div className={pg.toolbar}>
          <label className={pg.toggle}>Day&nbsp;
            <input className={pg.num} type="number" min={today + 1} value={draft.day} aria-label="day"
              onChange={e => { const n = Math.round(Number(e.target.value)); if (n >= 1) setDraft(d => ({ ...d, day: n })); }} />
          </label>
          <span className={styles.basis}>{dayLabel(draft.day)}</span>
          <select value={draft.idx} aria-label="sky" onChange={e => setDraft(d => ({ ...d, idx: Number(e.target.value) }))}>
            {SKIES.map(i => <option key={i} value={i}>Sky {i + 1}{pinnedAt(pinned.list, draft.day, i) ? ' · pinned' : ''}</option>)}
          </select>
          {there && draft.dirty && <span className={pg.warn}>edited, not pinned</span>}
        </div>
        <div className={pg.stage}>
          <SkyEditor key={`${draft.day}:${draft.idx}:${there ? 'p' : 'n'}`} figure={draft.figure} check={check}
            startFrom={startFrom} startLabel="Start from the generated sky"
            onChange={figure => setDraft(d => ({ ...d, figure, dirty: true }))} />
        </div>
      </main>
      <div className={styles.side}>
        <div className={pg.panel}>
          <section>
            <h3>Day {draft.day} · sky {draft.idx + 1}</h3>
            <FigureStatus check={check} />
            {!future && <p className={pg.warn}>A sky can only be pinned from tomorrow (day {today + 1}) on.</p>}
            {pinned.error && <p className={pg.warn}>{pinned.error}</p>}
            <div className={styles.actions}>
              <Button size="sm" kind="primary" disabled={!check.playable || !future || pinned.busy} onClick={() => void pin()}>
                {there ? 'Replace the pinned sky' : 'Pin to this night'}
              </Button>
              {there && <Button size="sm" kind="ghost" disabled={pinned.busy} onClick={() => void unpin()}>Unpin</Button>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
