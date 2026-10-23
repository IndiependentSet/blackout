/* The playground's small form controls. A Row hands its id down through
   context so its label targets the control without wrapping it: the help
   popup lives in the row too, and a tap inside a <label> would toggle the
   control. */
import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import type { HelpKey } from './help';
import { Info } from './Info';
import { draftValue, settleDraft, tidyDraft } from './numDraft';
import styles from './Playground.module.css';

const RowId = createContext<string | undefined>(undefined);

export function Row({ label, help, value, children }: { label: string; help: HelpKey; value?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}><label htmlFor={id}>{label}</label><Info k={help} /></span>
      <RowId value={id}>{children}</RowId>
      {value !== undefined && <span className={styles.rowValue}>{value}</span>}
    </div>
  );
}

export function Range({ v, min, max, step = 1, on }: { v: number; min: number; max: number; step?: number; on: (v: number) => void }) {
  return <input id={useContext(RowId)} type="range" min={min} max={max} step={step} value={v} onChange={e => on(Number(e.target.value))} />;
}

/* A number box with its own text (see numDraft): it can be cleared and
   retyped, a leading zero gives way to what is typed, and the value only
   changes once the text is a number in range. Focusing selects the text, so
   typing replaces it. */
export function Num({ v, min, max, step = 1, on, label }: {
  v: number; min: number; max?: number; step?: number; on: (v: number) => void; label?: string;
}) {
  const id = useContext(RowId);
  const [text, setText] = useState(String(v));
  const [seen, setSeen] = useState(v);
  // The value changed from outside (another control, a loaded rule): show it.
  if (v !== seen) {
    setSeen(v);
    if (draftValue(text, -Infinity) !== v) setText(String(v));
  }
  const change = (raw: string) => {
    const next = tidyDraft(raw);
    setText(next);
    const n = draftValue(next, min, max);
    if (n !== null && n !== v) on(n);
  };
  const settle = () => {
    const n = settleDraft(text, v, min, max);
    setText(String(n));
    if (n !== v) on(n);
  };
  return <input id={id} aria-label={label} className={styles.num} type="number" min={min} max={max} step={step} value={text}
    onChange={e => change(e.target.value)} onFocus={e => e.target.select()} onBlur={settle} />;
}

export function Check({ v, on }: { v: boolean; on: (v: boolean) => void }) {
  return <input id={useContext(RowId)} type="checkbox" checked={v} onChange={e => on(e.target.checked)} />;
}

export function Select({ v, on, children }: { v: string | number; on: (v: string) => void; children: ReactNode }) {
  return <select id={useContext(RowId)} value={v} onChange={e => on(e.target.value)}>{children}</select>;
}
