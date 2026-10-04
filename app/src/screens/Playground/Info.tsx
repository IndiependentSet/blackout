import { useId } from 'react';
import { HELP, type HelpKey } from './help';
import styles from './Info.module.css';

/** An ⓘ that opens the help for one setting or readout. Uses the native
    popover: it sits in the top layer, closes on Esc or a tap outside, and
    needs no state here. */
export function Info({ k }: { k: HelpKey }) {
  const id = useId();
  const h = HELP[k];
  return (
    <>
      <button type="button" className={styles.btn} popoverTarget={id} aria-label={`About ${h.title}`}>i</button>
      <div id={id} popover="auto" className={styles.pop} role="dialog" aria-label={h.title}>
        <div className={styles.head}>
          <b>{h.title}</b>
          <button type="button" className={styles.close} popoverTarget={id} popoverTargetAction="hide" aria-label="Close">×</button>
        </div>
        <p>{h.what}</p>
        {h.effect && <p><span className={styles.tag}>Effect</span>{h.effect}</p>}
        {h.game && <p><span className={styles.tag}>In the game</span>{h.game}</p>}
      </div>
    </>
  );
}
