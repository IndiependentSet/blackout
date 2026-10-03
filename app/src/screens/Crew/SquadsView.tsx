import { useState } from 'react';
import type { MySquad, Squad } from '../../domain/types';
import { Button, Field, Message, Panel, TabHeader } from '../../ui';
import type { Squads } from './useSquads';
import styles from './Crew.module.css';

/** Your squads, plus starting one or joining one by code. */
export function SquadsView({ squads, onOpen }: { squads: Squads; onOpen: (s: Squad & Partial<MySquad>) => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const create = async () => {
    const r = await squads.create(name);
    if (!r.ok) return setError(r.error);
    setName(''); setError('');
    onOpen({ ...r.data, role: 'foreman', members: 1 });
  };
  const join = async () => {
    const r = await squads.join(code);
    if (!r.ok) return setError(r.error);
    setCode(''); setError('');
    onOpen(r.data);
  };

  return (
    <div className={styles.stack}>
      <div>
        <TabHeader>YOUR SQUADS</TabHeader>
        <Panel tight flush className={styles.boardCard}>
          {squads.mine.length === 0 && <div className={styles.empty}>NO SQUADS YET. START ONE BELOW, OR JOIN WITH A CODE.</div>}
          {squads.mine.map(s => (
            <button key={s.id} type="button" className={styles.squadRow} onClick={() => onOpen(s)}>
              <span className={styles.squadName}>{s.name}</span>
              <span className={styles.squadMeta}>{s.members + (s.members === 1 ? ' MEMBER' : ' MEMBERS') + (s.role === 'foreman' ? ' · FOREMAN' : '')}</span>
              <span className={styles.chevron}>&rsaquo;</span>
            </button>
          ))}
        </Panel>
      </div>

      <div className={styles.forms}>
        <div className={styles.form}>
          <Panel tab="START A SQUAD" tone="orchid" className={styles.pad15}>
            <Field type="text" value={name} onChange={e => { setName(e.target.value); setError(''); }} placeholder="Night Shift Wreckers" />
            <Button onClick={create}>CREATE &amp; GET CODE</Button>
            <div className={styles.fine}>You become foreman. Share the code and anyone who has it can join.</div>
          </Panel>
        </div>
        <div className={styles.form}>
          <Panel tab="JOIN WITH A CODE" tone="orchid" className={styles.pad15}>
            <Field type="text" code value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }} placeholder="SITE-4M9X" />
            <Button variant="secondary" onClick={join}>CLOCK ON TO SQUAD</Button>
            {!!error && <Message tone="error">{error}</Message>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
