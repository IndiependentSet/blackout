import { Info } from './Info';
import type { PlayStatus } from './play';
import styles from './Playground.module.css';

/** How the play-test is going: cats against par, paths still open, the verdict. */
export function PlayBar({ status, showSol, onClear }: { status: PlayStatus; showSol: boolean; onClear: () => void }) {
  const { used, par, open, cleared, overPar } = status;
  return (
    <div className={styles.playBar}>
      <span className={styles.toggle}>Cats <b>&nbsp;{used}&nbsp;</b> / par <b>&nbsp;{par}</b><Info k="play" /></span>
      <span>Open paths <b>{open}</b></span>
      {cleared && <b className={overPar === 0 ? styles.good : styles.warn}>
        {overPar === 0 ? 'Perfect' : `Cleared, ${overPar} over par`}</b>}
      {!cleared && used === 0 && !showSol && <span className={styles.muted}>tap a node to place a cat</span>}
      {!showSol && used > 0 && <button className={styles.link} onClick={onClear}>clear</button>}
    </div>
  );
}
