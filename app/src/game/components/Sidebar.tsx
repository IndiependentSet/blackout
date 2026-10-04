import { SITE_COUNT } from '../../domain/sites';
import { Button, Logo, StaffBadge, Tag, cx, type StaffBadgeInfo } from '../../ui';
import type { Pip } from '../state/selectors';
import styles from './Sidebar.module.css';

interface Props {
  hidden: boolean;
  badge: StaffBadgeInfo;
  pips: Pip[];
  onOpenAccount: () => void;
  onGoSite: (idx: number) => void;
  onOpenWorkOrder: () => void;
}

/** Left of the board: brand, who you are, the brief, and the week's seven sites. */
export function Sidebar({ hidden, badge, pips, onOpenAccount, onGoSite, onOpenWorkOrder }: Props) {
  return (
    <aside className={cx(styles.aside, hidden && styles.hidden)}>
      <Logo size="sm" />
      <StaffBadge {...badge} layout="row" onClick={onOpenAccount} />

      <div className={styles.note}>
        <div className={styles.noteText}>HIRE THE FEWEST CATS THAT STILL <span className={styles.accent}>FLATTEN THE LOT.</span></div>
      </div>
      <div className={styles.tip}>
        Tap an empty <b>pad</b> to deploy a cat. Every fixture on a path it touches goes down.
      </div>

      <div className={styles.sites}>
        <Tag size="sm">SITES</Tag>
        <div className={styles.pips}>
          {pips.map(p => (
            <button key={p.i} type="button" className={cx(styles.pip, styles[p.state])} onClick={() => onGoSite(p.i)} aria-label={`site ${p.n} of ${SITE_COUNT}`}>
              <span className={styles.pipBody}>
                <span>{p.n}</span>
                <span className={styles.pipGrade}>{p.grade}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <Button variant="glass" size="nav" onClick={onOpenWorkOrder}
        style={{ alignSelf: 'flex-start', color: 'var(--lavender)', fontSize: 12, letterSpacing: '.1em', padding: '0 15px' }}>
        RE-READ WORK ORDER
      </Button>
    </aside>
  );
}
