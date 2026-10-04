/* The playground's small form controls. A Row hands its id down through
   context so its label targets the control without wrapping it: the help
   popup lives in the row too, and a tap inside a <label> would toggle the
   control. */
import { createContext, useContext, useId, type ReactNode } from 'react';
import type { HelpKey } from './help';
import { Info } from './Info';
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

export function Num({ v, min, max, step = 1, on, label }: {
  v: number; min: number; max?: number; step?: number; on: (v: number) => void; label?: string;
}) {
  return <input id={useContext(RowId)} aria-label={label} className={styles.num} type="number" min={min} max={max} step={step} value={v}
    onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n)) on(n); }} />;
}

export function Check({ v, on }: { v: boolean; on: (v: boolean) => void }) {
  return <input id={useContext(RowId)} type="checkbox" checked={v} onChange={e => on(e.target.checked)} />;
}

export function Select({ v, on, children }: { v: string | number; on: (v: string) => void; children: ReactNode }) {
  return <select id={useContext(RowId)} value={v} onChange={e => on(e.target.value)}>{children}</select>;
}
